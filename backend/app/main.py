from pathlib import Path
from urllib.parse import urlparse
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .config import get_settings
from .routers import ai_routes, performance, payments, users


settings = get_settings()
app = FastAPI(
    title="VidyaAI API",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIST_DIR = BASE_DIR / "frontend" / "dist"


def build_allowed_origins(frontend_url: str) -> list[str]:
    origins = {"http://localhost:5173"}
    cleaned = frontend_url.strip().rstrip("/")
    if cleaned:
        origins.add(cleaned)
        parsed = urlparse(cleaned)
        if parsed.scheme and parsed.netloc:
            host = parsed.netloc
            if host.startswith("www."):
                origins.add(f"{parsed.scheme}://{host.removeprefix('www.')}")
            else:
                origins.add(f"{parsed.scheme}://www.{host}")
    return sorted(origins)


def build_allowed_origin_regex(frontend_url: str) -> str | None:
    cleaned = frontend_url.strip().rstrip("/")
    if not cleaned:
        return r"https://.*"

    parsed = urlparse(cleaned)
    if not parsed.scheme or not parsed.netloc:
        return r"https://.*"

    host = parsed.netloc
    if host.endswith(".vidyaai.cloud"):
        return r"https://([a-z0-9-]+\.)*vidyaai\.cloud"
    if host == "vidyaai.cloud":
        return r"https://([a-z0-9-]+\.)*vidyaai\.cloud"
    return r"https://.*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_routes.router, prefix="/api", tags=["ai"])
app.include_router(performance.router, prefix="/api", tags=["performance"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(users.router, prefix="/api", tags=["users"])


@app.get("/health")
async def health():
    import os

    supabase_url = (os.getenv("SUPABASE_URL") or settings.supabase_url or "").strip()
    service_role_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABSE_SERVICE_ROLE_KEY")
        or settings.supabase_service_role_key
        or ""
    ).strip()
    return {
        "status": "ok",
        "version": "1.0.0",
        "supabase_configured": bool(supabase_url and service_role_key),
        "supabase_missing": {
            "SUPABASE_URL": not bool(supabase_url),
            "SUPABASE_SERVICE_ROLE_KEY": not bool(service_role_key),
        },
        "frontend_url": settings.frontend_url,
    }


if FRONTEND_DIST_DIR.exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_home():
        return FileResponse(FRONTEND_DIST_DIR / "index.html")


    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        target = FRONTEND_DIST_DIR / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)

        return FileResponse(FRONTEND_DIST_DIR / "index.html")
else:
    @app.get("/")
    async def frontend_not_built():
        return {
            "message": "VidyaAI frontend is not built yet.",
            "next_steps": [
                "cd frontend",
                "npm install",
                "npm run build",
                "restart uvicorn app.main:app --reload",
            ],
            "docs": "/api/docs",
        }
