from __future__ import annotations

from datetime import datetime

from pydantic import Field

from models import Provider
from services.schemas.base import BaseModelSerializer, BaseSerializer


class SyncRunSummary(BaseModelSerializer):
    id: int
    provider: Provider
    status: str
    started_at: datetime = Field(validation_alias="startedAt")
    finished_at: datetime | None = Field(default=None, validation_alias="finishedAt")
    repos: int
    items: int
    facts: int
    warnings: int
    error: str | None = None


class LatestSyncRunResponse(BaseSerializer):
    ok: bool
    sync_run: SyncRunSummary | None = Field(default=None, validation_alias="syncRun")
