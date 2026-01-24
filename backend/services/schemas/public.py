from __future__ import annotations

from enum import Enum

from services.schemas.base import BaseSerializer


class HomepageFeedView(str, Enum):
    NEW = "new"
    VERIFIED_REVENUE = "verified-revenue"
    MOST_CLICKED = "most-clicked"


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
