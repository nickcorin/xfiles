"""Application dependency container."""

from xfiles_api.archive.ingestion import ArchiveIngestor
from xfiles_api.archive.storage import FileStorage
from xfiles_api.config import Settings
from xfiles_api.db.database import SQLiteDatabase
from xfiles_api.db.store import SQLiteArchiveStore


class AppContext:
    """Owns the long-lived dependencies used by API handlers."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.database = SQLiteDatabase(settings.database_path)
        self.storage = FileStorage(settings.storage_dir, settings.max_download_bytes)
        self.archive_store = SQLiteArchiveStore(self.database)
        self.ingestor = ArchiveIngestor(
            store=self.archive_store,
            storage=self.storage,
            max_download_bytes=settings.max_download_bytes,
        )

    @classmethod
    def from_settings(cls, settings: Settings) -> "AppContext":
        """Create the application container from validated settings."""
        return cls(settings)

    def start(self) -> None:
        """Initialize durable local resources."""
        self.storage.start()
        self.database.start()

    def close(self) -> None:
        """Close owned resources."""
        self.database.close()
