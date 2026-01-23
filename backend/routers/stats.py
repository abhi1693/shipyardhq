from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from fastapi.encoders import jsonable_encoder
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from routers.base import api_prefix
from services.cache import cached_json
from services.public_stats import build_public_stats
from services.rate_limit import public_rate_limit
from services.schemas.public_stats import PublicStatsResponse
from settings import get_settings

PUBLIC_STATS_CACHE_PREFIX = "public-stats"

router = APIRouter(prefix=api_prefix("stats"), tags=["stats"])
settings = get_settings()


@router.get("/landing", response_model=PublicStatsResponse)
async def landing_stats(
    request: Request,
    _: None = Depends(public_rate_limit),
    session: Session = Depends(get_session),
) -> PublicStatsResponse:
    async def build_response() -> PublicStatsResponse:
        return await build_public_stats(session)

    return await cached_json(
        PUBLIC_STATS_CACHE_PREFIX,
        ttl_seconds=settings.redis_cache_default_ttl_seconds,
        path=request.url.path,
        params=request.query_params.multi_items(),
        builder=build_response,
        encoder=jsonable_encoder,
    )
