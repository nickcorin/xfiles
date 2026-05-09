from datetime import UTC, datetime

from fastapi.testclient import TestClient

from xfiles_api.app import create_app
from xfiles_api.archive.models import ReleaseSnapshot, SourceFile


def test_api_exposes_archive_without_storage_internals(tmp_path, monkeypatch):
    monkeypatch.setenv("XFILES_DATABASE_PATH", str(tmp_path / "archive.sqlite3"))
    monkeypatch.setenv("XFILES_STORAGE_DIR", str(tmp_path / "files"))

    app = create_app()
    with TestClient(app) as client:
        context = app.state.context
        stored = context.storage.save(
            source_url="https://media.war.gov/ufo/case-01.txt",
            content=b"infrared object over the range",
        )
        context.archive_store.save_release_snapshot(
            ReleaseSnapshot(
                source_url="https://www.war.gov/UFO/",
                title="PURSUE",
                release_label="Release 01",
                page_hash="abc123",
                fetched_at=datetime(2026, 5, 8, tzinfo=UTC),
                records=[
                    SourceFile(
                        source_url="https://media.war.gov/ufo/case-01.txt",
                        release_page_url="https://www.war.gov/UFO/",
                        title="Case 01",
                        original_filename="case-01.txt",
                        source_metadata={"Agency": "AARO"},
                        attempted_at=datetime(2026, 5, 8, tzinfo=UTC),
                        download_status="downloaded",
                        media_type="text/plain",
                        storage_path=str(stored.path),
                        content_hash=stored.content_hash,
                        downloaded_at=datetime(2026, 5, 8, tzinfo=UTC),
                        extracted_text="infrared object over the range",
                    ),
                    SourceFile(
                        source_url="https://media.war.gov/ufo/missing-case.pdf",
                        release_page_url="https://www.war.gov/UFO/",
                        title="Missing case",
                        original_filename="missing-case.pdf",
                        source_metadata={"Agency": "AARO"},
                        attempted_at=datetime(2026, 5, 8, tzinfo=UTC),
                        download_status="failed",
                        failure_reason="download source file: 404",
                    ),
                    SourceFile(
                        source_url="https://media.war.gov/ufo/photo.jpg",
                        release_page_url="https://www.war.gov/UFO/",
                        title="Photo",
                        original_filename="photo.jpg",
                        source_metadata={"Agency": "AARO"},
                        attempted_at=datetime(2026, 5, 8, tzinfo=UTC),
                        download_status="downloaded",
                        media_type="image/jpeg",
                        storage_path=str(stored.path),
                        content_hash=stored.content_hash,
                        downloaded_at=datetime(2026, 5, 8, tzinfo=UTC),
                    ),
                ],
            )
        )
        records = client.get("/api/records", params={"q": "infrared"})
        image_records = client.get("/api/records", params={"file_type": "image"})
        file_types = client.get("/api/file-types")
        interface = client.get("/api/ui")
        failed_records = client.get("/api/records", params={"download_status": "failed"})
        detail = client.get("/api/records/1")
        file_response = client.get("/api/records/1/file")
        failed_file_response = client.get("/api/records/2/file")

    assert records.status_code == 200
    assert records.json()[0]["match_reasons"] == ["extracted text"]
    assert image_records.status_code == 200
    assert len(image_records.json()) == 1
    assert image_records.json()[0]["media_type"] == "image/jpeg"
    assert file_types.status_code == 200
    assert file_types.json() == [
        {"value": "image", "label": "Images", "count": 1},
        {"value": "pdf", "label": "PDF", "count": 1},
        {"value": "text", "label": "Text", "count": 1},
    ]
    assert interface.status_code == 200
    interface_data = interface.json()
    assert interface_data["brand"]["name"] == "Disclosure Index"
    assert interface_data["navigation"] == [
        {
            "value": "home",
            "label": "Home",
            "description": "A quiet entry point into the release archive.",
        },
        {
            "value": "archive",
            "label": "Documents",
            "description": "Search and filter the released records.",
        },
        {
            "value": "reader",
            "label": "Reader",
            "description": "Review one document at a time.",
        },
        {
            "value": "globe",
            "label": "Globe",
            "description": "Browse mapped records by location.",
        },
    ]
    filters = {group["value"]: group for group in interface_data["filters"]}
    assert filters["file_type"]["options"] == file_types.json()
    assert filters["review_state"]["options"] == [
        {"value": "unreviewed", "label": "Unreviewed", "count": 3}
    ]
    assert filters["download_status"]["options"] == [
        {"value": "downloaded", "label": "Downloaded", "count": 2},
        {"value": "failed", "label": "Failed", "count": 1},
    ]
    assert failed_records.status_code == 200
    assert failed_records.json()[0]["download_status"] == "failed"
    assert failed_records.json()[0]["failure_reason"] == "download source file: 404"
    assert detail.status_code == 200
    assert detail.json()["source_url"] == "https://media.war.gov/ufo/case-01.txt"
    assert "storage_path" not in detail.json()
    assert file_response.status_code == 200
    assert file_response.headers["content-disposition"].startswith("inline;")
    assert file_response.text == "infrared object over the range"
    assert failed_file_response.status_code == 409
