from __future__ import annotations

import asyncio
import time

from fastapi import APIRouter, Depends, Response, status
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from services.cache import get_cache_client, is_cache_enabled
from services.schemas.health import HealthCheck, HealthResponse
from services.version import APP_VERSION

_START_TIME = time.monotonic()
_DEPENDENCY_TIMEOUT_SECONDS = 2.0

router = APIRouter(prefix="/health", tags=["health"])


def _build_response(
    ok: bool,
    status_label: str,
    *,
    checks: dict[str, HealthCheck] | None = None,
) -> HealthResponse:
    return HealthResponse(
        ok=ok,
        status=status_label,
        version=APP_VERSION,
        uptime_seconds=round(time.monotonic() - _START_TIME, 3),
        checks=checks,
    )


async def _check_database(session: Session) -> HealthCheck:
    started = time.perf_counter()
    try:
        await asyncio.wait_for(
            session.execute(text("SELECT 1")),
            timeout=_DEPENDENCY_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        return HealthCheck(ok=False, status="timeout", error="Database check timed out.")
    except Exception as exc:
        return HealthCheck(ok=False, status="error", error=str(exc))

    latency_ms = (time.perf_counter() - started) * 1000
    return HealthCheck(ok=True, status="ok", latency_ms=round(latency_ms, 2))


async def _check_redis() -> HealthCheck:
    if not is_cache_enabled():
        return HealthCheck(ok=True, status="disabled")
    client = get_cache_client()
    if not client:
        return HealthCheck(ok=False, status="error", error="Redis client unavailable.")
    started = time.perf_counter()
    try:
        await asyncio.wait_for(client.ping(), timeout=_DEPENDENCY_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        return HealthCheck(ok=False, status="timeout", error="Redis check timed out.")
    except RedisError as exc:
        return HealthCheck(ok=False, status="error", error=str(exc))
    except Exception as exc:
        return HealthCheck(ok=False, status="error", error=str(exc))

    latency_ms = (time.perf_counter() - started) * 1000
    return HealthCheck(ok=True, status="ok", latency_ms=round(latency_ms, 2))


@router.get("/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return _build_response(ok=True, status_label="alive")


@router.get("", response_model=HealthResponse)
async def root_health() -> HealthResponse:
    return _build_response(ok=True, status_label="ok")


@router.get("/ready", response_model=HealthResponse)
async def readiness(
    response: Response,
    session: Session = Depends(get_session),
) -> HealthResponse:
    db_check = await _check_database(session)
    redis_check = await _check_redis()
    checks = {
        "database": db_check,
        "redis": redis_check,
    }
    ok = db_check.ok and redis_check.ok
    if not ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return _build_response(ok=False, status_label="unready", checks=checks)
    return _build_response(ok=True, status_label="ready", checks=checks)
