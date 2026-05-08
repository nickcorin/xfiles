"""Archive domain records."""

from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass(frozen=True, slots=True)
class DownloadedFile:
    """A source file downloaded from the public release page."""

    source_url: str
    release_page_url: str
    title: str
    original_filename: str
    media_type: str
    storage_path: str
    content_hash: str
    downloaded_at: datetime
    source_metadata: dict[str, str] = field(default_factory=dict)
    extracted_text: str = ""
    incident_date: str | None = None
    incident_location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    location_source: str | None = None


@dataclass(frozen=True, slots=True)
class ReleaseSnapshot:
    """A fetched release page and the records discovered on it."""

    source_url: str
    title: str
    release_label: str
    page_hash: str
    fetched_at: datetime
    records: list[DownloadedFile]


def utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(tz=UTC)
