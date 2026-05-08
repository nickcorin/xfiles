from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread

from xfiles_api.archive.ingestion import ArchiveIngestor
from xfiles_api.archive.storage import FileStorage
from xfiles_api.db.database import SQLiteDatabase
from xfiles_api.db.store import SQLiteArchiveStore


class ArchiveHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/UFO/":
            body = b"""
            <html>
              <head><title>PURSUE</title></head>
              <body>
                <h1>Presidential Unsealing and Reporting System</h1>
                <h2>Release 01</h2>
                <table>
                  <tr>
                    <td>AARO</td>
                    <td>May 8, 2026</td>
                    <td>September 2025</td>
                    <td>Western United States</td>
                    <td>Evidence</td>
                    <td><a href="/files/case-01.txt">Case 01</a></td>
                  </tr>
                </table>
              </body>
            </html>
            """
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/files/case-01.txt":
            body = b"infrared object near the western range"
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return


def test_ingestor_downloads_files_and_preserves_page_source(tmp_path):
    server = ThreadingHTTPServer(("127.0.0.1", 0), ArchiveHandler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    release_url = f"http://127.0.0.1:{server.server_port}/UFO/"

    database = SQLiteDatabase(tmp_path / "archive.sqlite3")
    storage = FileStorage(tmp_path / "files", 1_000_000)
    storage.start()
    database.start()
    store = SQLiteArchiveStore(database)
    ingestor = ArchiveIngestor(store=store, storage=storage, max_download_bytes=1_000_000)

    release = ingestor.ingest(release_url)
    records = store.records(query="infrared")

    assert release["source_url"] == release_url
    assert release["record_count"] == 1
    assert records[0]["release_page_url"] == release_url
    assert records[0]["source_url"] == f"http://127.0.0.1:{server.server_port}/files/case-01.txt"
    assert records[0]["source_metadata"]["Agency"] == "AARO"
    assert records[0]["incident_location"] == "Western United States"
    assert records[0]["extracted_text"] == "infrared object near the western range"

    database.close()
    server.shutdown()
