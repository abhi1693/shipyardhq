from __future__ import annotations

import base64
import time
from typing import Any

import httpx
import jwt

from services.http import USER_AGENT
from settings import get_settings

GITHUB_API_BASE_URL = "https://api.github.com"
DEFAULT_PER_PAGE = 100


class GitHubAPIError(RuntimeError):
    def __init__(self, status_code: int, response_text: str, *, path: str, method: str) -> None:
        super().__init__(f"GitHub API error {status_code}: {response_text}")
        self.status_code = status_code
        self.response_text = response_text
        self.path = path
        self.method = method


def _load_private_key() -> str:
    settings = get_settings()
    raw = settings.github_app_private_key
    if not raw:
        raise RuntimeError("GITHUB_APP_PRIVATE_KEY is not set.")

    key = raw.replace("\\n", "\n")
    if "BEGIN" not in key:
        key = base64.b64decode(key).decode("utf-8")

    return key


def get_github_app_jwt() -> str:
    settings = get_settings()
    app_id = settings.github_app_id
    if not app_id:
        raise RuntimeError("GITHUB_APP_ID is not set.")

    now = int(time.time())
    payload = {
        "iat": now - 60,
        "exp": now + 540,
        "iss": app_id,
    }

    return jwt.encode(payload, _load_private_key(), algorithm="RS256")


async def _github_request(
    token: str,
    path: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> httpx.Response:
    async with httpx.AsyncClient() as client:
        return await client.request(
            method,
            f"{GITHUB_API_BASE_URL}{path}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "User-Agent": USER_AGENT,
            },
            json=body,
            timeout=30.0,
        )


def _raise_for_error(response: httpx.Response, *, path: str, method: str) -> None:
    if response.is_error:
        raise GitHubAPIError(
            response.status_code,
            response.text,
            path=path,
            method=method,
        )


async def github_fetch_with_token(
    token: str,
    path: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> Any:
    response = await _github_request(token, path, method=method, body=body)
    _raise_for_error(response, path=path, method=method)
    return response.json()


async def github_fetch_with_token_response(
    token: str,
    path: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    *,
    raise_for_error: bool = True,
) -> httpx.Response:
    response = await _github_request(token, path, method=method, body=body)
    if raise_for_error:
        _raise_for_error(response, path=path, method=method)
    return response


async def github_app_fetch(
    path: str, method: str = "GET", body: dict[str, Any] | None = None
) -> Any:
    token = get_github_app_jwt()
    return await github_fetch_with_token(token, path, method=method, body=body)


async def github_installation_fetch(
    installation_id: int | str,
    path: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
) -> Any:
    token = await get_installation_token(installation_id)
    return await github_fetch_with_token(token, path, method=method, body=body)


async def get_installation_token(installation_id: int | str) -> str:
    response = await github_app_fetch(
        f"/app/installations/{installation_id}/access_tokens",
        method="POST",
    )
    return response["token"]


async def list_github_app_installations() -> list[dict[str, Any]]:
    installations: list[dict[str, Any]] = []
    page = 1

    while True:
        page_data = await github_app_fetch(
            f"/app/installations?per_page={DEFAULT_PER_PAGE}&page={page}"
        )
        installations.extend(page_data)
        if len(page_data) < DEFAULT_PER_PAGE:
            break
        page += 1

    return installations


async def get_github_installation(installation_id: int | str) -> dict[str, Any]:
    return await github_app_fetch(f"/app/installations/{installation_id}")


async def list_installation_repositories(installation_id: int | str) -> list[dict[str, Any]]:
    repositories: list[dict[str, Any]] = []
    page = 1

    while True:
        page_data = await github_installation_fetch(
            installation_id,
            f"/installation/repositories?per_page={DEFAULT_PER_PAGE}&page={page}",
        )
        repositories.extend(page_data.get("repositories", []))
        if len(page_data.get("repositories", [])) < DEFAULT_PER_PAGE:
            break
        page += 1

    return repositories


async def list_organization_members(
    installation_id: int | str, org_login: str
) -> list[str]:
    members: list[str] = []
    page = 1

    while True:
        page_data = await github_installation_fetch(
            installation_id,
            f"/orgs/{org_login}/members?per_page={DEFAULT_PER_PAGE}&page={page}",
        )
        if not isinstance(page_data, list):
            break
        for member in page_data:
            if isinstance(member, dict):
                login = member.get("login")
                if isinstance(login, str) and login:
                    members.append(login)
        if len(page_data) < DEFAULT_PER_PAGE:
            break
        page += 1

    return members


async def is_organization_member(
    installation_id: int | str, org_login: str, username: str
) -> bool:
    if not org_login or not username:
        return False
    token = await get_installation_token(installation_id)
    response = await github_fetch_with_token_response(
        token,
        f"/orgs/{org_login}/members/{username}",
        raise_for_error=False,
    )
    if response.status_code == 204:
        return True
    if response.status_code == 404:
        return False
    if response.is_error:
        _raise_for_error(response, path=response.request.url.path, method=response.request.method)
    return False


def get_github_app_install_url() -> str | None:
    settings = get_settings()
    slug = settings.github_app_slug
    if not slug:
        return None
    return f"https://github.com/apps/{slug}/installations/new"
