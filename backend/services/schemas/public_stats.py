from __future__ import annotations

from services.schemas.base import BaseSerializer


class PublicStatsResponse(BaseSerializer):
    users: int
    repos: int
    activities: int
    installations: int
