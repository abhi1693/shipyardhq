from __future__ import annotations

from fastapi import Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUserId
from database import get_session
from routers.base import api_prefix
from routers.generics import APIView
from services.clerk_api import ClerkAPIError, delete_clerk_user
from services.installations import get_provider_installations_for_user
from services.logger import AppLogger
from services.schemas.users import ProfileDeleteResponse
from services.users import get_user_by_clerk_id

logger = AppLogger.get_logger(__name__)

Action = APIView.Action


class ProfileDeleteView(APIView):
    actions = (
        Action(
            path="/me",
            methods=["DELETE"],
            handler="delete_profile",
            response_model=ProfileDeleteResponse,
            status_code=202,
            operation_id="profile_delete",
        ),
    )

    def __init__(self) -> None:
        super().__init__(prefix=api_prefix("profiles"), tags=["profiles"])

    async def delete_profile(
        self,
        user_id: CurrentUserId,
        session: Session = Depends(get_session),
    ) -> ProfileDeleteResponse:
        db_user = await get_user_by_clerk_id(session, user_id)
        if db_user:
            installations = await get_provider_installations_for_user(session, db_user.id)
            if installations:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Remove all provider installations before deleting your profile; "
                        "we cannot remove them for you."
                    ),
                )
        try:
            await delete_clerk_user(user_id)
        except RuntimeError as exc:
            logger.error("Profile deletion configuration error.", exc_info=exc)
            raise HTTPException(
                status_code=500,
                detail="Profile deletion configuration error.",
            ) from exc
        except ClerkAPIError as exc:
            logger.error(
                "Profile deletion failed.",
                extra={"status_code": exc.status_code, "path": exc.path},
            )
            raise HTTPException(
                status_code=502,
                detail="Profile deletion failed.",
            ) from exc

        return ProfileDeleteResponse(
            ok=True,
            status="queued",
            message="Profile deletion queued.",
        )


router = ProfileDeleteView().router
