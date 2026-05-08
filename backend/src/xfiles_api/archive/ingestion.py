"""Ingestion for public UAP release pages."""

import csv
import hashlib
import logging
import re
from io import StringIO
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from bs4.element import Tag
from curl_cffi import requests
from curl_cffi.requests import Response

from xfiles_api.archive.geography import estimate_location
from xfiles_api.archive.models import ReleaseSnapshot, SourceFile, utc_now
from xfiles_api.archive.storage import FileStorage
from xfiles_api.archive.text import TextExtractor
from xfiles_api.db.store import SQLiteArchiveStore

DOWNLOAD_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".htm",
    ".html",
    ".jpeg",
    ".jpg",
    ".json",
    ".mov",
    ".mp3",
    ".mp4",
    ".pdf",
    ".png",
    ".txt",
    ".wav",
    ".webm",
    ".xls",
    ".xlsx",
    ".zip",
}

logger = logging.getLogger(__name__)


class ArchiveIngestionError(Exception):
    """Raised when a release page cannot be ingested."""


class ArchiveIngestor:
    """Downloads release pages, source files, and searchable derived metadata."""

    def __init__(
        self,
        *,
        store: SQLiteArchiveStore,
        storage: FileStorage,
        max_download_bytes: int,
    ) -> None:
        self._store = store
        self._storage = storage
        self._max_download_bytes = max_download_bytes
        self._text_extractor = TextExtractor()

    def ingest(self, release_url: str) -> dict:
        """Fetch a release page, download linked files, and persist the snapshot."""
        page_response = self._fetch(release_url, "fetch release page")
        snapshot = self._snapshot_from_page(
            release_url=release_url,
            page_html=page_response.text,
        )

        return self._store.save_release_snapshot(snapshot)

    def _snapshot_from_page(
        self,
        *,
        release_url: str,
        page_html: str,
    ) -> ReleaseSnapshot:
        soup = BeautifulSoup(page_html, "html.parser")
        title = self._page_title(soup)
        release_label = self._release_label(soup)
        page_hash = hashlib.sha256(page_html.encode("utf-8")).hexdigest()
        links = self._release_links(soup=soup, release_url=release_url, page_html=page_html)
        records = []
        for link in links:
            try:
                records.append(self._download_record(release_url=release_url, link=link))
            except ArchiveIngestionError as error:
                records.append(self._failed_record(release_url=release_url, link=link, error=error))
                logger.warning("source file download failed", extra={"source_url": link[0]})
        return ReleaseSnapshot(
            source_url=release_url,
            title=title,
            release_label=release_label,
            page_hash=page_hash,
            fetched_at=utc_now(),
            records=records,
        )

    def _download_record(
        self,
        *,
        release_url: str,
        link: tuple[str, str, dict[str, str]],
    ) -> SourceFile:
        source_url, title, metadata = link
        response = self._fetch(source_url, "download source file")
        content = response.content
        if len(content) > self._max_download_bytes:
            msg = f"download exceeds configured limit: {source_url}"
            raise ArchiveIngestionError(msg)

        media_type = response.headers.get("content-type", "application/octet-stream").split(";")[0]
        filename = self._storage.filename_from_url(source_url)
        stored = self._storage.save(source_url=source_url, content=content)
        downloaded_at = utc_now()
        try:
            extracted_text = self._text_extractor.extract(
                content=content,
                media_type=media_type,
                filename=filename,
            )
        except ValueError:
            extracted_text = ""
        location = metadata.get("Incident Location")
        estimate = estimate_location(location)

        return SourceFile(
            source_url=source_url,
            release_page_url=release_url,
            title=title or filename,
            original_filename=filename,
            source_metadata=metadata,
            attempted_at=downloaded_at,
            download_status="downloaded",
            media_type=media_type,
            storage_path=str(stored.path),
            content_hash=stored.content_hash,
            downloaded_at=downloaded_at,
            extracted_text=extracted_text,
            incident_date=metadata.get("Incident Date"),
            incident_location=location,
            latitude=estimate.latitude if estimate is not None else None,
            longitude=estimate.longitude if estimate is not None else None,
            location_source="inferred" if estimate is not None else None,
        )

    def _failed_record(
        self,
        *,
        release_url: str,
        link: tuple[str, str, dict[str, str]],
        error: ArchiveIngestionError,
    ) -> SourceFile:
        source_url, title, metadata = link
        filename = self._storage.filename_from_url(source_url)
        location = metadata.get("Incident Location")
        estimate = estimate_location(location)
        return SourceFile(
            source_url=source_url,
            release_page_url=release_url,
            title=title or filename,
            original_filename=filename,
            source_metadata=metadata,
            attempted_at=utc_now(),
            download_status="failed",
            failure_reason=str(error),
            incident_date=metadata.get("Incident Date"),
            incident_location=location,
            latitude=estimate.latitude if estimate is not None else None,
            longitude=estimate.longitude if estimate is not None else None,
            location_source="inferred" if estimate is not None else None,
        )

    def _fetch(self, source_url: str, operation: str) -> Response:
        try:
            response = requests.get(
                source_url,
                allow_redirects=True,
                impersonate="chrome",
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestsError as error:
            raise ArchiveIngestionError(f"{operation}: {source_url}") from error
        return response

    def _release_links(
        self,
        *,
        soup: BeautifulSoup,
        release_url: str,
        page_html: str,
    ) -> list[tuple[str, str, dict[str, str]]]:
        csv_links = self._csv_download_links(release_url=release_url, page_html=page_html)
        if csv_links:
            return csv_links
        return self._anchor_download_links(soup, release_url)

    def _csv_download_links(
        self,
        *,
        release_url: str,
        page_html: str,
    ) -> list[tuple[str, str, dict[str, str]]]:
        links: list[tuple[str, str, dict[str, str]]] = []
        for csv_url in self._csv_urls(release_url=release_url, page_html=page_html):
            response = self._fetch(csv_url, "fetch release csv")
            reader = csv.DictReader(StringIO(response.content.decode("utf-8-sig")))
            for row in reader:
                source_url = self._row_value(row, "PDF | Image Link")
                if not source_url:
                    continue
                title = self._row_value(row, "Title").replace("\n", " ").strip()
                metadata = {
                    key: self._row_value(row, key)
                    for key in [
                        "Agency",
                        "Release Date",
                        "Incident Date",
                        "Incident Location",
                        "Type",
                        "Description Blurb",
                        "Video Pairing",
                        "PDF Pairing",
                        "Redaction",
                    ]
                    if self._row_value(row, key)
                }
                links.append((urljoin(release_url, source_url), title, metadata))
        return links

    def _csv_urls(self, *, release_url: str, page_html: str) -> list[str]:
        urls = []
        for match in re.finditer(r"csvUrl\s*=\s*[\"'](?P<url>[^\"']+)[\"']", page_html):
            urls.append(urljoin(release_url, match.group("url")))
        ufo_urls = [url for url in urls if "/ufo/" in url.lower()]
        return ufo_urls or urls

    def _row_value(self, row: dict[str | None, str | list[str]], key: str) -> str:
        value = row.get(key, "")
        if isinstance(value, list):
            return " ".join(value).strip()
        return value.strip()

    def _anchor_download_links(
        self,
        soup: BeautifulSoup,
        release_url: str,
    ) -> list[tuple[str, str, dict[str, str]]]:
        links: list[tuple[str, str, dict[str, str]]] = []
        seen: set[str] = set()
        for anchor in soup.find_all("a", href=True):
            if not isinstance(anchor, Tag):
                continue
            href = anchor.get("href")
            if not isinstance(href, str):
                continue
            source_url = urljoin(release_url, href)
            if source_url in seen or not self._is_download_link(source_url):
                continue
            seen.add(source_url)
            title_attribute = anchor.get("title")
            title = anchor.get_text(" ", strip=True)
            if not title and isinstance(title_attribute, str):
                title = title_attribute
            links.append((source_url, title, self._metadata_near_anchor(anchor)))
        return links

    def _is_download_link(self, source_url: str) -> bool:
        path = urlparse(source_url).path.lower()
        return any(path.endswith(extension) for extension in DOWNLOAD_EXTENSIONS)

    def _metadata_near_anchor(self, anchor: Tag) -> dict[str, str]:
        row = anchor.find_parent("tr")
        if row is None:
            return {}
        cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
        labels = ["Agency", "Release Date", "Incident Date", "Incident Location", "Type"]
        return {label: value for label, value in zip(labels, cells, strict=False) if value}

    def _page_title(self, soup: BeautifulSoup) -> str:
        heading = soup.find("h1")
        if heading is not None:
            return heading.get_text(" ", strip=True)
        title = soup.find("title")
        if title is not None:
            return title.get_text(" ", strip=True)
        return "PURSUE UAP Archive"

    def _release_label(self, soup: BeautifulSoup) -> str:
        for heading in soup.find_all(["h2", "h3"]):
            text = heading.get_text(" ", strip=True)
            if "Release" in text:
                return text
        return "Current Release"
