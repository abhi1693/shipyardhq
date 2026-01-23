from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request, Response, status
from redis.exceptions import RedisError

from services.cache import get_cache_client
from services.logger import AppLogger
from services.version import APP_NAME, APP_VERSION
from settings import get_settings

logger = AppLogger.get_logger(__name__)

_RATE_LIMIT_SCRIPT = """
local current = redis.call("INCRBY", KEYS[1], ARGV[2])
if current == tonumber(ARGV[2]) then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
"""


@dataclass(frozen=True)
class RateLimitState:
    allowed: bool
    limit: int
    remaining: int
    reset: int
    retry_after: int
    window_seconds: int
    key: str


def _normalize_rate_limit_prefix(scope: str) -> str:
    return f"{APP_NAME}:{APP_VERSION}:rate_limit:{scope}"


def _hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _resolve_client_id(request: Request) -> str | None:
    settings = get_settings()
    header_name = settings.rate_limit_ip_header
    if header_name:
        header_value = request.headers.get(header_name)
    elif settings.rate_limit_use_forwarded_for:
        header_value = request.headers.get("x-forwarded-for")
    else:
        header_value = None

    if header_value:
        ip = header_value.split(",", 1)[0].strip()
    else:
        ip = request.client.host if request.client else None

    if not ip:
        return None
    return _hash_value(ip)


async def _apply_limit(
    *,
    key: str,
    limit: int,
    window_seconds: int,
    cost: int,
) -> RateLimitState:
    now = int(time.time())
    client = get_cache_client()
    if not client:
        return RateLimitState(
            allowed=True,
            limit=limit,
            remaining=limit,
            reset=now + window_seconds,
            retry_after=0,
            window_seconds=window_seconds,
            key=key,
        )

    try:
        result = await client.eval(_RATE_LIMIT_SCRIPT, 1, key, window_seconds, cost)
    except RedisError as exc:
        logger.warning("Rate limit check failed", extra={"error": str(exc)})
        return RateLimitState(
            allowed=True,
            limit=limit,
            remaining=limit,
            reset=now + window_seconds,
            retry_after=0,
            window_seconds=window_seconds,
            key=key,
        )

    current = int(result[0])
    ttl = int(result[1])
    if ttl < 0:
        ttl = window_seconds
    remaining = max(0, limit - current)
    allowed = current <= limit
    retry_after = ttl if not allowed else 0
    reset = now + ttl
    return RateLimitState(
        allowed=allowed,
        limit=limit,
        remaining=remaining,
        reset=reset,
        retry_after=retry_after,
        window_seconds=window_seconds,
        key=key,
    )


def _select_header_state(states: list[RateLimitState]) -> RateLimitState:
    blocked = [state for state in states if not state.allowed]
    if blocked:
        return max(blocked, key=lambda state: state.retry_after)
    return min(states, key=lambda state: state.remaining)


def _apply_rate_limit_headers(response: Response, state: RateLimitState) -> None:
    response.headers["X-RateLimit-Limit"] = str(state.limit)
    response.headers["X-RateLimit-Remaining"] = str(state.remaining)
    response.headers["X-RateLimit-Reset"] = str(state.reset)
    if not state.allowed:
        response.headers["Retry-After"] = str(state.retry_after)


async def _rate_limit_with_policy(
    request: Request,
    response: Response,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
    path_limit: int,
    path_window_seconds: int,
) -> None:
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    client_id = _resolve_client_id(request)
    if not client_id:
        return

    states: list[RateLimitState] = []
    if limit > 0:
        key = f"{_normalize_rate_limit_prefix(scope)}:{client_id}"
        states.append(
            await _apply_limit(
                key=key,
                limit=limit,
                window_seconds=window_seconds,
                cost=1,
            )
        )
    if path_limit > 0:
        path_key = _hash_value(f"{client_id}:{request.method}:{request.url.path}")
        key = f"{_normalize_rate_limit_prefix(f'{scope}_path')}:{path_key}"
        states.append(
            await _apply_limit(
                key=key,
                limit=path_limit,
                window_seconds=path_window_seconds,
                cost=1,
            )
        )
    if not states:
        return

    header_state = _select_header_state(states)
    _apply_rate_limit_headers(response, header_state)

    blocked = next((state for state in states if not state.allowed), None)
    if blocked:
        logger.warning(
            "Rate limit exceeded",
            extra={
                "path": request.url.path,
                "method": request.method,
                "limit": blocked.limit,
                "window_seconds": blocked.window_seconds,
                "client_id": client_id,
                "scope": scope,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded.",
        )


async def public_rate_limit(request: Request, response: Response) -> None:
    settings = get_settings()
    await _rate_limit_with_policy(
        request,
        response,
        scope="public",
        limit=settings.rate_limit_public_requests,
        window_seconds=settings.rate_limit_public_window_seconds,
        path_limit=settings.rate_limit_public_path_requests,
        path_window_seconds=settings.rate_limit_public_path_window_seconds,
    )


async def webhook_rate_limit(request: Request, response: Response) -> None:
    settings = get_settings()
    await _rate_limit_with_policy(
        request,
        response,
        scope="webhook",
        limit=settings.rate_limit_webhook_requests,
        window_seconds=settings.rate_limit_webhook_window_seconds,
        path_limit=settings.rate_limit_webhook_path_requests,
        path_window_seconds=settings.rate_limit_webhook_path_window_seconds,
    )
