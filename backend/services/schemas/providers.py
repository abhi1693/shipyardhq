from __future__ import annotations

from pydantic import Field

from models import Provider, ProviderStatus
from services.schemas.base import BaseModelSerializer, BaseSerializer


class ProviderSyncResponse(BaseSerializer):
    ok: bool
    error: str | None = None
    repos: int
    items: int
    facts: int
    last_synced_at: str | None = Field(default=None, validation_alias="lastSyncedAt")
    warnings: list[str] | None = None
    sync_run_id: int | None = Field(default=None, validation_alias="syncRunId")


class ProviderSyncQueuedResponse(BaseSerializer):
    ok: bool
    status: str
    message: str | None = None
    provider: Provider


class ProviderSyncRequest(BaseSerializer):
    installation_id: str | None = Field(default=None, validation_alias="installationId")


class ProviderAppConfigResponse(BaseSerializer):
    provider: Provider
    install_url: str | None = None


class ProviderInstallCallbackResponse(BaseSerializer):
    ok: bool
    status: str
    message: str | None = None
    provider: Provider
    installation_id: str | None = None


class ProviderAccountSummary(BaseModelSerializer):
    provider: Provider
    provider_user_id: str = Field(validation_alias="providerUserId")
    provider_username: str | None = Field(default=None, validation_alias="providerUsername")
    status: ProviderStatus


class ProviderInstallationSummary(BaseModelSerializer):
    provider: Provider
    installation_id: str = Field(validation_alias="installationId")
    account_login: str = Field(validation_alias="accountLogin")
    account_type: str = Field(validation_alias="accountType")
