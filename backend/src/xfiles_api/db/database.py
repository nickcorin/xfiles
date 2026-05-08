"""SQLite connection and schema management."""

import sqlite3
import threading
from pathlib import Path


class SQLiteDatabase:
    """Owns the SQLite connection used by archive stores."""

    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        self._connection: sqlite3.Connection | None = None
        self._lock = threading.RLock()

    @property
    def connection(self) -> sqlite3.Connection:
        """Return the initialized SQLite connection."""
        if self._connection is None:
            msg = "database has not been started"
            raise RuntimeError(msg)
        return self._connection

    @property
    def lock(self) -> threading.RLock:
        """Return the lock protecting writes on the shared connection."""
        return self._lock

    def start(self) -> None:
        """Open the database connection and create missing tables."""
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection = sqlite3.connect(self._database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._connection.execute("PRAGMA foreign_keys = ON")
        self._connection.execute("PRAGMA journal_mode = WAL")
        self._create_schema()

    def close(self) -> None:
        """Close the database connection."""
        if self._connection is not None:
            self._connection.close()
            self._connection = None

    def _create_schema(self) -> None:
        statements = [
            """
            CREATE TABLE IF NOT EXISTS releases (
                id INTEGER PRIMARY KEY,
                source_url TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                release_label TEXT NOT NULL,
                page_hash TEXT NOT NULL,
                fetched_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS source_records (
                id INTEGER PRIMARY KEY,
                release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
                source_url TEXT NOT NULL UNIQUE,
                release_page_url TEXT NOT NULL,
                title TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                download_status TEXT NOT NULL DEFAULT 'downloaded',
                media_type TEXT,
                storage_path TEXT,
                content_hash TEXT,
                downloaded_at TEXT,
                failure_reason TEXT NOT NULL DEFAULT '',
                retry_count INTEGER NOT NULL DEFAULT 0,
                attempted_at TEXT NOT NULL,
                source_metadata_json TEXT NOT NULL,
                extracted_text TEXT NOT NULL DEFAULT '',
                review_state TEXT NOT NULL DEFAULT 'unreviewed',
                summary TEXT NOT NULL DEFAULT '',
                tags_json TEXT NOT NULL DEFAULT '[]',
                categories_json TEXT NOT NULL DEFAULT '[]',
                incident_date TEXT,
                incident_location TEXT,
                latitude REAL,
                longitude REAL,
                location_source TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        ]
        final_statements = [
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS source_records_fts USING fts5(
                record_id UNINDEXED,
                title,
                original_filename,
                extracted_text,
                source_metadata
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY,
                record_id INTEGER NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                author TEXT NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        ]
        with self.lock:
            for statement in statements:
                self.connection.execute(statement)
            self._migrate_source_records_if_needed()
            for statement in final_statements:
                self.connection.execute(statement)
            self._rebuild_source_records_fts()
            self.connection.commit()

    def _migrate_source_records_if_needed(self) -> None:
        columns = self.connection.execute("PRAGMA table_info(source_records)").fetchall()
        by_name = {column["name"]: column for column in columns}
        nullable_download_fields = ["media_type", "storage_path", "content_hash", "downloaded_at"]
        needs_rebuild = "download_status" not in by_name or any(
            by_name[field]["notnull"] for field in nullable_download_fields if field in by_name
        )
        if not needs_rebuild:
            return

        notes_exist = self._table_exists("notes")
        if notes_exist:
            self.connection.execute("CREATE TEMP TABLE notes_backup AS SELECT * FROM notes")
            self.connection.execute("DROP TABLE notes")
        self.connection.execute("DROP TABLE IF EXISTS source_records_fts")
        self.connection.execute("ALTER TABLE source_records RENAME TO source_records_legacy")
        self.connection.execute(
            """
            CREATE TABLE source_records (
                id INTEGER PRIMARY KEY,
                release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
                source_url TEXT NOT NULL UNIQUE,
                release_page_url TEXT NOT NULL,
                title TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                download_status TEXT NOT NULL DEFAULT 'downloaded',
                media_type TEXT,
                storage_path TEXT,
                content_hash TEXT,
                downloaded_at TEXT,
                failure_reason TEXT NOT NULL DEFAULT '',
                retry_count INTEGER NOT NULL DEFAULT 0,
                attempted_at TEXT NOT NULL,
                source_metadata_json TEXT NOT NULL,
                extracted_text TEXT NOT NULL DEFAULT '',
                review_state TEXT NOT NULL DEFAULT 'unreviewed',
                summary TEXT NOT NULL DEFAULT '',
                tags_json TEXT NOT NULL DEFAULT '[]',
                categories_json TEXT NOT NULL DEFAULT '[]',
                incident_date TEXT,
                incident_location TEXT,
                latitude REAL,
                longitude REAL,
                location_source TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.connection.execute(
            """
            INSERT INTO source_records (
                id,
                release_id,
                source_url,
                release_page_url,
                title,
                original_filename,
                download_status,
                media_type,
                storage_path,
                content_hash,
                downloaded_at,
                failure_reason,
                retry_count,
                attempted_at,
                source_metadata_json,
                extracted_text,
                review_state,
                summary,
                tags_json,
                categories_json,
                incident_date,
                incident_location,
                latitude,
                longitude,
                location_source,
                created_at,
                updated_at
            )
            SELECT
                id,
                release_id,
                source_url,
                release_page_url,
                title,
                original_filename,
                'downloaded',
                media_type,
                storage_path,
                content_hash,
                downloaded_at,
                '',
                0,
                downloaded_at,
                source_metadata_json,
                extracted_text,
                review_state,
                summary,
                tags_json,
                categories_json,
                incident_date,
                incident_location,
                latitude,
                longitude,
                location_source,
                created_at,
                updated_at
            FROM source_records_legacy
            """
        )
        self.connection.execute("DROP TABLE source_records_legacy")
        if notes_exist:
            self.connection.execute(
                """
                CREATE TABLE notes (
                    id INTEGER PRIMARY KEY,
                    record_id INTEGER NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
                    body TEXT NOT NULL,
                    author TEXT NOT NULL,
                    source TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            self.connection.execute("INSERT INTO notes SELECT * FROM notes_backup")
            self.connection.execute("DROP TABLE notes_backup")

    def _table_exists(self, table_name: str) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
            (table_name,),
        ).fetchone()
        return row is not None

    def _rebuild_source_records_fts(self) -> None:
        self.connection.execute("DELETE FROM source_records_fts")
        self.connection.execute(
            """
            INSERT INTO source_records_fts (
                record_id,
                title,
                original_filename,
                extracted_text,
                source_metadata
            )
            SELECT
                id,
                title,
                original_filename,
                extracted_text,
                source_metadata_json
            FROM source_records
            """
        )
