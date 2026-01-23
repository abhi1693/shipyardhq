from fastapi import APIRouter

from auth import CurrentUserId

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(user_id: CurrentUserId) -> dict[str, str]:
    return {"clerk_id": user_id}
