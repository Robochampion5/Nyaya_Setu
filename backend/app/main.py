"""
Nyaya Setu - FastAPI Application Entrypoint
===========================================
Production-grade FastAPI application with lifespan management, CORS middleware,
and ADR suitability screening routes.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.services.model_loader import model_manager
from backend.app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("NyayaSetuBackend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload model artifacts and frequency tables into memory once at server startup."""
    logger.info("Starting Nyaya Setu Backend Service (Version %s)...", settings.VERSION)
    loaded = model_manager.load_artifacts()
    if loaded:
        logger.info("Nyaya Setu model artifacts successfully loaded into memory.")
    else:
        logger.warning("Nyaya Setu running in standby/heuristic mode. Artifacts pending generation.")
    yield
    logger.info("Shutting down Nyaya Setu Backend Service.")


def create_app() -> FastAPI:
    """Create and configure FastAPI application instance."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=settings.DESCRIPTION,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS Middleware to support React / Vite frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global Exception Handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled Exception on %s: %s", request.url.path, exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred during case screening.",
                "detail": str(exc),
            },
        )

    # Mount API routes at both root and /api prefixes for maximum frontend compatibility
    app.include_router(api_router, prefix="")
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

