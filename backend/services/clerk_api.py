from __future__ import annotations

from typing import Any

import httpx

from services.cache import cached_json
from services.http import USER_AGENT
from services.logger import AppLogger
from settings import get_settings

CLERK_API_BASE_URL = "https://api.clerk.com/v1"
CLERK_PUBLIC_CACHE_TTL = 300

logger = AppLogger.get_logger(__name__)


class ClerkAPIError(RuntimeError):
    def __init__(self, status_code: int, response_text: str, *, path: str, method: str) -> None:
        super().__init__(f"Clerk API error {status_code}: {response_text}")
        self.status_code = status_code
        self.response_text = response_text
        self.path = path
        self.method = method


def _get_clerk_secret_key() -> str:
    settings = get_settings()
    secret = settings.clerk_secret_key
    if not secret:
        raise RuntimeError("CLERK_SECRET_KEY is not set.")
    return secret


async def delete_clerk_user(clerk_id: str) -> None:
    secret = _get_clerk_secret_key()
    async with httpx.AsyncClient() as client:
        response = await client.request(
            "DELETE",
            f"{CLERK_API_BASE_URL}/users/{clerk_id}",
            headers={
                "Authorization": f"Bearer {secret}",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
            timeout=30.0,
        )

    if response.is_error:
        raise ClerkAPIError(
            response.status_code,
            response.text,
            path=f"/users/{clerk_id}",
            method="DELETE",
        )


async def get_clerk_user(clerk_id: str) -> dict[str, object]:
    secret = _get_clerk_secret_key()
    async with httpx.AsyncClient() as client:
        response = await client.request(
            "GET",
            f"{CLERK_API_BASE_URL}/users/{clerk_id}",
            headers={
                "Authorization": f"Bearer {secret}",
                "Accept": "application/json",
                "User-Agent": USER_AGENT,
            },
            timeout=30.0,
        )

    if response.is_error:
        raise ClerkAPIError(
            response.status_code,
            response.text,
            path=f"/users/{clerk_id}",
            method="GET",
        )

    data = response.json()
    if not isinstance(data, dict):
        raise ClerkAPIError(
            response.status_code,
            response.text,
            path=f"/users/{clerk_id}",
            method="GET",
        )
    return data


def _extract_clerk_image_url(payload: Any) -> str | None:
    if not isinstance(payload, dict):
        return None
    for key in ("image_url", "imageUrl"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


async def get_clerk_avatar_url(clerk_id: str | None) -> str | None:
    if not clerk_id:
        return None

    async def build_payload() -> dict[str, str | None]:
        try:
            payload = await get_clerk_user(clerk_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Clerk avatar fetch failed",
                extra={"error": str(exc), "clerk_id": clerk_id},
            )
            return {"imageUrl": None}

        return {"imageUrl": _extract_clerk_image_url(payload)}

    payload = await cached_json(
        "public:clerk-avatar",
        ttl_seconds=CLERK_PUBLIC_CACHE_TTL,
        path="/public/clerk-avatar",
        params=[("clerkId", clerk_id)],
        builder=build_payload,
    )
    if isinstance(payload, dict):
        value = payload.get("imageUrl")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None
