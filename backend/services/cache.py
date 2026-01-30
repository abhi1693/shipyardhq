from __future__ import annotations

import hashlib
from typing import Any, Awaitable, Callable, Iterable
from urllib.parse import urlencode
from urllib.parse import urlparse

from aiocache.backends.redis import RedisCache
from aiocache.serializers import JsonSerializer

from services.logger import AppLogger
from services.version import APP_NAME, APP_VERSION
from settings import get_settings

logger = AppLogger.get_logger(__name__)

_cache_client: RedisCache | None = None


def is_cache_enabled() -> bool:
    settings = get_settings()
    return bool(settings.redis_url)


def _build_cache_client() -> RedisCache | None:
    settings = get_settings()
    redis_url = settings.redis_url
    if not redis_url:
        return None
    parsed = urlparse(redis_url)
    if not parsed.hostname:
        logger.warning("Redis URL missing hostname", extra={"redis_url": redis_url})
        return None
    db = 0
    if parsed.path and parsed.path != "/":
        try:
            db = int(parsed.path.lstrip("/"))
        except ValueError:
            logger.warning("Redis URL has invalid db", extra={"redis_url": redis_url})
            return None
    use_ssl = parsed.scheme == "rediss"
    return RedisCache(
        endpoint=parsed.hostname,
        port=parsed.port or 6379,
        password=parsed.password,
        db=db,
        ssl=use_ssl,
        serializer=JsonSerializer(),
    )


def get_cache_client() -> RedisCache | None:
    if not is_cache_enabled():
        return None
    global _cache_client
    if _cache_client is None:
        try:
            _cache_client = _build_cache_client()
        except Exception as exc:
            logger.warning("Cache client init failed", extra={"error": str(exc)})
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
    except Exception as exc:
        logger.warning("Cache get failed", extra={"key": key, "error": str(exc)})
        return None
    if payload is None:
        logger.info("Cache miss", extra={"key": key})
        return None
    logger.info("Cache hit", extra={"key": key})
    return payload


async def set_cached_json(key: str, value: Any, ttl_seconds: int | None = None) -> None:
    client = get_cache_client()
    if not client:
        return
    settings = get_settings()
    ttl = settings.redis_cache_default_ttl_seconds if ttl_seconds is None else ttl_seconds
    if ttl <= 0:
        return
    try:
        await client.set(key, value, ttl=ttl)
    except (TypeError, ValueError) as exc:
        logger.warning(
            "Cache payload not JSON serializable",
            extra={"key": key, "error": str(exc)},
        )
    except Exception as exc:
        logger.warning("Cache set failed", extra={"key": key, "error": str(exc)})


async def delete_by_prefix(prefix: str) -> int:
    client = get_cache_client()
    if not client:
        return 0
    pattern = f"{_normalize_cache_prefix(prefix)}:*"
    deleted = 0
    try:
        raw = getattr(client, "raw", None)
        if callable(raw):
            cursor = 0
            while True:
                response = await raw("scan", cursor, "MATCH", pattern, "COUNT", 200)
                cursor = int(response[0]) if response else 0
                keys = response[1] if response else []
                if keys:
                    deleted += int((await raw("del", *keys)) or 0)
                if cursor == 0:
                    break
        else:
            cache_client = getattr(client, "client", None) or getattr(client, "_client", None)
            if cache_client is None:
                return 0
            async for key in cache_client.scan_iter(match=pattern, count=200):
                deleted += int((await cache_client.delete(key)) or 0)
    except Exception as exc:
        logger.warning("Cache delete failed", extra={"prefix": prefix, "error": str(exc)})
        return 0
    return deleted
