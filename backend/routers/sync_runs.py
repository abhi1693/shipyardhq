from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser, CurrentUserId
from database import get_session
from integrations.registry import get_provider_adapter
from models import SyncRun
from routers.base import api_prefix
from routers.generics import (
    ListAPIView,
    NonModelRetrieveAPIView,
    UserProviderScopedListRetrieveAPIView,
)
from services.schemas.resources import SyncRunResource
from services.schemas.sync_runs import LatestSyncRunResponse, SyncRunSummary
from services.sync_runs import get_latest_sync_run_for_user
from services.users import get_user_by_clerk_id


def resolve_provider_value(provider: str):
    adapter = get_provider_adapter(provider)
    return adapter.provider


async def build_latest_sync_run_response(
    session: Session,
    provider: str,
    user_id: str,
) -> LatestSyncRunResponse:
    provider_value = resolve_provider_value(provider)
    db_user = await get_user_by_clerk_id(session, user_id)
    if not db_user:
        return LatestSyncRunResponse(ok=True, sync_run=None)
    latest = await get_latest_sync_run_for_user(session, db_user.id, provider_value)
    if not latest:
        return LatestSyncRunResponse(ok=True, sync_run=None)
    return LatestSyncRunResponse(
        ok=True,
        sync_run=SyncRunSummary.from_model(latest),
    )


class SyncRunsBaseListView(ListAPIView):
    model = SyncRun
    serializer_class = SyncRunResource
    filterset_exclude: set[str] = {"user_id", "provider"}

    def __init__(self) -> None:
        super().__init__(
            prefix=api_prefix("providers", "{provider}", "runs"),
            tags=["sync-runs"],
        )

    def resolve_provider(self, provider: str):
        return resolve_provider_value(provider)

    def get_queryset(self, session: Session, *, request: Request | None = None):
        queryset = select(self.model).order_by(self.model.started_at.desc())
        if not request:
            return queryset
        user_id = getattr(request.state, "user_id", None)
        provider_param = request.path_params.get("provider")
        provider_value = self.resolve_provider(provider_param) if provider_param else None
        if user_id is not None:
            queryset = queryset.where(self.model.user_id == user_id)
        if provider_value is not None:
            queryset = queryset.where(self.model.provider == provider_value)
        run_id = getattr(request.state, "run_id", None)
        if run_id is not None:
            queryset = queryset.where(self.model.id == run_id)
        return queryset


class SyncRunsListView(SyncRunsBaseListView):
    async def list(
        self,
        provider: str,
        request: Request,
        current_user: CurrentUser,
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        request.state.user_id = current_user.id
        return await super().list(
            request=request,
            q=q,
            session=session,
            page=page,
            limit=limit,
            page_size=page_size,
        )


class SyncRunsDetailView(UserProviderScopedListRetrieveAPIView):
    model = SyncRun
    serializer_class = SyncRunResource

    def __init__(self) -> None:
        super().__init__(
            prefix=api_prefix("providers", "{provider}", "runs"),
            tags=["sync-runs"],
        )

    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_detail_path(),
            self.retrieve,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )

    def resolve_provider(self, provider: str):
        return resolve_provider_value(provider)

    def get_queryset(self, session: Session, *, request: Request | None = None):
        return select(self.model).order_by(self.model.started_at.desc())


class LatestSyncRunDetailView(NonModelRetrieveAPIView):
    serializer_class = LatestSyncRunResponse

    def __init__(self) -> None:
        super().__init__(
            prefix=api_prefix("providers", "{provider}", "runs"),
            tags=["sync-runs"],
        )

    def get_detail_path(self) -> str:
        return "/latest"

    async def retrieve(
        self,
        provider: str,
        user_id: CurrentUserId,
        session: Session = Depends(get_session),
    ):
        return await build_latest_sync_run_response(session, provider, user_id)


router = APIRouter()
router.include_router(SyncRunsListView().router)
router.include_router(LatestSyncRunDetailView().router)
router.include_router(SyncRunsDetailView().router)
