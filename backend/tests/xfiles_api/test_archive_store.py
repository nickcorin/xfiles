from datetime import UTC, datetime

from xfiles_api.archive.models import DownloadedFile, ReleaseSnapshot
from xfiles_api.archive.storage import FileStorage
from xfiles_api.db.database import SQLiteDatabase
from xfiles_api.db.store import SQLiteArchiveStore


def test_archive_store_preserves_sources_and_supports_search(tmp_path):
    database = SQLiteDatabase(tmp_path / "archive.sqlite3")
    storage = FileStorage(tmp_path / "files", 1_000_000)
    storage.start()
    database.start()
    store = SQLiteArchiveStore(database)
    stored = storage.save(
        source_url="https://media.war.gov/ufo/western-object.txt",
        content=b"unidentified object over the western United States",
    )

    snapshot = ReleaseSnapshot(
        source_url="https://www.war.gov/UFO/",
        title="PURSUE",
        release_label="Release 01",
        page_hash="abc123",
        fetched_at=datetime(2026, 5, 8, tzinfo=UTC),
        records=[
            DownloadedFile(
                source_url="https://media.war.gov/ufo/western-object.txt",
                release_page_url="https://www.war.gov/UFO/",
                title="Western object",
                original_filename="western-object.txt",
                media_type="text/plain",
                storage_path=str(stored.path),
                content_hash=stored.content_hash,
                downloaded_at=datetime(2026, 5, 8, tzinfo=UTC),
                source_metadata={"Agency": "AARO"},
                extracted_text="unidentified object over the western United States",
                incident_location="Western United States",
                latitude=39.0,
                longitude=-112.0,
                location_source="source",
            )
        ],
    )

    release = store.save_release_snapshot(snapshot)
    records = store.records(query="western object")
    locations = store.locations()

    assert release["record_count"] == 1
    assert records[0]["source_url"] == "https://media.war.gov/ufo/western-object.txt"
    assert records[0]["release_page_url"] == "https://www.war.gov/UFO/"
    assert records[0]["content_hash"] == stored.content_hash
    assert "extracted text" in records[0]["match_reasons"]
    assert locations[0]["incident_location"] == "Western United States"

    updated = store.update_record_analysis(
        records[0]["id"],
        review_state="reviewed",
        summary="Likely needs follow-up.",
        tags=["infrared"],
        categories=["western-us"],
        incident_date=None,
        incident_location=None,
        latitude=None,
        longitude=None,
        location_source=None,
    )
    note = store.add_note(
        records[0]["id"],
        body="Human review note",
        author="analyst",
        source="human",
    )

    assert updated["review_state"] == "reviewed"
    assert updated["tags"] == ["infrared"]
    assert updated["categories"] == ["western-us"]
    assert note["source"] == "human"
    assert store.record(records[0]["id"])["notes"][0]["body"] == "Human review note"

    database.close()
