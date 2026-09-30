import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import get_qdrant_client, ensure_collection_exists
from app.embeddings import get_embedding_model
from app.api.routes import router as api_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("rag-app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    - Runs on startup: initializes Qdrant collection and pre-warms embedding model
    - Cleans up on shutdown
    """
    logger.info("Initializing Permission-Aware Multi-Tenant RAG Application...")

    # 1. Connect to Qdrant & ensure collection exists
    try:
        client = get_qdrant_client()
        ensure_collection_exists(client)
        logger.info(f"Qdrant collection '{settings.QDRANT_COLLECTION_NAME}' is ready.")
    except Exception as e:
        logger.warning(
            f"Could not initialize Qdrant storage during startup: {e}."
        )

    # 2. Warm up embedding model in background or cache
    try:
        logger.info(f"Pre-loading embedding model '{settings.EMBEDDING_MODEL_NAME}'...")
        get_embedding_model()
        logger.info("Embedding model pre-loaded successfully.")
    except Exception as e:
        logger.warning(f"Could not pre-load embedding model during startup: {e}")

    yield

    logger.info("Shutting down application...")


# Initialize FastAPI app
app = FastAPI(
    title="Permission-Aware Multi-Tenant RAG API",
    description="Enterprise Multi-Tenant RAG ingestion API with role-based access control metadata and Qdrant vector storage.",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router)


@app.get("/", tags=["Health"])
async def root():
    return {
        "status": "online",
        "service": "Permission-Aware Multi-Tenant RAG API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "qdrant_collection": settings.QDRANT_COLLECTION_NAME,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to test Qdrant connectivity."""
    qdrant_status = "disconnected"
    try:
        client = get_qdrant_client()
        client.get_collections()
        from app.database import get_qdrant_mode
        mode = get_qdrant_mode()
        qdrant_status = f"connected ({mode})"
    except Exception:
        qdrant_status = "unavailable"

    return {
        "status": "healthy",
        "qdrant": qdrant_status,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=settings.DEBUG)
