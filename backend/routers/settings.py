from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser, CurrentUserId
from database import get_session
from routers.base import api_prefix
from routers.generics import APIView, NonModelRetrieveAPIView
from services.handles import normalize_handle, validate_handle
from services.installations import get_provider_installations_for_user
from services.providers import get_provider_accounts_for_user
from services.settings import get_or_create_user_settings
from services.schemas.providers import (
    ProviderAccountSummary,
    ProviderInstallationSummary,
)
from services.schemas.users import (
    HandleAvailabilityResponse,
    SettingsUpdateRequest,
    SettingsUpdateResponse,
    SettingsSummaryResponse,
    UserSettingsResponse,
)
from services.users import get_user_by_handle


Action = APIView.Action


def build_settings_response(settings) -> UserSettingsResponse:
    return UserSettingsResponse(
        profile_public=settings.profile_public,
        include_in_leaderboard=settings.include_in_leaderboard,
        show_repos=settings.show_repos,
        show_commits=settings.show_commits,
        country=settings.country,
    )


class SettingsUpdateView(APIView):
    actions = (
        Action(
            path="",
            methods=["PATCH"],
            handler="update_settings",
            response_model=SettingsUpdateResponse,
            responses={
                400: {"model": SettingsUpdateResponse},
                409: {"model": SettingsUpdateResponse},
            },
        ),
    )

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("settings"), tags=["settings"])

    async def update_settings(
        self,
        payload: SettingsUpdateRequest,
        response: Response,
        current_user: CurrentUser,
        session: Session = Depends(get_session),
    ):
        settings = await get_or_create_user_settings(session, current_user.id)
        updated = False
        handle_changed = False
        country_changed = False
        include_in_leaderboard_changed = False
        profile_public_changed = False

        if payload.handle is not None:
            handle = normalize_handle(payload.handle)
            validation_error = validate_handle(handle)
            if validation_error:
                if response:
                    response.status_code = 400
                return SettingsUpdateResponse(
                    ok=False,
                    error=validation_error,
                    settings=build_settings_response(settings),
                )
            if current_user.handle != handle:
                current_user.handle = handle
                updated = True
                handle_changed = True

        if payload.profile_public is not None:
            if settings.profile_public != payload.profile_public:
                settings.profile_public = payload.profile_public
                updated = True
                profile_public_changed = True
        if payload.include_in_leaderboard is not None:
            if settings.include_in_leaderboard != payload.include_in_leaderboard:
                settings.include_in_leaderboard = payload.include_in_leaderboard
                updated = True
                include_in_leaderboard_changed = True
        if payload.show_repos is not None:
            if settings.show_repos != payload.show_repos:
                settings.show_repos = payload.show_repos
                updated = True
        if payload.show_commits is not None:
            if settings.show_commits != payload.show_commits:
                settings.show_commits = payload.show_commits
                updated = True
        if payload.country is not None:
            country_value = payload.country.strip().lower()
            normalized_country = country_value if country_value else None
            if settings.country != normalized_country:
                settings.country = normalized_country
                updated = True
                country_changed = True

        if not updated:
            return SettingsUpdateResponse(
                ok=True,
                settings=build_settings_response(settings),
            )

        try:
            session.add(settings)
            session.add(current_user)
            await session.commit()
        except IntegrityError:
            await session.rollback()
            if response:
                response.status_code = 409
            return SettingsUpdateResponse(
                ok=False,
                error="That handle is already taken.",
                settings=build_settings_response(settings),
            )

        await session.refresh(settings)
        if (
            handle_changed
            or country_changed
            or include_in_leaderboard_changed
            or profile_public_changed
        ):
            from services.sync_scheduler import enqueue_leaderboard_refresh

            for period in ("daily", "weekly", "monthly"):
                await enqueue_leaderboard_refresh(period)
        return SettingsUpdateResponse(
            ok=True,
            settings=build_settings_response(settings),
        )


class SettingsSummaryDetailView(NonModelRetrieveAPIView):
    serializer_class = SettingsSummaryResponse

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("settings"), tags=["settings"])

    def get_detail_path(self) -> str:
        return ""

    async def retrieve(
        self,
        current_user: CurrentUser,
        session: Session = Depends(get_session),
    ):
        accounts = await get_provider_accounts_for_user(session, current_user.id)
        installations = await get_provider_installations_for_user(session, current_user.id)
        settings = await get_or_create_user_settings(session, current_user.id)

        return SettingsSummaryResponse(
            ok=True,
            handle=current_user.handle,
            settings=build_settings_response(settings),
            provider_accounts=[
                ProviderAccountSummary.from_model(account)
                for account in accounts
            ],
            provider_installations=[
                ProviderInstallationSummary.from_model(installation)
                for installation in installations
            ],
        )


class HandleAvailabilityDetailView(NonModelRetrieveAPIView):
    serializer_class = HandleAvailabilityResponse

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("settings"), tags=["settings"])

    def get_detail_path(self) -> str:
        return "/handle/availability"

    async def retrieve(
        self,
        handle: str,
        response: Response,
        user_id: CurrentUserId,
        session: Session = Depends(get_session),
    ):
        normalized = normalize_handle(handle)
        validation_error = validate_handle(normalized)
        if validation_error:
            if response:
                response.status_code = 400
            return HandleAvailabilityResponse(
                ok=False,
                handle=normalized or None,
                available=False,
                error=validation_error,
            )

        existing = await get_user_by_handle(session, normalized)
        available = existing is None or existing.clerk_id == user_id
        return HandleAvailabilityResponse(
            ok=True,
            handle=normalized,
            available=available,
        )


router = APIRouter()
router.include_router(SettingsUpdateView().router)
router.include_router(SettingsSummaryDetailView().router)
router.include_router(HandleAvailabilityDetailView().router)
