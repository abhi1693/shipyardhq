from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import Field

from models import Provider, ProviderStatus
from services.schemas.base import BaseModelSerializer


class ProviderAccountResource(BaseModelSerializer):
    user_id: int
    provider: Provider
    provider_user_id: str
    provider_username: str | None = None
    status: ProviderStatus
    connected_at: datetime
    last_synced_at: datetime | None = None


class ProviderInstallationResource(BaseModelSerializer):
    user_id: int | None
    provider: Provider
    installation_id: str
    account_login: str
    account_type: str
    permissions: dict[str, Any] | None = None
    last_synced_at: datetime | None = None


class SyncRunResource(BaseModelSerializer):
    user_id: int
    provider: Provider
    provider_installation_id: int | None = None
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    repos: int
    items: int
    facts: int
    warnings: int
    error: str | None = None


class ActivityItemResource(BaseModelSerializer):
    user_id: int
    provider: Provider
    provider_account_id: int | None = None
    repository_id: int | None = None
    provider_item_id: str
    type: str
    occurred_at: datetime
    repo_full_name: str | None = None
    title: str | None = None
    number: int | None = None
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_")


class ScoreSnapshotResource(BaseModelSerializer):
    user_id: int
    period: str
    period_start: date
    period_end: date
    total_score: float
    consistency_score: float
    momentum_score: float
    impact_score: float
    metrics: dict[str, Any] | None = None
    scoring_version: int
    computed_at: datetime


class RepositoryResource(BaseModelSerializer):
    provider: Provider
    provider_repo_id: str
    full_name: str
    name: str
    owner_login: str
    is_private: bool
    default_branch: str | None = None
    archived: bool
    installation_id: int | None = None


class RepoSyncCursorResource(BaseModelSerializer):
    user_id: int
    provider: Provider
    repository_id: int
    cursor_key: str
    cursor_value: datetime


class ActivityFactDailyResource(BaseModelSerializer):
    user_id: int
    provider: Provider
    provider_account_id: int | None = None
    day: date
    metric_key: str
    value: float
    bucket: str
    metadata: dict[str, Any] | None = Field(default=None, validation_alias="metadata_")
