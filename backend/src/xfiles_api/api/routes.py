"""HTTP routes for the archive API."""

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse

from xfiles_api.api.schemas import (
    HealthResponse,
    IngestRequest,
    LocationRecord,
    NoteCreate,
    NoteResponse,
    RecordAnalysisUpdate,
    RecordDetail,
    RecordSummary,
    ReleaseResponse,
)
from xfiles_api.archive.ingestion import ArchiveIngestionError
from xfiles_api.context import AppContext
from xfiles_api.db.store import ArchiveStoreError

router = APIRouter()


def context(request: Request) -> AppContext:
    """Return the application context owned by the FastAPI app."""
    return request.app.state.context


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Report API health for containers and deployment checks."""
    return HealthResponse(status="ok")


@router.post("/ingest", response_model=ReleaseResponse)
def ingest_release(
    payload: IngestRequest,
    app_context: Annotated[AppContext, Depends(context)],
) -> dict:
    """Ingest the configured or requested public release page."""
    release_url = str(payload.release_url or app_context.settings.release_url)
    try:
        return app_context.ingestor.ingest(release_url)
    except ArchiveIngestionError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error


@router.get("/releases", response_model=list[ReleaseResponse])
def releases(app_context: Annotated[AppContext, Depends(context)]) -> list[dict]:
    """Return ingested public releases."""
    return app_context.archive_store.releases()


@router.get("/records", response_model=list[RecordSummary])
def records(
    app_context: Annotated[AppContext, Depends(context)],
    query: Annotated[str | None, Query(alias="q")] = None,
    release_id: int | None = None,
    category: str | None = None,
    tag: str | None = None,
    review_state: str | None = None,
    download_status: str | None = None,
    file_type: str | None = None,
    has_location: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=250)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[dict]:
    """Browse or search source records."""
    return app_context.archive_store.records(
        query=query,
        release_id=release_id,
        category=category,
        tag=tag,
        review_state=review_state,
        download_status=download_status,
        file_type=file_type,
        has_location=has_location,
        limit=limit,
        offset=offset,
    )


@router.get("/records/{record_id}", response_model=RecordDetail)
def record(record_id: int, app_context: Annotated[AppContext, Depends(context)]) -> dict:
    """Return a source record, extracted text, and analysis notes."""
    try:
        return app_context.archive_store.record(record_id)
    except ArchiveStoreError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.patch("/records/{record_id}", response_model=RecordDetail)
def update_record(
    record_id: int,
    payload: RecordAnalysisUpdate,
    app_context: Annotated[AppContext, Depends(context)],
) -> dict:
    """Update editable analysis, categorization, and location fields."""
    try:
        return app_context.archive_store.update_record_analysis(
            record_id,
            review_state=payload.review_state,
            summary=payload.summary,
            tags=payload.tags,
            categories=payload.categories,
            incident_date=payload.incident_date,
            incident_location=payload.incident_location,
            latitude=payload.latitude,
            longitude=payload.longitude,
            location_source=payload.location_source,
        )
    except ArchiveStoreError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post("/records/{record_id}/notes", response_model=NoteResponse)
def add_note(
    record_id: int,
    payload: NoteCreate,
    app_context: Annotated[AppContext, Depends(context)],
) -> dict:
    """Add an analysis note without modifying the immutable source record."""
    try:
        app_context.archive_store.record(record_id)
        return app_context.archive_store.add_note(
            record_id,
            body=payload.body,
            author=payload.author,
            source=payload.source,
        )
    except ArchiveStoreError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get("/records/{record_id}/file")
def record_file(
    record_id: int, app_context: Annotated[AppContext, Depends(context)]
) -> FileResponse:
    """Return the locally preserved source file for browser preview or download."""
    record_data = record(record_id, app_context)
    if record_data["download_status"] != "downloaded" or record_data["storage_path"] is None:
        raise HTTPException(status_code=409, detail="source file has not been downloaded")
    path = Path(record_data["storage_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="stored file not found")
    return FileResponse(
        path,
        media_type=record_data["media_type"],
        filename=record_data["original_filename"],
        content_disposition_type="inline",
    )


@router.get("/locations", response_model=list[LocationRecord])
def locations(app_context: Annotated[AppContext, Depends(context)]) -> list[dict]:
    """Return source records with coordinates for the Mapbox globe."""
    return app_context.archive_store.locations()
