from asyncio import to_thread
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

from services.logger import AppLogger
from services.migrations import run_migrations
from services.version import APP_VERSION
from settings import get_settings
from routers.settings import router as settings_router
from routers.providers import router as providers_router
from routers.profile_delete import router as profile_delete_router
from routers.sync_runs import router as sync_runs_router
from routers.profile import router as profile_router
from routers.leaderboard import router as leaderboard_router
from routers.share import router as share_router
from routers.webhooks import router as webhooks_router
from routers.github_webhooks import router as github_webhooks_router
from routers.provider_resources import router as provider_resources_router
from routers.stats import router as stats_router
from routers.health import router as health_router
from services.sync_scheduler import init_scheduler, shutdown_scheduler
from admin import configure_admin

settings = get_settings()
AppLogger.configure()
logger = AppLogger.get_logger(__name__)


def _resolve_environment() -> str:
    for key in ("APP_ENV", "ENVIRONMENT", "ENV", "FASTAPI_ENV", "PYTHON_ENV", "NODE_ENV"):
        value = os.getenv(key)
        if value:
            return value
    return "development"


def build_error_content(
    message: str,
    *,
    code: str | None = None,
    details: Any | None = None,
) -> dict[str, Any]:
    error: dict[str, Any] = {"message": message}
    if code is not None:
        error["code"] = code
    if details is not None:
        error["details"] = details
    return {"ok": False, "error": error}


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.auto_migrate_db:
        await to_thread(run_migrations)
    scheduler, _ = await init_scheduler(
        settings.sync_refresh_interval_seconds,
        settings.sync_scheduler_max_concurrent,
        leaderboard_daily_interval_seconds=settings.leaderboard_daily_refresh_interval_seconds,
        leaderboard_weekly_interval_seconds=settings.leaderboard_weekly_refresh_interval_seconds,
        leaderboard_monthly_interval_seconds=settings.leaderboard_monthly_refresh_interval_seconds,
        task_worker_interval_seconds=settings.task_worker_interval_seconds,
        task_worker_batch_size=settings.task_worker_batch_size,
        task_worker_lease_seconds=settings.task_worker_lease_seconds,
        task_worker_concurrency=settings.task_worker_concurrency,
    )
    yield
    await shutdown_scheduler(scheduler)


app = FastAPI(lifespan=lifespan, version=APP_VERSION)
configure_admin(app)


@app.get("/", response_class=HTMLResponse)
async def root() -> str:
    environment = _resolve_environment()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return (
        "<!doctype html>"
        "<html lang=\"en\">"
        "<head>"
        "<meta charset=\"utf-8\" />"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />"
        "<title>GitRank API</title>"
        "<style>"
        "body{margin:0;background:#f7f7f8;color:#0b0b0b;font-family:Arial, sans-serif;}"
        "main{max-width:720px;margin:0 auto;padding:32px 20px;}"
        ".card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;}"
        "h1{margin:0 0 6px;font-size:24px;}"
        "p{margin:0;color:#555;font-size:14px;}"
        "dl{display:grid;grid-template-columns:140px 1fr;row-gap:10px;column-gap:12px;"
        "margin:16px 0 0;font-size:14px;}"
        "dt{color:#6b7280;font-weight:600;}"
        "dd{margin:0;color:#111827;word-break:break-all;}"
        ".links{margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;}"
        ".links a{color:#111827;text-decoration:none;font-weight:600;font-size:14px;"
        "border:1px solid #e5e7eb;padding:6px 10px;border-radius:8px;background:#fff;}"
        ".links a:hover{border-color:#9ca3af;}"
        "</style>"
        "</head>"
        "<body>"
        "<main>"
        "<div class=\"card\">"
        "<h1>GitRank API</h1>"
        "<p>Service status overview</p>"
        "<dl>"
        "<dt>Status</dt><dd>OK</dd>"
        f"<dt>Timestamp</dt><dd>{timestamp}</dd>"
        f"<dt>Environment</dt><dd>{environment}</dd>"
        f"<dt>Version</dt><dd>{APP_VERSION}</dd>"
        "</dl>"
        "<div class=\"links\">"
        "<a href=\"/docs\">Docs</a>"
        "<a href=\"/openapi.json\">OpenAPI</a>"
        "<a href=\"/health\">Health</a>"
        "</div>"
        "</div>"
        "</main>"
        "</body>"
        "</html>"
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, str):
        message = detail
        details = None
    else:
        message = "Request failed."
        details = detail
    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_content(message, details=details),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=build_error_content("Validation error.", details=exc.errors()),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    logger.exception("Unhandled exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=build_error_content("Internal server error."),
    )

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(settings_router)
app.include_router(providers_router)
app.include_router(profile_delete_router)
app.include_router(sync_runs_router)
app.include_router(profile_router)
app.include_router(leaderboard_router)
app.include_router(share_router)
app.include_router(webhooks_router)
app.include_router(github_webhooks_router)
app.include_router(provider_resources_router)
app.include_router(stats_router)
app.include_router(health_router)
