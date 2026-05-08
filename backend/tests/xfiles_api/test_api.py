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
        failed_records = client.get("/api/records", params={"download_status": "failed"})
        detail = client.get("/api/records/1")
        file_response = client.get("/api/records/1/file")
        failed_file_response = client.get("/api/records/2/file")

    assert records.status_code == 200
    assert records.json()[0]["match_reasons"] == ["extracted text"]
    assert image_records.status_code == 200
    assert len(image_records.json()) == 1
    assert image_records.json()[0]["media_type"] == "image/jpeg"
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
