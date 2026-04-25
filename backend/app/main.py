from pathlib import Path
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_routes.router, prefix="/api", tags=["ai"])
app.include_router(performance.router, prefix="/api", tags=["performance"])
app.include_router(payments.router, prefix="/api", tags=["payments"])
app.include_router(users.router, prefix="/api", tags=["users"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


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
