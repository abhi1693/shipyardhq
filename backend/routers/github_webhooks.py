from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status

from routers.base import api_prefix
from services.github_webhooks import build_installation_event
from services.rate_limit import webhook_rate_limit
from services.logger import AppLogger
from services.schemas.webhooks import GithubWebhookResponse
from services.sync_scheduler import enqueue_github_webhook_event
from settings import get_settings

logger = AppLogger.get_logger(__name__)
settings = get_settings()

router = APIRouter(prefix=api_prefix("webhooks", "github"), tags=["webhooks"])


def _verify_github_signature(
    payload: bytes,
    signature_header: str | None,
    secret: str,
) -> None:
    if not signature_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing GitHub signature.",
        )
    if not signature_header.startswith("sha256="):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub signature format.",
        )
    signature = signature_header.split("=", 1)[1]
    digest = hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(digest, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature.",
        )


def _parse_payload(payload: bytes) -> dict[str, Any]:
    try:
        value = json.loads(payload)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        ) from exc
    if not isinstance(value, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook payload.",
        )
    return value


@router.post("", response_model=GithubWebhookResponse, operation_id="github_webhook")
async def github_webhook(
    request: Request,
    _: None = Depends(webhook_rate_limit),
) -> GithubWebhookResponse:
    secret = settings.github_webhook_secret
    if not secret:
        logger.error("GITHUB_WEBHOOK_SECRET is not set.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook configuration error.",
        )

    payload = await request.body()
    _verify_github_signature(payload, request.headers.get("x-hub-signature-256"), secret)

    event_type = request.headers.get("x-github-event")
    if not event_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing GitHub event type.",
        )

    data = _parse_payload(payload)
    action = data.get("action") if isinstance(data.get("action"), str) else None
    delivery_id = request.headers.get("x-github-delivery")

    if event_type == "ping":
        return GithubWebhookResponse(
            ok=True,
            status="pong",
            event_type=event_type,
            action=action,
        )

    if event_type in {"installation", "installation_repositories"}:
        try:
            event = build_installation_event(event_type, action, data)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        await enqueue_github_webhook_event(event.to_dict(), delivery_id=delivery_id)
        return GithubWebhookResponse(
            ok=True,
            status="queued",
            event_type=event_type,
            action=action,
            installation_id=event.installation_id,
        )

    return GithubWebhookResponse(
        ok=True,
        status="ignored",
        event_type=event_type,
        action=action,
    )
