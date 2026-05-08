"""Source file storage and hashing."""

import hashlib
import re
from pathlib import Path
from urllib.parse import unquote, urlparse


class FileStorageError(Exception):
    """Raised when source file storage fails."""


class StoredFile:
    """A file saved into local immutable source storage."""

    def __init__(self, *, path: Path, content_hash: str, size: int) -> None:
        self.path = path
        self.content_hash = content_hash
        self.size = size


class FileStorage:
    """Stores downloaded source files under content-addressed paths."""

    def __init__(self, storage_dir: Path, max_download_bytes: int) -> None:
        self._storage_dir = storage_dir
        self._max_download_bytes = max_download_bytes

    @property
    def storage_dir(self) -> Path:
        """Return the root directory used for source file storage."""
        return self._storage_dir

    def start(self) -> None:
        """Create the storage directory if it does not exist."""
        self._storage_dir.mkdir(parents=True, exist_ok=True)

    def filename_from_url(self, source_url: str) -> str:
        """Return a stable, readable filename for a source URL."""
        parsed = urlparse(source_url)
        name = Path(unquote(parsed.path)).name or "source-file"
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip(".-")
        return cleaned or "source-file"

    def save(self, *, source_url: str, content: bytes) -> StoredFile:
        """Store bytes for a source URL and return the stored file metadata."""
        if len(content) > self._max_download_bytes:
            msg = f"download exceeds limit: {source_url}"
            raise FileStorageError(msg)

        content_hash = hashlib.sha256(content).hexdigest()
        original_name = self.filename_from_url(source_url)
        target_dir = self._storage_dir / content_hash[:2] / content_hash[2:4]
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{content_hash}-{original_name}"
        if not target.exists():
            target.write_bytes(content)
        return StoredFile(path=target, content_hash=content_hash, size=len(content))
