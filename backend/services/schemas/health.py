from __future__ import annotations

from services.schemas.base import BaseSerializer


class HealthCheck(BaseSerializer):
    ok: bool
    status: str
    latency_ms: float | None = None
    error: str | None = None


class HealthResponse(BaseSerializer):
    ok: bool
    status: str
    version: str
    uptime_seconds: float
    checks: dict[str, HealthCheck] | None = None
