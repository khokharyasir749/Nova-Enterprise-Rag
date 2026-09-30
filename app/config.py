from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True

    # CORS Settings
    CORS_ORIGINS: List[str] = ["*"]

    # Qdrant Vector Database
    QDRANT_HOST: Optional[str] = "localhost"
    QDRANT_PORT: Optional[int] = 6333
    QDRANT_PATH: Optional[str] = "./qdrant_storage"
    QDRANT_COLLECTION_NAME: str = "enterprise_tenant_chunks"

    # Embedding Model Settings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    VECTOR_SIZE: int = 384

    # Chunking Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    # Search & Retrieval Settings
    TOP_K: int = 4
    SCORE_THRESHOLD: float = 0.30

    # Optional LLM API Keys
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # Audit Log Storage
    AUDIT_LOG_FILE: str = "audit_logs.jsonl"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
