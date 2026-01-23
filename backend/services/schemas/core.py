from __future__ import annotations

from services.schemas.base import BaseSerializer


class ClerkExternalAccount(BaseSerializer):
    provider: str
    provider_user_id: str
    username: str | None = None


class ClerkProfile(BaseSerializer):
    id: str
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    image_url: str | None = None
    external_accounts: list[ClerkExternalAccount] | None = None
