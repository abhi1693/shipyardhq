from __future__ import annotations

from typing import Any

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


class MemberOverviewSummaryPoint(BaseSerializer):
    date: str
    label: str
    views: int
    uniqueVisitors: int


class MemberOverviewSummaryPayload(BaseSerializer):
    rangeDays: int
    totalViews: int
    uniqueVisitors: int
    upvotesInRange: int
    viewsOverTime: list[MemberOverviewSummaryPoint]


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


class MemberProductCategorySummary(BaseSerializer):
    id: str
    name: str
    slug: str


class MemberProductPlanSummary(BaseSerializer):
    id: str
    name: str


class MemberProductVerificationSummary(BaseSerializer):
    isVerified: bool = False


class MemberProductAnalyticsSummary(BaseSerializer):
    upvotes: int = 0


class MemberProductListItem(BaseSerializer):
    id: str
    name: str
    slug: str
    logo: str
    userId: str
    status: str
    createdAt: str | None = None
    updatedAt: str | None = None
    category: MemberProductCategorySummary | None = None
    plan: MemberProductPlanSummary | None = None
    verification: MemberProductVerificationSummary | None = None
    analytics: MemberProductAnalyticsSummary | None = None
    canDelete: bool = False
    canViewAnalytics: bool = False


class MemberProductsListPayload(BaseSerializer):
    products: list[MemberProductListItem]
    total: int
    page: int
    limit: int


class MemberOwnedProductSummary(BaseSerializer):
    id: str
    name: str
    slug: str
    userId: str
    status: str
    planAssignedAt: str | None = None
    currentPlan: MemberManageablePlanSummary | None = None


class MemberOwnedProductPayload(BaseSerializer):
    product: MemberOwnedProductSummary


class MemberSetProductPlanInput(BaseSerializer):
    planId: str | None = None
    subscriptionId: str | None = None


class MemberSuccessPayload(BaseSerializer):
    success: bool = True


class MemberProductConnectorPayload(BaseSerializer):
    id: str
    provider: str | None = None
    status: str | None = None
    lastSyncedAt: str | None = None
    lastSyncError: str | None = None
    latestAllTimeRevenueCents: int | None = None
    latestCurrencyCode: str | None = None
    latestPeriodStart: str | None = None
    config: dict[str, Any] | None = None
    keyHint: str | None = None
    accountId: str | None = None
    brandId: str | None = None


class MemberRewardsBalancePayload(BaseSerializer):
    balance: int
    lifetimeEarned: int
    lifetimeSpent: int
    lifetimeAdjusted: int
    currentStreakCount: int
    longestStreakCount: int
    currentStreakTier: str | None = None
    streakActiveThrough: str | None = None
    lastEarnedAt: str | None = None
    lastRedeemedAt: str | None = None


class MemberRewardTransactionPayload(BaseSerializer):
    id: str
    type: str
    rewardAmount: int
    balanceAfter: int
    createdAt: str | None = None
    ruleKey: str | None = None
    ruleName: str | None = None
    rewardKey: str | None = None
    rewardName: str | None = None
    productId: str | None = None
    productName: str | None = None
    metadata: dict[str, Any] | None = None
    notes: str | None = None
    adjustmentAmount: float | None = None


class MemberRewardCatalogItemPayload(BaseSerializer):
    id: str
    featureKey: str
    planFeatureKey: str | None = None
    name: str
    description: str | None = None
    category: str
    baseCost: int
    durationSeconds: int | None = None
    isActive: bool = True
    maxActivePerUser: int | None = None
    maxPendingPerUser: int | None = None
    requiresProduct: bool = False
    metadata: dict[str, Any] | None = None
    canAfford: bool = False
    canRedeem: bool = False
    reasons: list[str]
    activeCount: int
    pendingCount: int
    requiresSchedule: bool = False


class MemberActiveEntitlementPayload(BaseSerializer):
    id: str
    featureKey: str
    name: str
    status: str
    startsAt: str | None = None
    expiresAt: str | None = None
    productId: str | None = None
    productName: str | None = None
    productSlug: str | None = None


class MemberRecentRedemptionPayload(BaseSerializer):
    id: str
    featureKey: str
    name: str
    status: str
    cost: int
    createdAt: str | None = None
    startsAt: str | None = None
    activatedAt: str | None = None
    expiresAt: str | None = None
    productId: str | None = None
    productName: str | None = None
    productSlug: str | None = None
    placementStatus: str | None = None


class MemberRewardProductOptionPayload(BaseSerializer):
    id: str
    name: str
    slug: str
    status: str


class MemberRewardsSnapshotPayload(BaseSerializer):
    balance: MemberRewardsBalancePayload
    transactions: list[MemberRewardTransactionPayload]
    catalog: list[MemberRewardCatalogItemPayload]
    activeEntitlements: list[MemberActiveEntitlementPayload]
    recentRedemptions: list[MemberRecentRedemptionPayload]
    productOptions: list[MemberRewardProductOptionPayload]


class MemberRewardsRedeemInput(BaseSerializer):
    featureKey: str
    productId: str | None = None
    notes: str | None = None
    slotKey: str | None = None


class MemberRewardsRedeemPayload(BaseSerializer):
    success: bool
    redemptionId: str
    balanceAfter: int
    message: str


class MemberClaimableProductPayload(BaseSerializer):
    id: str
    name: str
    slug: str
    websiteUrl: str
    domain: str
    expectedTxt: str


class MemberClaimableProductsPayload(BaseSerializer):
    products: list[MemberClaimableProductPayload]


class MemberClaimDnsConfirmPayload(BaseSerializer):
    success: bool = True
    lockExpiresAt: str | None = None


class MemberClaimOtpRequestInput(BaseSerializer):
    email: str
    code: str | None = None
    otpHash: str | None = None
    otpExpiresAt: str | None = None


class MemberClaimOtpRequestPayload(BaseSerializer):
    success: bool = True
    expiresAt: str | None = None
    domain: str
    productName: str


class MemberClaimOtpVerifyInput(BaseSerializer):
    code: str | None = None
    otpHash: str | None = None


class MemberClaimOtpVerifyPayload(BaseSerializer):
    success: bool = True
    slug: str
    previousOwnerId: str | None = None
