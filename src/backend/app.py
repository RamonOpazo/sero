from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from contextlib import asynccontextmanager
from sqlalchemy.exc import DatabaseError
from loguru import logger

from backend.core.config import settings
from backend.core.logging import init_logging
from backend.core.database import db_manager
from backend.api.routers import projects_router, documents_router, files_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_logging()
    # Startup
    logger.info("Starting sero...")
    db_manager.init()
    yield
    # Shutdown
    logger.info("Shutting down sero...")


app = FastAPI(
    title="Sero - Document Obfuscation Service",
    description="A web service for medical document obfuscation and data extraction",
    version="0.2.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.default_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DatabaseError)
async def database_error_handler(request: Request, exc: DatabaseError):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database error occurred",
            "error": str(exc.__class__.__name__)
        }
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Ooops, something went wrong",
            "error": str(exc.__class__.__name__)
        }
    )


app.include_router(projects_router.router, prefix="/api/projects", tags=["projects"])
app.include_router(documents_router.router, prefix="/api/documents", tags=["documents"])
app.include_router(files_router.router, prefix="/api/files", tags=["files"])

static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
(static_dir / "assets").mkdir(parents=True, exist_ok=True)

app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")


@app.get("/")
@app.get("/{path:path}")
async def serve_frontend(path: str = ""):    
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse({"error": "Frontend not built"}, status_code=404)
