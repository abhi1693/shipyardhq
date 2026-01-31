from __future__ import annotations

from enum import Enum

from services.schemas.base import BaseSerializer
from models import RewardFeatureCategory, RewardRuleCategory, RedemptionStatus


class HomepageFeedView(str, Enum):
    NEW = "new"
    VERIFIED_REVENUE = "verified-revenue"
    MOST_CLICKED = "most-clicked"


class LeaderboardPeriod(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class ProductInterestSignals(BaseSerializer):
    clicks7d: int
    clickVelocityWoW: float
    uniqueVisitors7d: int
    repeatVisits7d: int


class HomepageFeedItem(BaseSerializer):
    id: str
    slug: str
    name: str
    logo: str
    tagline: str
    createdAt: str
    updatedAt: str
    badges: list[str]
    category: str | None = None
    categorySlug: str | None = None
    scoreCount: int | None = None
    updatesCount: int | None = None
    isSponsored: bool
    isVoted: bool
    isVerified: bool
    variant: str | None = None
    latestRevenueCents: int | None = None
    revenueCurrencyCode: str | None = None
    interest: ProductInterestSignals | None = None
    shuffleRank: float


class HomepageFeedPageResult(BaseSerializer):
    items: list[HomepageFeedItem]
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class HomepageFeedAllResult(BaseSerializer):
    items: list[HomepageFeedItem]


class TrafficPoint(BaseSerializer):
    date: str
    pageViews: int
    visitors: int


class LeaderboardStats(BaseSerializer):
    totalProducts: int
    totalCreators: int
    totalUpvotes: int
    topScore: int
    pageViews30: int = 0
    visitors30: int = 0
    trafficSeries: list[TrafficPoint] = []
    realtimeVisitors: int | None = None


class RealtimeVisitors(BaseSerializer):
    visitors: int


class AnalyticsTimeseriesPoint(BaseSerializer):
    date: str
    label: str
    pageViews: int
    uniqueVisitors: int


class AnalyticsReferrer(BaseSerializer):
    referrer: str
    views: int
    share: float


class AnalyticsBrowser(BaseSerializer):
    browser: str
    visitors: int
    share: float


class AnalyticsOperatingSystem(BaseSerializer):
    os: str
    visitors: int
    share: float


class AnalyticsDevice(BaseSerializer):
    deviceCategory: str
    visitors: int
    share: float


class AnalyticsCountry(BaseSerializer):
    country: str
    code: str | None = None
    visitors: int
    share: float


class AnalyticsRegion(BaseSerializer):
    region: str
    country: str | None = None
    code: str | None = None
    visitors: int
    share: float


class AnalyticsCity(BaseSerializer):
    city: str
    region: str | None = None
    country: str | None = None
    code: str | None = None
    visitors: int
    share: float


class AnalyticsTopProductPage(BaseSerializer):
    path: str
    slug: str | None = None
    name: str | None = None
    upvotes: int | None = None
    pageViews: int
    uniqueVisitors: int
    sessions: int
    bounceRate: float
    averageSessionDuration: float
    shareOfViews: float


class AnalyticsSnapshot(BaseSerializer):
    pageViews: int
    uniqueVisitors: int
    sessions: int
    bounceRate: float
    averageSessionDuration: float
    newUsers: int
    engagementRate: float
    pagesPerSession: float
    referrers: list[AnalyticsReferrer]
    timeseries: list[AnalyticsTimeseriesPoint]
    browsers: list[AnalyticsBrowser]
    operatingSystems: list[AnalyticsOperatingSystem]
    devices: list[AnalyticsDevice]
    countries: list[AnalyticsCountry]
    regions: list[AnalyticsRegion]
    cities: list[AnalyticsCity]
    topProductPages: list[AnalyticsTopProductPage]


class AnalyticsVerifiedRevenue(BaseSerializer):
    currency: str
    rangeCents: int
    previousRangeCents: int


class PublicAnalyticsPayload(BaseSerializer):
    snapshot: AnalyticsSnapshot
    previousSnapshot: AnalyticsSnapshot
    realtimeVisitors: int
    verifiedRevenue: AnalyticsVerifiedRevenue


class CategoryHighlight(BaseSerializer):
    id: str
    name: str
    slug: str


class UseCaseHighlight(BaseSerializer):
    id: str
    label: str
    slug: str


class AlternativeHighlight(BaseSerializer):
    id: str
    name: str
    slug: str


class SponsoredProduct(BaseSerializer):
    id: str
    slug: str
    name: str
    tagline: str | None = None
    logo: str | None = None
    bannerImage: str | None = None


class SponsoredPlacementSchedule(BaseSerializer):
    id: str
    slotKey: str
    startsAt: str
    endsAt: str
    redemptionId: str | None = None


class SponsoredPlacement(BaseSerializer):
    id: str
    origin: str
    product: SponsoredProduct
    schedule: SponsoredPlacementSchedule | None = None


class StickyBannerProduct(BaseSerializer):
    id: str
    slug: str
    name: str
    logo: str
    tagline: str | None = None
    latestRevenueCents: int | None = None
    revenueCurrencyCode: str | None = None


class ProductCategorySummary(BaseSerializer):
    name: str | None = None
    slug: str | None = None


class PublicProductCard(BaseSerializer):
    id: str
    slug: str
    name: str
    logo: str
    tagline: str
    category: ProductCategorySummary | None = None
    badges: list[str] = []
    sponsored: bool = False
    isVerified: bool = False
    createdAt: str | None = None
    updatedAt: str | None = None
    latestRevenueCents: int | None = None
    revenueCurrencyCode: str | None = None
    scoreCount: int | None = None
    interest: ProductInterestSignals | None = None


class PublicUserMeta(BaseSerializer):
    firstName: str | None = None
    lastName: str | None = None


class PublicUserSummary(BaseSerializer):
    id: str
    clerkId: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    productCount: int = 0
    latestRevenueCents: int | None = None
    revenueCurrencyCode: str | None = None


class PublicUsersPageResult(BaseSerializer):
    items: list[PublicUserSummary]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class UserProductsPageResult(BaseSerializer):
    items: list[HomepageFeedItem]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class PublicUserProfile(BaseSerializer):
    id: str
    clerkId: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    productCount: int = 0


class RewardsLeaderboardPosition(BaseSerializer):
    rank: int
    totalEligible: int
    lifetimeEarned: int
    launchCount: int


class UserProfileCategoryEntry(BaseSerializer):
    name: str
    count: int


class UserProfileBadgeSummary(BaseSerializer):
    showcase: list[str]
    overflow: int


class UserProfilePayload(BaseSerializer):
    profile: PublicUserProfile
    leaderboardPosition: RewardsLeaderboardPosition | None = None
    productsPage: UserProductsPageResult
    totalProducts: int
    totalUpvotes: int
    totalVerifiedRevenueCents: int
    totalVerifiedRevenueCurrency: str | None = None
    rewardPoints: int
    verifiedCount: int
    categories: list[UserProfileCategoryEntry]
    focusCategories: list[str]
    extraCategoryCount: int
    badges: UserProfileBadgeSummary
    earliestLaunch: str | None = None


class PublicProductUseCase(BaseSerializer):
    slug: str
    label: str


class PublicProductCategoryDetail(BaseSerializer):
    id: str
    name: str
    slug: str
    useCases: list[PublicProductUseCase] = []


class PublicProductUser(BaseSerializer):
    id: str
    clerkId: str | None = None
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    role: str | None = None


class PublicProductMetadata(BaseSerializer):
    demoUrl: str | None = None
    utmCampaign: str | None = None


class PublicProductMedia(BaseSerializer):
    id: str
    imageUrl: str
    altText: str | None = None


class PublicProductAlternative(BaseSerializer):
    id: str
    slug: str
    name: str
    websiteUrl: str
    logoUrl: str | None = None


class PublicProductAnalytics(BaseSerializer):
    upvotes: int | None = None


class PublicProductVerification(BaseSerializer):
    isVerified: bool | None = None


class PublicPlanFeatureAssignment(BaseSerializer):
    key: str
    enabled: bool


class PublicPlanFeature(BaseSerializer):
    id: str
    name: str
    key: str
    description: str
    enabled: bool
    isExperimental: bool


class PublicPlan(BaseSerializer):
    id: str
    name: str
    slug: str
    description: str | None = None
    type: str
    price: int
    discount: float | None = None
    boostForDays: int = 1
    isDefault: bool = False
    externalId: str | None = None
    paymentFrequencyCount: int | None = None
    paymentFrequencyInterval: str | None = None
    subscriptionPeriodCount: int | None = None
    subscriptionPeriodInterval: str | None = None
    productCount: int = 0
    features: list[PublicPlanFeature] = []


class PublicProductDetailPayload(BaseSerializer):
    id: str
    slug: str
    name: str
    tagline: str
    description: str
    websiteUrl: str
    logo: str
    bannerImage: str | None = None
    pricingModel: str | None = None
    startingPriceCents: int | None = None
    currencyCode: str | None = None
    platforms: list[str] = []
    status: str
    type: str | None = None
    publishedAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    keywords: list[str] = []
    category: PublicProductCategoryDetail | None = None
    alternatives: list[PublicProductAlternative] = []
    user: PublicProductUser | None = None
    metadata: PublicProductMetadata | None = None
    analytics: PublicProductAnalytics | None = None
    verification: PublicProductVerification | None = None
    interest: ProductInterestSignals | None = None
    media: list[PublicProductMedia] = []
    badges: list[str] = []
    planAssignments: list[PublicPlanFeatureAssignment] = []
    activeFeatureEntitlements: list[str] = []
    upvotesCount: int | None = None


class PublicProductMetaPayload(BaseSerializer):
    id: str
    slug: str
    name: str
    tagline: str
    description: str
    websiteUrl: str
    logo: str
    bannerImage: str | None = None
    pricingModel: str | None = None
    startingPriceCents: int | None = None
    currencyCode: str | None = None
    platforms: list[str] = []
    status: str
    type: str | None = None
    publishedAt: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    keywords: list[str] = []
    category: ProductCategorySummary | None = None
    user: PublicProductUser | None = None
    metadata: PublicProductMetadata | None = None
    analytics: PublicProductAnalytics | None = None
    verification: PublicProductVerification | None = None
    media: list[PublicProductMedia] = []
    planAssignments: list[PublicPlanFeatureAssignment] = []
    activeFeatureEntitlements: list[str] = []


class PublicProductUpvoteState(BaseSerializer):
    upvoted: bool
    upvotes: int


class PublicProductLeaderboardScore(BaseSerializer):
    points: int
    rank: int | None = None
    available: bool = False


class ProductRevenuePoint(BaseSerializer):
    periodStart: str
    label: str
    allTimeRevenueCents: int
    periodRevenueCents: int


class ProductRevenueSummary(BaseSerializer):
    currencyCode: str
    lastSyncedAt: str | None = None
    status: str | None = None
    provider: str | None = None
    latestAllTimeRevenueCents: int
    points: list[ProductRevenuePoint] = []


class LeaderboardArchiveMonth(BaseSerializer):
    year: int
    month: int


class LeaderboardArchiveWeek(BaseSerializer):
    year: int
    week: int


class LeaderboardArchive(BaseSerializer):
    months: list[LeaderboardArchiveMonth] = []
    weeks: list[LeaderboardArchiveWeek] = []


class LeaderboardPageFilters(BaseSerializer):
    categorySlug: str | None = None
    limit: int
    verifiedRevenueOnly: bool = False


class LeaderboardPagePayload(BaseSerializer):
    filters: LeaderboardPageFilters
    stats: LeaderboardStats
    categories: list["CategorySummary"]
    products: list[PublicProductCard]
    categoryName: str | None = None


class PeriodicLeaderboardPayload(BaseSerializer):
    period: LeaderboardPeriod
    periodLabel: str
    periodStart: str
    periodEnd: str
    products: list[PublicProductCard]
    archive: LeaderboardArchive


class MonthlyLeaderboardMonth(BaseSerializer):
    month: str
    label: str


class MonthlyLeaderboardProductAnalytics(BaseSerializer):
    upvotes: int | None = None


class MonthlyLeaderboardProductCategory(BaseSerializer):
    name: str | None = None
    slug: str | None = None


class MonthlyLeaderboardProductUser(BaseSerializer):
    firstName: str | None = None
    lastName: str | None = None


class MonthlyLeaderboardProduct(BaseSerializer):
    id: str
    slug: str
    name: str
    tagline: str
    logo: str | None = None
    analytics: MonthlyLeaderboardProductAnalytics | None = None
    category: MonthlyLeaderboardProductCategory | None = None
    user: MonthlyLeaderboardProductUser | None = None
    latestRevenueCents: int | None = None
    revenueCurrencyCode: str | None = None


class MonthlyLeaderboardRanking(BaseSerializer):
    id: str
    rank: int | None = None
    score: int | None = None
    upvotes: int | None = None
    product: MonthlyLeaderboardProduct


class MonthlyLeaderboardPayload(BaseSerializer):
    month: str
    label: str
    rankings: list[MonthlyLeaderboardRanking]


class PublicRewardsStatsWindow(BaseSerializer):
    rewardAmount: int
    transactions: int


class PublicRewardsSpentWindow(BaseSerializer):
    rewardAmount: int
    redemptions: int


class PublicRewardsStats(BaseSerializer):
    membersWithRewards: int
    activeBalances: int
    earnedLast30d: PublicRewardsStatsWindow
    spentLast30d: PublicRewardsSpentWindow


class PublicRewardsRule(BaseSerializer):
    id: str
    name: str
    description: str | None = None
    category: RewardRuleCategory
    baseRewardAmount: int
    dailyCap: int | None = None
    lifetimeCap: int | None = None
    totalAwarded: int
    awardCount: int


class PublicRewardsReward(BaseSerializer):
    featureKey: str
    name: str
    description: str | None = None
    category: RewardFeatureCategory
    baseCost: int
    durationSeconds: int | None = None
    requiresProduct: bool
    maxActivePerUser: int | None = None
    maxPendingPerUser: int | None = None
    redemptionCount: int


class PublicRewardsRedemption(BaseSerializer):
    id: str
    featureKey: str
    name: str | None = None
    productName: str | None = None
    productSlug: str | None = None
    cost: int
    status: RedemptionStatus
    createdAt: str


class PublicRewardsData(BaseSerializer):
    stats: PublicRewardsStats
    rules: list[PublicRewardsRule]
    rewards: list[PublicRewardsReward]
    recentRedemptions: list[PublicRewardsRedemption]


class RewardsLeaderboardEntry(BaseSerializer):
    userId: str
    balance: int
    lifetimeEarned: int
    lifetimeSpent: int
    lifetimeAdjusted: int
    lifetimeRefunded: int
    currentStreakCount: int
    longestStreakCount: int
    lastEarnedAt: str | None = None
    lastRedeemedAt: str | None = None
    displayName: str
    initials: str
    avatarUrl: str | None = None
    launchCount: int


class RewardsLeaderboardPageResult(BaseSerializer):
    items: list[RewardsLeaderboardEntry]
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None
    total: int


class CategorySummary(BaseSerializer):
    id: str
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    count: int = 0


class CategoryProductsPageResult(BaseSerializer):
    items: list[HomepageFeedItem]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class CategoryDetailPayload(BaseSerializer):
    category: CategorySummary
    productsPage: CategoryProductsPageResult


class CategoryTrendsPayload(BaseSerializer):
    category: CategorySummary
    items: list[PublicProductCard]
    total: int


class UseCaseSummary(BaseSerializer):
    id: str
    label: str
    slug: str
    productCount: int = 0


class UseCaseMeta(BaseSerializer):
    id: str
    label: str
    slug: str
    createdAt: str
    updatedAt: str
    productCount: int = 0


class UseCaseDetailPayload(BaseSerializer):
    useCase: UseCaseMeta
    categories: list[CategorySummary]
    productCount: int


class BrowseFilters(BaseSerializer):
    useCase: str | None = None
    category: str | None = None
    verified: bool = False
    sort: str = HomepageFeedView.NEW.value
    page: int = 1
    pageSize: int = 20
    query: str | None = None
    platform: str | None = None
    pricingModel: str | None = None
    productType: str | None = None


class BrowseProductsPageResult(BaseSerializer):
    items: list[PublicProductCard]
    hasMore: bool
    page: int
    pageSize: int
    total: int


class VerifiedRevenueProductsPageResult(BaseSerializer):
    items: list[HomepageFeedItem]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class BrowsePagePayload(BaseSerializer):
    filters: BrowseFilters
    products: list[PublicProductCard]
    hasMore: bool
    total: int
    useCases: list[UseCaseSummary]
    categories: list[CategorySummary]
    filterSummary: list[str]
    hasActiveFilters: bool


class CategoriesDirectoryPayload(BaseSerializer):
    categories: list[CategorySummary]
    highlightCategories: list[CategorySummary]
    categoryCount: int
    totalProducts: int
    averagePerCategory: int


class UseCasesDirectoryPayload(BaseSerializer):
    useCases: list[UseCaseSummary]
    highlightUseCases: list[UseCaseSummary]
    useCaseCount: int
    totalProducts: int
    averagePerUseCase: int


class TagSummary(BaseSerializer):
    keyword: str
    canonical: str
    hash: str
    slug: str
    productCount: int
    lastUpdated: str | None = None


class TagProductsPageResult(BaseSerializer):
    summary: TagSummary
    items: list[PublicProductCard]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class TagDetailPayload(BaseSerializer):
    summary: TagSummary
    productsPage: TagProductsPageResult


class TagDirectoryPageResult(BaseSerializer):
    items: list[TagSummary]
    hasMore: bool
    total: int | None = None
    page: int
    pageSize: int


class AlternativeCatalogItem(BaseSerializer):
    id: str
    name: str
    slug: str
    description: str
    websiteUrl: str
    logoUrl: str
    productCount: int


class AlternativeDetailSummary(BaseSerializer):
    id: str
    name: str
    slug: str
    description: str
    websiteUrl: str
    logoUrl: str
    productCount: int


class AlternativeProductsPageResult(BaseSerializer):
    items: list[PublicProductCard]
    total: int
    page: int
    pageSize: int
    hasMore: bool
    nextPage: int | None = None


class AlternativeDetailPayload(BaseSerializer):
    alternative: AlternativeDetailSummary
    productsPage: AlternativeProductsPageResult
    featuredAlternatives: list[AlternativeCatalogItem] = []


class AlternativeCatalogPageResult(BaseSerializer):
    items: list[AlternativeCatalogItem]
    hasMore: bool
    nextPage: int | None = None
    page: int
    pageSize: int
