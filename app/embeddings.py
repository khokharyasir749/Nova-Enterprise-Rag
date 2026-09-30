import os
import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)

_embedding_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    """Load and return the SentenceTransformer embedding model singleton."""
    global _embedding_model
    if _embedding_model is None:
        local_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "all-MiniLM-L6-v2")
        model_target = local_dir if (os.path.exists(local_dir) and os.path.exists(os.path.join(local_dir, "model.safetensors"))) else settings.EMBEDDING_MODEL_NAME
        logger.info(f"Loading SentenceTransformer model from '{model_target}'...")
        _embedding_model = SentenceTransformer(model_target)
        logger.info("SentenceTransformer model loaded successfully.")
    return _embedding_model


def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate dense vector embeddings for a list of text strings.

    Args:
        texts: List of text chunk strings.

    Returns:
        List of 384-dimensional float vector embeddings.
    """
    if not texts:
        return []

    model = get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
    return embeddings.tolist()
