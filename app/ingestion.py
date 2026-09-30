import io
import logging
from typing import List
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize text splitter with configured chunk size and overlap
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP,
    separators=["\n\n", "\n", " ", ""]
)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract plain text from PDF file bytes using PyPDF."""
    pdf_stream = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_stream)
    pages_text: List[str] = []

    for page_idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text.strip())

    return "\n\n".join(pages_text)


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Extract plain text from .txt file bytes supporting multiple encodings."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        logger.warning("UTF-8 decoding failed, falling back to latin-1.")
        return file_bytes.decode("latin-1", errors="replace")


def parse_and_chunk_document(filename: str, file_bytes: bytes) -> List[str]:
    """
    Parse a document (.pdf or .txt) and split it into chunks.

    Args:
        filename: Document filename with extension.
        file_bytes: Binary content of uploaded file.

    Returns:
        List of non-empty text chunk strings.

    Raises:
        ValueError: If file format is unsupported or document has no extractable text.
    """
    lower_filename = filename.lower()
    if lower_filename.endswith(".pdf"):
        full_text = extract_text_from_pdf(file_bytes)
    elif lower_filename.endswith(".txt"):
        full_text = extract_text_from_txt(file_bytes)
    else:
        raise ValueError(f"Unsupported file type for '{filename}'. Only .pdf and .txt are supported.")

    full_text = full_text.strip()
    if not full_text:
        raise ValueError(f"No readable text could be extracted from '{filename}'.")

    chunks = text_splitter.split_text(full_text)
    # Filter out empty or whitespace-only chunks
    clean_chunks = [c.strip() for c in chunks if c.strip()]

    if not clean_chunks:
        raise ValueError(f"Document '{filename}' produced zero valid chunks after splitting.")

    return clean_chunks
