"""Archive domain records."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Literal


def utc_now() -> datetime:
    """Return the current UTC timestamp."""
    return datetime.now(tz=UTC)


@dataclass(frozen=True, slots=True)
class SourceFile:
    """A source file listed by the public release page."""

    source_url: str
    release_page_url: str
    title: str
    original_filename: str
    source_metadata: dict[str, str] = field(default_factory=dict)
    attempted_at: datetime = field(default_factory=utc_now)
    download_status: Literal["downloaded", "failed"] = "downloaded"
    media_type: str | None = None
    storage_path: str | None = None
    content_hash: str | None = None
    downloaded_at: datetime | None = None
    extracted_text: str = ""
    failure_reason: str = ""
    retry_count: int = 0
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
    records: list[SourceFile]
