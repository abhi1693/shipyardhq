from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ValidationError
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from models import User
from services.users import get_or_create_user_by_clerk_id
from settings import get_settings


class ClerkTokenPayload(BaseModel):
    sub: str


AUTH_ERROR_DETAIL = "Could not validate credentials"
AUTH_CONFIG_ERROR_DETAIL = "Authentication configuration error"


@lru_cache
def _build_clerk_http_bearer(auto_error: bool) -> ClerkHTTPBearer:
    settings = get_settings()
    if not settings.clerk_jwks_url:
        raise RuntimeError("CLERK_JWKS_URL is not set.")
    clerk_config = ClerkConfig(
        jwks_url=settings.clerk_jwks_url,
        verify_iat=settings.clerk_verify_iat,
        leeway=settings.clerk_leeway,
    )
    return ClerkHTTPBearer(config=clerk_config, auto_error=auto_error, add_state=True)


async def clerk_auth_required(request: Request) -> HTTPAuthorizationCredentials:
    try:
        guard = _build_clerk_http_bearer(auto_error=True)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=AUTH_CONFIG_ERROR_DETAIL) from exc
    try:
        return await guard(request)
    except HTTPException as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=AUTH_ERROR_DETAIL,
        ) from exc


def _resolve_auth_from_state(
    request: Request, fallback: HTTPAuthorizationCredentials | None
) -> HTTPAuthorizationCredentials | None:
    auth_data = getattr(request.state, "clerk_auth", None)
    return auth_data or fallback


def _parse_subject(auth_data: HTTPAuthorizationCredentials | None) -> str | None:
    if not auth_data or not auth_data.decoded:
        return None
    payload = ClerkTokenPayload.model_validate(auth_data.decoded)
    return payload.sub


async def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(clerk_auth_required),
) -> str:
    auth_data = _resolve_auth_from_state(request, credentials)
    try:
        user_id = _parse_subject(auth_data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=AUTH_ERROR_DETAIL,
        ) from exc
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=AUTH_ERROR_DETAIL,
        )
    return user_id


async def get_optional_user_id(request: Request) -> str | None:
    try:
        guard = _build_clerk_http_bearer(auto_error=False)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=AUTH_CONFIG_ERROR_DETAIL) from exc
    credentials = await guard(request)
    if not credentials:
        return None
    auth_data = _resolve_auth_from_state(request, credentials)
    try:
        return _parse_subject(auth_data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=AUTH_ERROR_DETAIL,
        ) from exc


async def get_current_user(
    clerk_id: Annotated[str, Depends(get_current_user_id)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    return await get_or_create_user_by_clerk_id(session, clerk_id)


CurrentUserId = Annotated[str, Depends(get_current_user_id)]
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUserId = Annotated[str | None, Depends(get_optional_user_id)]
