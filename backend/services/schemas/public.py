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
