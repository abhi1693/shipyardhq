from __future__ import annotations

from typing import Any

from services.schemas.base import BaseSerializer


class IdentityWebhookEvent(BaseSerializer):
    type: str
    data: dict[str, Any] | None = None


class IdentityWebhookResponse(BaseSerializer):
    ok: bool
    status: str
    event_type: str | None = None


class GithubWebhookResponse(BaseSerializer):
    ok: bool
    status: str
    event_type: str | None = None
    action: str | None = None
    installation_id: str | None = None
    message: str | None = None
