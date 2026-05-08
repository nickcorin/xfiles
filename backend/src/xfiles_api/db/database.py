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
                media_type TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                downloaded_at TEXT NOT NULL,
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
            self.connection.commit()
