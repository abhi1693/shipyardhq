from __future__ import annotations

import hashlib
import json
from typing import Any, Awaitable, Callable, Iterable
from urllib.parse import urlencode

from redis.asyncio import Redis
from redis.exceptions import RedisError

from services.logger import AppLogger
from services.version import APP_NAME, APP_VERSION
from settings import get_settings

logger = AppLogger.get_logger(__name__)

_cache_client: Redis | None = None


def is_cache_enabled() -> bool:
    settings = get_settings()
    return bool(settings.redis_url)


def get_cache_client() -> Redis | None:
    if not is_cache_enabled():
        return None
    global _cache_client
    if _cache_client is None:
        settings = get_settings()
        try:
            _cache_client = Redis.from_url(settings.redis_url, decode_responses=True)
        except Exception as exc:
            logger.warning(
                "Redis client init failed",
                extra={"error": str(exc)},
            )
            return None
    return _cache_client


def _normalize_cache_prefix(prefix: str) -> str:
    return f"{APP_NAME}:{APP_VERSION}:{prefix}"


def build_cache_key(
    prefix: str,
    *,
    path: str,
    params: Iterable[tuple[str, str]] | None = None,
) -> str:
    normalized = ""
    if params:
        normalized = urlencode(sorted((str(key), str(value)) for key, value in params))
    raw_key = f"{path}?{normalized}" if normalized else path
    digest = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return f"{_normalize_cache_prefix(prefix)}:{digest}"


async def cached_json(
    prefix: str,
    *,
    ttl_seconds: int,
    path: str,
    builder: Callable[[], Awaitable[Any]],
    params: Iterable[tuple[str, str]] | None = None,
    encoder: Callable[[Any], Any] | None = None,
) -> Any:
    if not is_cache_enabled() or ttl_seconds <= 0:
        return await builder()
    cache_key = build_cache_key(prefix, path=path, params=params)
    cached = await get_cached_json(cache_key)
    if cached is not None:
        return cached
    response = await builder()
    payload = encoder(response) if encoder else response
    await set_cached_json(cache_key, payload, ttl_seconds=ttl_seconds)
    return payload


async def get_cached_json(key: str) -> Any | None:
    client = get_cache_client()
    if not client:
        return None
    try:
        payload = await client.get(key)
    except RedisError as exc:
        logger.warning("Redis get failed", extra={"key": key, "error": str(exc)})
        return None
    if payload is None:
        logger.info("Cache miss", extra={"key": key})
        return None
    try:
        value = json.loads(payload)
    except json.JSONDecodeError:
        logger.warning("Redis cached payload invalid", extra={"key": key})
        return None
    logger.info("Cache hit", extra={"key": key})
    return value


async def set_cached_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    client = get_cache_client()
    if not client:
        return
    settings = get_settings()
    ttl = settings.redis_cache_default_ttl_seconds if ttl_seconds is None else ttl_seconds
    if ttl <= 0:
        return
    try:
        payload = json.dumps(value, separators=(",", ":"))
    except (TypeError, ValueError) as exc:
        logger.warning(
            "Redis cache payload not JSON serializable",
            extra={"key": key, "error": str(exc)},
        )
        return
    try:
        await client.setex(key, ttl, payload)
    except RedisError as exc:
        logger.warning("Redis set failed", extra={"key": key, "error": str(exc)})


async def delete_by_prefix(prefix: str) -> int:
    client = get_cache_client()
    if not client:
        return 0
    pattern = f"{_normalize_cache_prefix(prefix)}:*"
    deleted = 0
    try:
        async for key in client.scan_iter(match=pattern, count=200):
            deleted += int((await client.delete(key)) or 0)
    except RedisError as exc:
        logger.warning("Redis delete failed", extra={"prefix": prefix, "error": str(exc)})
        return 0
    return deleted
