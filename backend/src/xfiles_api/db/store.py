"""SQLite archive persistence."""

import json
import re
import sqlite3
from collections.abc import Iterable
from typing import Any

from xfiles_api.archive.models import DownloadedFile, ReleaseSnapshot, utc_now
from xfiles_api.db.database import SQLiteDatabase


class ArchiveStoreError(Exception):
    """Base exception for archive persistence failures."""


class SQLiteArchiveStore:
    """Stores releases, source records, annotations, and search data in SQLite."""

    def __init__(self, database: SQLiteDatabase) -> None:
        self._database = database

    def save_release_snapshot(self, snapshot: ReleaseSnapshot) -> dict[str, Any]:
        """Persist a fetched release page and all downloadable records discovered on it."""
        try:
            with self._database.lock:
                release = self._upsert_release(snapshot)
                for record in snapshot.records:
                    self._upsert_record(release["id"], record)
                self._database.connection.commit()
        except sqlite3.Error as error:
            raise ArchiveStoreError("save release snapshot") from error

        return self.release(release["id"])

    def releases(self) -> list[dict[str, Any]]:
        """Return releases with record counts."""
        query = """
            SELECT
                releases.id,
                releases.source_url,
                releases.title,
                releases.release_label,
                releases.page_hash,
                releases.fetched_at,
                COUNT(source_records.id) AS record_count
            FROM releases
            LEFT JOIN source_records ON source_records.release_id = releases.id
            GROUP BY releases.id
            ORDER BY releases.fetched_at DESC
        """
        rows = self._database.connection.execute(query).fetchall()
        return [dict(row) for row in rows]

    def release(self, release_id: int) -> dict[str, Any]:
        """Return one release with record counts."""
        query = """
            SELECT
                releases.id,
                releases.source_url,
                releases.title,
                releases.release_label,
                releases.page_hash,
                releases.fetched_at,
                COUNT(source_records.id) AS record_count
            FROM releases
            LEFT JOIN source_records ON source_records.release_id = releases.id
            WHERE releases.id = ?
            GROUP BY releases.id
        """
        row = self._database.connection.execute(query, (release_id,)).fetchone()
        if row is None:
            raise ArchiveStoreError(f"release not found: {release_id}")
        return dict(row)

    def records(
        self,
        *,
        query: str | None = None,
        release_id: int | None = None,
        category: str | None = None,
        tag: str | None = None,
        review_state: str | None = None,
        has_location: bool | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Return source records filtered for archive browsing."""
        clauses = []
        params: list[Any] = []
        if release_id is not None:
            clauses.append("source_records.release_id = ?")
            params.append(release_id)
        if review_state:
            clauses.append("source_records.review_state = ?")
            params.append(review_state)
        if has_location is True:
            clauses.append("source_records.latitude IS NOT NULL")
            clauses.append("source_records.longitude IS NOT NULL")
        if category:
            clauses.append("source_records.categories_json LIKE ?")
            params.append(f'%"{category}"%')
        if tag:
            clauses.append("source_records.tags_json LIKE ?")
            params.append(f'%"{tag}"%')

        record_ids = self._search_record_ids(query)
        if record_ids is not None:
            if not record_ids:
                return []
            placeholders = ",".join("?" for _ in record_ids)
            clauses.append(f"source_records.id IN ({placeholders})")
            params.extend(record_ids)

        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = f"""
            SELECT source_records.*, releases.release_label
            FROM source_records
            JOIN releases ON releases.id = source_records.release_id
            {where}
            ORDER BY source_records.downloaded_at DESC, source_records.id DESC
            LIMIT ? OFFSET ?
        """
        rows = self._database.connection.execute(sql, [*params, limit, offset]).fetchall()
        return [self._record_from_row(row, query=query) for row in rows]

    def record(self, record_id: int) -> dict[str, Any]:
        """Return one source record with notes."""
        query = """
            SELECT source_records.*, releases.release_label
            FROM source_records
            JOIN releases ON releases.id = source_records.release_id
            WHERE source_records.id = ?
        """
        row = self._database.connection.execute(query, (record_id,)).fetchone()
        if row is None:
            raise ArchiveStoreError(f"record not found: {record_id}")
        record = self._record_from_row(row)
        record["notes"] = self.notes(record_id)
        return record

    def locations(self) -> list[dict[str, Any]]:
        """Return records that can be plotted on a map."""
        query = """
            SELECT
                id,
                title,
                source_url,
                incident_location,
                latitude,
                longitude,
                location_source,
                review_state,
                categories_json
            FROM source_records
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY incident_location, title
        """
        rows = self._database.connection.execute(query).fetchall()
        return [
            {
                **dict(row),
                "categories": json.loads(row["categories_json"]),
            }
            for row in rows
        ]

    def update_record_analysis(
        self,
        record_id: int,
        *,
        review_state: str | None,
        summary: str | None,
        tags: list[str] | None,
        categories: list[str] | None,
        incident_date: str | None,
        incident_location: str | None,
        latitude: float | None,
        longitude: float | None,
        location_source: str | None,
    ) -> dict[str, Any]:
        """Update human or operator-supplied analysis fields for a record."""
        existing = self.record(record_id)
        values = {
            "review_state": review_state or existing["review_state"],
            "summary": summary if summary is not None else existing["summary"],
            "tags_json": json.dumps(tags if tags is not None else existing["tags"]),
            "categories_json": json.dumps(
                categories if categories is not None else existing["categories"]
            ),
            "incident_date": incident_date
            if incident_date is not None
            else existing["incident_date"],
            "incident_location": (
                incident_location
                if incident_location is not None
                else existing["incident_location"]
            ),
            "latitude": latitude if latitude is not None else existing["latitude"],
            "longitude": longitude if longitude is not None else existing["longitude"],
            "location_source": (
                location_source if location_source is not None else existing["location_source"]
            ),
            "updated_at": utc_now().isoformat(),
        }
        statement = """
            UPDATE source_records
            SET
                review_state = :review_state,
                summary = :summary,
                tags_json = :tags_json,
                categories_json = :categories_json,
                incident_date = :incident_date,
                incident_location = :incident_location,
                latitude = :latitude,
                longitude = :longitude,
                location_source = :location_source,
                updated_at = :updated_at
            WHERE id = :record_id
        """
        with self._database.lock:
            self._database.connection.execute(statement, {**values, "record_id": record_id})
            self._refresh_record_search(record_id)
            self._database.connection.commit()
        return self.record(record_id)

    def add_note(self, record_id: int, *, body: str, author: str, source: str) -> dict[str, Any]:
        """Attach a note to a source record."""
        statement = """
            INSERT INTO notes (record_id, body, author, source)
            VALUES (?, ?, ?, ?)
            RETURNING id, record_id, body, author, source, created_at, updated_at
        """
        with self._database.lock:
            row = self._database.connection.execute(
                statement,
                (record_id, body, author, source),
            ).fetchone()
            self._database.connection.commit()
        return dict(row)

    def notes(self, record_id: int) -> list[dict[str, Any]]:
        """Return notes attached to a source record."""
        query = """
            SELECT id, record_id, body, author, source, created_at, updated_at
            FROM notes
            WHERE record_id = ?
            ORDER BY created_at DESC, id DESC
        """
        rows = self._database.connection.execute(query, (record_id,)).fetchall()
        return [dict(row) for row in rows]

    def _upsert_release(self, snapshot: ReleaseSnapshot) -> dict[str, Any]:
        statement = """
            INSERT INTO releases (source_url, title, release_label, page_hash, fetched_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(source_url) DO UPDATE SET
                title = excluded.title,
                release_label = excluded.release_label,
                page_hash = excluded.page_hash,
                fetched_at = excluded.fetched_at,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, source_url, title, release_label, page_hash, fetched_at
        """
        row = self._database.connection.execute(
            statement,
            (
                snapshot.source_url,
                snapshot.title,
                snapshot.release_label,
                snapshot.page_hash,
                snapshot.fetched_at.isoformat(),
            ),
        ).fetchone()
        return dict(row)

    def _upsert_record(self, release_id: int, record: DownloadedFile) -> None:
        statement = """
            INSERT INTO source_records (
                release_id,
                source_url,
                release_page_url,
                title,
                original_filename,
                media_type,
                storage_path,
                content_hash,
                downloaded_at,
                source_metadata_json,
                extracted_text,
                incident_date,
                incident_location,
                latitude,
                longitude,
                location_source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_url) DO UPDATE SET
                release_id = excluded.release_id,
                title = excluded.title,
                original_filename = excluded.original_filename,
                media_type = excluded.media_type,
                storage_path = excluded.storage_path,
                content_hash = excluded.content_hash,
                downloaded_at = excluded.downloaded_at,
                source_metadata_json = excluded.source_metadata_json,
                extracted_text = excluded.extracted_text,
                incident_date = COALESCE(source_records.incident_date, excluded.incident_date),
                incident_location = COALESCE(
                    source_records.incident_location,
                    excluded.incident_location
                ),
                latitude = COALESCE(source_records.latitude, excluded.latitude),
                longitude = COALESCE(source_records.longitude, excluded.longitude),
                location_source = COALESCE(
                    source_records.location_source,
                    excluded.location_source
                ),
                updated_at = CURRENT_TIMESTAMP
            RETURNING id
        """
        row = self._database.connection.execute(
            statement,
            (
                release_id,
                record.source_url,
                record.release_page_url,
                record.title,
                record.original_filename,
                record.media_type,
                record.storage_path,
                record.content_hash,
                record.downloaded_at.isoformat(),
                json.dumps(record.source_metadata, sort_keys=True),
                record.extracted_text,
                record.incident_date,
                record.incident_location,
                record.latitude,
                record.longitude,
                record.location_source,
            ),
        ).fetchone()
        self._refresh_record_search(row["id"])

    def _refresh_record_search(self, record_id: int) -> None:
        row = self._database.connection.execute(
            """
            SELECT id, title, original_filename, extracted_text, source_metadata_json
            FROM source_records
            WHERE id = ?
            """,
            (record_id,),
        ).fetchone()
        if row is None:
            return
        self._database.connection.execute(
            "DELETE FROM source_records_fts WHERE record_id = ?",
            (record_id,),
        )
        self._database.connection.execute(
            """
            INSERT INTO source_records_fts (
                record_id,
                title,
                original_filename,
                extracted_text,
                source_metadata
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                row["id"],
                row["title"],
                row["original_filename"],
                row["extracted_text"],
                row["source_metadata_json"],
            ),
        )

    def _search_record_ids(self, query: str | None) -> list[int] | None:
        if query is None or not query.strip():
            return None
        terms = re.findall(r"[A-Za-z0-9_]+", query)
        if not terms:
            return []
        match_query = " AND ".join(f"{term}*" for term in terms)
        rows = self._database.connection.execute(
            """
            SELECT record_id
            FROM source_records_fts
            WHERE source_records_fts MATCH ?
            ORDER BY rank
            """,
            (match_query,),
        ).fetchall()
        return [row["record_id"] for row in rows]

    def _record_from_row(self, row: sqlite3.Row, *, query: str | None = None) -> dict[str, Any]:
        record = dict(row)
        record["source_metadata"] = json.loads(record.pop("source_metadata_json"))
        record["tags"] = json.loads(record.pop("tags_json"))
        record["categories"] = json.loads(record.pop("categories_json"))
        record["match_reasons"] = self._match_reasons(record, query)
        return record

    def _match_reasons(self, record: dict[str, Any], query: str | None) -> list[str]:
        if query is None or not query.strip():
            return []
        terms = [term.lower() for term in re.findall(r"[A-Za-z0-9_]+", query)]
        fields: Iterable[tuple[str, str]] = [
            ("title", record["title"]),
            ("filename", record["original_filename"]),
            ("extracted text", record["extracted_text"]),
            ("metadata", json.dumps(record["source_metadata"])),
        ]
        reasons = []
        for label, value in fields:
            lower_value = value.lower()
            if any(term in lower_value for term in terms):
                reasons.append(label)
        return reasons
