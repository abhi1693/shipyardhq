from __future__ import annotations

from services.schemas.base import BaseSerializer


class MemberManageablePlanSummary(BaseSerializer):
    id: str
    name: str
    type: str
    price: int
    isDefault: bool = False


class MemberManageableProductSummary(BaseSerializer):
    id: str
    name: str
    slug: str
    userId: str
    currentPlan: MemberManageablePlanSummary | None = None


class MemberManageableProductPayload(BaseSerializer):
    product: MemberManageableProductSummary
