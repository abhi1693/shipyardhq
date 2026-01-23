from __future__ import annotations

import httpx

from services.http import USER_AGENT
from settings import get_settings

CLERK_API_BASE_URL = "https://api.clerk.com/v1"


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
