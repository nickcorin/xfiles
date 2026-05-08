"""Text extraction for downloaded source files."""

from io import BytesIO

from bs4 import BeautifulSoup
from pypdf import PdfReader


class TextExtractor:
    """Extracts searchable text from supported source file types."""

    def extract(self, *, content: bytes, media_type: str, filename: str) -> str:
        """Return extracted text, or an empty string for unsupported binary files."""
        lower_filename = filename.lower()
        if "pdf" in media_type or lower_filename.endswith(".pdf"):
            return self._extract_pdf(content)
        if media_type.startswith("text/") or lower_filename.endswith((".txt", ".csv", ".md")):
            return content.decode("utf-8", errors="replace")
        if "html" in media_type or lower_filename.endswith((".html", ".htm")):
            document = BeautifulSoup(content, "html.parser")
            return document.get_text("\n", strip=True)
        return ""

    def _extract_pdf(self, content: bytes) -> str:
        try:
            reader = PdfReader(BytesIO(content))
            pages = [page.extract_text() or "" for page in reader.pages]
        except Exception as error:  # pypdf raises several parser-specific exceptions.
            msg = "extract pdf text"
            raise ValueError(msg) from error
        return "\n".join(page for page in pages if page).strip()
