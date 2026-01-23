from __future__ import annotations

from fastapi import APIRouter

API_PREFIX = "/api/v1"


def api_prefix(*parts: str) -> str:
    cleaned = [part.strip("/") for part in parts if part]
    if cleaned:
        return f"{API_PREFIX}/{'/'.join(cleaned)}"
    return API_PREFIX


class BaseAPIView:
    router: APIRouter
    prefix: str

    def __init__(self, *, prefix: str, tags: list[str]) -> None:
        self.prefix = prefix
        self.router = APIRouter(prefix=prefix, tags=tags)
        self.register_routes()

    def register_routes(self) -> None:
        raise NotImplementedError
