from __future__ import annotations

from datetime import date as Date

from fastapi import APIRouter, Depends, Query, Request
from fastapi.encoders import jsonable_encoder
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from routers.base import api_prefix
from routers.generics import ListAPIView, NonModelListAPIView
from services.cache import cached_json
from services.display import format_score
from services.leaderboards import (
    LEADERBOARD_LIST_CACHE_PREFIX,
    LEADERBOARD_SCOPE_CACHE_PREFIX,
    build_leaderboard_queryset,
    build_leaderboard_scope,
    get_leaderboard_countries,
    get_leaderboard_languages,
    get_leaderboard_window,
    resolve_leaderboard_period,
)
from services.scoring import to_utc_datetime
from services.schemas.leaderboard import (
    LeaderboardEntry,
    LeaderboardScopeOption,
    LeaderboardUser,
)
from services.rate_limit import public_rate_limit
from models import LeaderboardEntryRecord
from settings import get_settings

settings = get_settings()


class LeaderboardListView(ListAPIView):
    model = LeaderboardEntryRecord
    serializer_class = LeaderboardEntry
    page_size = 25
    max_page_size = 200
    filterset_fields: set[str] = set()

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("leaderboards"), tags=["leaderboards"])

    async def list(
        self,
        request: Request,
        _: None = Depends(public_rate_limit),
        q: str | None = Query(default=None),
        period: str | None = Query(default=None),
        anchor_date: Date | None = Query(
            default=None,
            alias="date",
            description="Anchor date for the requested leaderboard window.",
        ),
        scope: str | None = Query(default=None),
        country: str | None = Query(default=None),
        language: str | None = Query(default=None),
        limit: int | None = Query(default=None, ge=1, le=200),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        request.state.period = period
        request.state.anchor_date = anchor_date
        request.state.scope = scope
        request.state.country = country
        request.state.language = language
        if limit is not None:
            page_size = limit

        async def build_response():
            return await super(LeaderboardListView, self).list(
                request=request,
                q=q,
                session=session,
                page=page,
                limit=limit,
                page_size=page_size,
            )

        return await cached_json(
            LEADERBOARD_LIST_CACHE_PREFIX,
            ttl_seconds=settings.leaderboard_cache_ttl_seconds,
            path=request.url.path,
            params=request.query_params.multi_items(),
            builder=build_response,
            encoder=jsonable_encoder,
        )

    def get_queryset(self, session: Session, *, request: Request | None = None):
        period_param = None
        anchor_date = None
        scope_param = None
        country = None
        language = None
        if request:
            period_param = getattr(request.state, "period", None)
            anchor_date = getattr(request.state, "anchor_date", None)
            scope_param = getattr(request.state, "scope", None)
            country = getattr(request.state, "country", None)
            language = getattr(request.state, "language", None)
        period_value = resolve_leaderboard_period(period_param)
        anchor_datetime = to_utc_datetime(anchor_date) if anchor_date else None
        window = get_leaderboard_window(period_value, now=anchor_datetime)
        scope_value, scope_metadata = build_leaderboard_scope(
            scope_param,
            country=country,
            language=language,
        )
        return build_leaderboard_queryset(window, scope=scope_value)

    def serialize(self, obj, *, request: Request | None = None):
        user = getattr(obj, "user", None)
        handle = user.handle if user and user.handle else "unknown"
        return LeaderboardEntry(
            id=obj.id,
            created_at=obj.created_at,
            updated_at=obj.updated_at,
            period=obj.period,
            period_start=obj.period_start,
            period_end=obj.period_end,
            scope=obj.scope,
            scope_metadata=obj.scope_metadata,
            total_score=obj.total_score,
            score_display=format_score(obj.total_score),
            rank=obj.rank,
            user=LeaderboardUser(
                id=user.id if user else None,
                created_at=user.created_at if user else None,
                updated_at=user.updated_at if user else None,
                handle=handle,
                display_name=user.display_name if user else None,
                avatar_url=user.avatar_url if user else None,
            ),
        )


class LeaderboardLanguageListView(NonModelListAPIView):
    serializer_class = LeaderboardScopeOption
    page_size = 200
    search_fields = {"value"}

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("leaderboards"), tags=["leaderboards"])

    def get_list_path(self) -> str:
        return "/languages"

    async def list(
        self,
        request: Request,
        _: None = Depends(public_rate_limit),
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        async def build_response():
            return await super(LeaderboardLanguageListView, self).list(
                request=request,
                q=q,
                session=session,
                page=page,
                limit=limit,
                page_size=page_size,
            )

        return await cached_json(
            LEADERBOARD_SCOPE_CACHE_PREFIX,
            ttl_seconds=settings.leaderboard_scope_cache_ttl_seconds,
            path=request.url.path,
            params=request.query_params.multi_items(),
            builder=build_response,
            encoder=jsonable_encoder,
        )

    async def get_queryset(self, session: Session, *, request: Request | None = None):
        languages = await get_leaderboard_languages(session)
        return [{"value": language} for language in languages]


class LeaderboardCountryListView(NonModelListAPIView):
    serializer_class = LeaderboardScopeOption
    page_size = 200
    search_fields = {"value"}

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("leaderboards"), tags=["leaderboards"])

    def get_list_path(self) -> str:
        return "/countries"

    async def list(
        self,
        request: Request,
        _: None = Depends(public_rate_limit),
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        async def build_response():
            return await super(LeaderboardCountryListView, self).list(
                request=request,
                q=q,
                session=session,
                page=page,
                limit=limit,
                page_size=page_size,
            )

        return await cached_json(
            LEADERBOARD_SCOPE_CACHE_PREFIX,
            ttl_seconds=settings.leaderboard_scope_cache_ttl_seconds,
            path=request.url.path,
            params=request.query_params.multi_items(),
            builder=build_response,
            encoder=jsonable_encoder,
        )

    async def get_queryset(self, session: Session, *, request: Request | None = None):
        countries = await get_leaderboard_countries(session)
        return [{"value": country} for country in countries]


router = APIRouter()
router.include_router(LeaderboardListView().router)
router.include_router(LeaderboardLanguageListView().router)
router.include_router(LeaderboardCountryListView().router)
