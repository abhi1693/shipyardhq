from __future__ import annotations

from services.schemas.base import BaseSerializer


class MemberActiveUser(BaseSerializer):
    id: str
    email: str | None = None
    role: str | None = None
    status: str
    firstName: str | None = None
    lastName: str | None = None
    onboardedAt: str | None = None


class MemberSyncProfileInput(BaseSerializer):
    email: str | None = None
    firstName: str | None = None
    lastName: str | None = None


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


class MemberFeedbackCreateInput(BaseSerializer):
    subject: str | None = None
    message: str
    rating: int | None = None


class MemberFeedbackListItem(BaseSerializer):
    id: str
    subject: str | None = None
    message: str
    rating: int | None = None
    status: str
    adminNote: str | None = None
    rewardEligible: bool = False
    rewardGrantedAt: str | None = None
    createdAt: str
    updatedAt: str


class MemberOverviewProduct(BaseSerializer):
    id: str
    slug: str


class MemberOverviewContextPayload(BaseSerializer):
    rangeDays: int
    products: list[MemberOverviewProduct]
    upvoteDates: list[str]


class MemberOnboardingCompleteInput(BaseSerializer):
    roleIntent: str | None = None
    heardFrom: str | None = None
    email: str | None = None
    firstName: str | None = None
    lastName: str | None = None


class MemberOnboardingCompletePayload(BaseSerializer):
    firstTimeOnboarding: bool
    user: MemberActiveUser


class MemberFeatureAccessPayload(BaseSerializer):
    featureKey: str
    hasAccess: bool
