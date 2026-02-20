from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser
from database import get_session
from models import PlanType, Product
from routers.base import api_prefix
from services.schemas.member import (
    MemberManageablePlanSummary,
    MemberManageableProductPayload,
    MemberManageableProductSummary,
)

router = APIRouter(prefix=api_prefix("member"), tags=["member"])


def _map_manageable_plan(product: Product) -> MemberManageablePlanSummary | None:
    plan = product.plan
    if not plan:
        return None
    return MemberManageablePlanSummary(
        id=str(plan.id),
        name=plan.name,
        type=plan.type.value if plan.type else PlanType.ONE_TIME_PRICE.value,
        price=plan.price,
        isDefault=bool(plan.is_default),
    )


@router.get("/products/{slug}/manageable", response_model=MemberManageableProductPayload)
async def get_manageable_product(
    slug: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberManageableProductPayload:
    stmt = (
        select(Product)
        .where(Product.slug == slug)
        .options(selectinload(Product.plan))
    )
    product = (await session.exec(stmt)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    if product.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    return MemberManageableProductPayload(
        product=MemberManageableProductSummary(
            id=str(product.id),
            name=product.name,
            slug=product.slug,
            userId=str(product.user_id),
            currentPlan=_map_manageable_plan(product),
        )
    )
