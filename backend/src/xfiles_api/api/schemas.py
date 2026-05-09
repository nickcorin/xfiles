"""API request and response schemas."""

from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl


class IngestRequest(BaseModel):
    """Request to ingest a public release page."""

    release_url: HttpUrl | None = None


class ReleaseResponse(BaseModel):
    """Public release metadata."""

    id: int
    source_url: str
    title: str
    release_label: str
    page_hash: str
    fetched_at: str
    record_count: int
    failure_count: int


class RecordSummary(BaseModel):
    """A source record returned in browse and search views."""

    id: int
    release_id: int
    release_label: str
    source_url: str
    release_page_url: str
    title: str
    original_filename: str
    download_status: Literal["downloaded", "failed"]
    media_type: str | None
    content_hash: str | None
    downloaded_at: str | None
    failure_reason: str
    retry_count: int
    attempted_at: str
    source_metadata: dict[str, Any]
    review_state: str
    summary: str
    tags: list[str]
    categories: list[str]
    incident_date: str | None
    incident_location: str | None
    latitude: float | None
    longitude: float | None
    location_source: str | None
    match_reasons: list[str]


class NoteResponse(BaseModel):
    """A human-authored or generated analysis note."""

    id: int
    record_id: int
    body: str
    author: str
    source: str
    created_at: str
    updated_at: str


class RecordDetail(RecordSummary):
    """A full source record response with extracted text and notes."""

    extracted_text: str
    notes: list[NoteResponse]


class LocationRecord(BaseModel):
    """A record location suitable for the Mapbox globe."""

    id: int
    title: str
    source_url: str
    incident_location: str | None
    latitude: float
    longitude: float
    location_source: str | None
    review_state: str
    categories: list[str]


class FileTypeOption(BaseModel):
    """A file type that exists in the archive."""

    value: Literal["audio", "image", "pdf", "text", "video"]
    label: str
    count: int


class FilterOption(BaseModel):
    """A selectable filter value currently available in the archive."""

    value: str
    label: str
    count: int


class FilterGroup(BaseModel):
    """A frontend filter group driven by API data."""

    value: str
    label: str
    placeholder: str
    options: list[FilterOption]


class BrandMetadata(BaseModel):
    """Public-facing site identity for the archive UI."""

    name: str
    eyebrow: str
    description: str


class NavigationItem(BaseModel):
    """A public UI section exposed by the archive."""

    value: Literal["archive", "reader", "globe"]
    label: str
    description: str


class InterfaceResponse(BaseModel):
    """Read-only metadata used to render the public frontend."""

    brand: BrandMetadata
    navigation: list[NavigationItem]
    filters: list[FilterGroup]


class RecordAnalysisUpdate(BaseModel):
    """Editable analysis fields for a source record."""

    review_state: str | None = None
    summary: str | None = None
    tags: list[str] | None = None
    categories: list[str] | None = None
    incident_date: str | None = None
    incident_location: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    location_source: Literal["source", "inferred", "human"] | None = None


class NoteCreate(BaseModel):
    """Request to add a source-linked analysis note."""

    body: str = Field(min_length=1)
    author: str = Field(default="analyst", min_length=1)
    source: Literal["human", "generated"] = "human"


class HealthResponse(BaseModel):
    """API health response."""

    status: Literal["ok"]
