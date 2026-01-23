from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import re
import time
from typing import Mapping

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from routers.base import api_prefix
from services.clerk_api import ClerkAPIError, get_clerk_user
from services.logger import AppLogger
from services.schemas.core import ClerkProfile
from services.rate_limit import webhook_rate_limit
from services.schemas.webhooks import IdentityWebhookEvent, IdentityWebhookResponse
from services.users import ensure_user_from_clerk, get_user_by_clerk_id
from settings import get_settings

logger = AppLogger.get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix=api_prefix("webhooks", "identity"), tags=["webhooks"])

_SIGNATURE_PATTERN = re.compile(r"v1,([^, ]+)")


def _pad_base64(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return f"{value}{padding}"


def _decode_webhook_secret(secret: str) -> bytes:
    value = secret.strip()
    if value.startswith("whsec_"):
        value = value[len("whsec_") :]
    return base64.b64decode(_pad_base64(value), validate=True)


def _extract_signatures(signature_header: str) -> list[str]:
    return _SIGNATURE_PATTERN.findall(signature_header or "")


def _verify_svix_signature(
    payload: bytes,
    headers: Mapping[str, str],
    secret: str,
    tolerance_seconds: int,
) -> None:
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Svix headers.",
        )

    try:
        timestamp = int(svix_timestamp)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Svix timestamp.",
        ) from exc

    if tolerance_seconds > 0:
        now = int(time.time())
        if abs(now - timestamp) > tolerance_seconds:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Webhook signature expired.",
            )

    try:
        secret_bytes = _decode_webhook_secret(secret)
    except (ValueError, binascii.Error) as exc:
        logger.exception("Invalid webhook secret")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook configuration error.",
        ) from exc

    signing_payload = b".".join(
        [svix_id.encode("utf-8"), svix_timestamp.encode("utf-8"), payload]
    )
    digest = hmac.new(secret_bytes, signing_payload, hashlib.sha256).digest()
    expected_signature = base64.b64encode(digest).decode("utf-8")

    signatures = _extract_signatures(svix_signature)
    if not signatures or not any(
        hmac.compare_digest(expected_signature, candidate) for candidate in signatures
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature.",
        )


@router.post("", response_model=IdentityWebhookResponse, operation_id="identity_webhook")
async def identity_webhook(
    request: Request,
    _: None = Depends(webhook_rate_limit),
    session: Session = Depends(get_session),
) -> IdentityWebhookResponse:
    secret = settings.identity_webhook_secret
    if not secret:
        logger.error("IDENTITY_WEBHOOK_SECRET is not set.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook configuration error.",
        )

    payload = await request.body()
    _verify_svix_signature(
        payload,
        request.headers,
        secret,
        settings.identity_webhook_tolerance_seconds,
    )

    try:
        event = IdentityWebhookEvent.model_validate_json(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        ) from exc

    event_type = event.type
    if event_type in ("user.created", "user.updated"):
        user_profile = ClerkProfile.from_payload(event.data)
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing user payload.",
            )
        if user_profile.external_accounts is None:
            try:
                clerk_payload = await get_clerk_user(user_profile.id)
            except RuntimeError as exc:
                logger.error("Clerk API configuration error.", exc_info=exc)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Webhook configuration error.",
                ) from exc
            except ClerkAPIError as exc:
                logger.error(
                    "Clerk API request failed.",
                    extra={"status_code": exc.status_code, "path": exc.path},
                )
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Upstream identity provider error.",
                ) from exc
            refreshed_profile = ClerkProfile.from_payload(clerk_payload)
            if refreshed_profile:
                user_profile = refreshed_profile
        await ensure_user_from_clerk(session, user_profile)
        return IdentityWebhookResponse(ok=True, status="processed", event_type=event_type)

    if event_type == "user.deleted":
        user_id = (event.data or {}).get("id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing user id.",
            )
        db_user = await get_user_by_clerk_id(session, user_id)
        if db_user:
            await session.delete(db_user)
            await session.commit()
        return IdentityWebhookResponse(ok=True, status="processed", event_type=event_type)

    logger.info("Unhandled webhook event: %s", event_type)
    return IdentityWebhookResponse(ok=True, status="ignored", event_type=event_type)
