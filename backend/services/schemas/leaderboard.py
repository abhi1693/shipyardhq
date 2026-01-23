from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import Field

from services.schemas.base import BaseModelSerializer, BaseSerializer
from services.schemas.profile import PeriodWindowResponse


class LeaderboardUser(BaseModelSerializer):
    handle: str
    display_name: str | None = Field(default=None, validation_alias="displayName")
    avatar_url: str | None = Field(default=None, validation_alias="avatarUrl")


class LeaderboardEntry(BaseModelSerializer):
    id: int
    period: str | None = None
    period_start: date | None = None
    period_end: date | None = None
    scope: str | None = None
    scope_metadata: dict[str, Any] | None = Field(default=None, validation_alias="scopeMetadata")
    total_score: float = Field(validation_alias="totalScore")
    score_display: str
    rank: int
    user: LeaderboardUser


class LeaderboardResponse(BaseSerializer):
    ok: bool
    period: str
    period_label: str
    window: PeriodWindowResponse
    entries: list[LeaderboardEntry]


class LeaderboardScopeOption(BaseSerializer):
    value: str
