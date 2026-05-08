"""Ingestion for public UAP release pages."""

import hashlib
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from bs4.element import Tag

from xfiles_api.archive.models import DownloadedFile, ReleaseSnapshot, utc_now
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
        try:
            with httpx.Client(follow_redirects=True, timeout=60) as client:
                page_response = client.get(release_url)
                page_response.raise_for_status()
                snapshot = self._snapshot_from_page(
                    client=client,
                    release_url=release_url,
                    page_html=page_response.text,
                )
        except httpx.HTTPError as error:
            raise ArchiveIngestionError(f"fetch release page: {release_url}") from error

        return self._store.save_release_snapshot(snapshot)

    def _snapshot_from_page(
        self,
        *,
        client: httpx.Client,
        release_url: str,
        page_html: str,
    ) -> ReleaseSnapshot:
        soup = BeautifulSoup(page_html, "html.parser")
        title = self._page_title(soup)
        release_label = self._release_label(soup)
        page_hash = hashlib.sha256(page_html.encode("utf-8")).hexdigest()
        records = [
            self._download_record(client=client, release_url=release_url, link=link)
            for link in self._download_links(soup, release_url)
        ]
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
        client: httpx.Client,
        release_url: str,
        link: tuple[str, str, dict[str, str]],
    ) -> DownloadedFile:
        source_url, title, metadata = link
        try:
            response = client.get(source_url)
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise ArchiveIngestionError(f"download source file: {source_url}") from error

        content = response.content
        if len(content) > self._max_download_bytes:
            msg = f"download exceeds configured limit: {source_url}"
            raise ArchiveIngestionError(msg)

        media_type = response.headers.get("content-type", "application/octet-stream").split(";")[0]
        filename = self._storage.filename_from_url(source_url)
        stored = self._storage.save(source_url=source_url, content=content)
        try:
            extracted_text = self._text_extractor.extract(
                content=content,
                media_type=media_type,
                filename=filename,
            )
        except ValueError:
            extracted_text = ""

        return DownloadedFile(
            source_url=source_url,
            release_page_url=release_url,
            title=title or filename,
            original_filename=filename,
            media_type=media_type,
            storage_path=str(stored.path),
            content_hash=stored.content_hash,
            downloaded_at=utc_now(),
            source_metadata=metadata,
            extracted_text=extracted_text,
            incident_date=metadata.get("Incident Date"),
            incident_location=metadata.get("Incident Location"),
        )

    def _download_links(
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
