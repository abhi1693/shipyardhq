from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
import asyncio
import calendar
import hashlib
import random
import re
from typing import Sequence
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, exists, func, or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUserId, OptionalUserId
from database import get_session
from models import (
    AnalyticsDataSource,
    AlternativeProduct,
    AlternativeProductCategoryLink,
    Category,
    FeatureEntitlementStatus,
    LeaderboardRun,
    PaymentConnector,
    PaymentConnectorStatus,
    PaymentRevenueSnapshot,
    Plan,
    PlanFeature,
    PlanFeatureAssignment,
    PlacementSchedule,
    PlacementStatus,
    Platform,
    Product,
    ProductAlternativeProductLink,
    ProductAnalytics,
    ProductBadge,
    ProductLeaderboardScore,
    ProductStatus,
    ProductTrafficDaily,
    PricingModel,
    ProductType,
    ProductUpvote,
    ProductVerification,
    Redemption,
    RedemptionStatus,
    RewardBalance,
    RewardCatalogItem,
    RewardRule,
    RewardTransaction,
    RewardTransactionType,
    SiteTrafficDaily,
    SiteTrafficBrowserDaily,
    SiteTrafficCityDaily,
    SiteTrafficCountryDaily,
    SiteTrafficDeviceDaily,
    SiteTrafficOperatingSystemDaily,
    SiteTrafficReferrerDaily,
    SiteTrafficRegionDaily,
    UseCase,
    UseCaseCategory,
    User,
    UserStatus,
)
from routers.base import api_prefix
from services.cache import cached_json
from services.clerk_api import get_clerk_avatar_url
from services.currency import convert_to_usd_cents, get_usd_conversion_rates
from services.revenue import build_revenue_summary
from services.schemas.public import (
    AnalyticsBrowser,
    AnalyticsCity,
    AnalyticsCountry,
    AnalyticsDevice,
    AnalyticsOperatingSystem,
    AnalyticsReferrer,
    AnalyticsRegion,
    AnalyticsSnapshot,
    AnalyticsTimeseriesPoint,
    AnalyticsTopProductPage,
    AnalyticsVerifiedRevenue,
    AlternativeHighlight,
    AlternativeCatalogItem,
    AlternativeCatalogPageResult,
    AlternativeDetailPayload,
    AlternativeDetailSummary,
    AlternativeProductsPageResult,
    BrowseFilters,
    BrowsePagePayload,
    BrowseProductsPageResult,
    VerifiedRevenueProductsPageResult,
    CategoryHighlight,
    CategoryDetailPayload,
    CategoryProductsPageResult,
    CategorySummary,
    CategoryTrendsPayload,
    CategoriesDirectoryPayload,
    HomepageFeedAllResult,
    HomepageFeedItem,
    HomepageFeedPageResult,
    HomepageFeedView,
    LeaderboardArchive,
    LeaderboardArchiveMonth,
    LeaderboardArchiveWeek,
    LeaderboardPageFilters,
    LeaderboardPagePayload,
    LeaderboardPeriod,
    LeaderboardStats,
    MonthlyLeaderboardMonth,
    MonthlyLeaderboardPayload,
    MonthlyLeaderboardProduct,
    MonthlyLeaderboardProductAnalytics,
    MonthlyLeaderboardProductCategory,
    MonthlyLeaderboardProductUser,
    MonthlyLeaderboardRanking,
    PeriodicLeaderboardPayload,
    ProductCategorySummary,
    ProductInterestSignals,
    PublicProductCard,
    PublicProductDetailPayload,
    PublicProductMetaPayload,
    PublicProductUpvoteState,
    PublicProductLeaderboardScore,
    ProductRevenueSummary,
    PublicRewardsData,
    PublicRewardsRedemption,
    PublicRewardsReward,
    PublicRewardsRule,
    PublicRewardsStats,
    PublicRewardsStatsWindow,
    PublicRewardsSpentWindow,
    RealtimeVisitors,
    RewardsLeaderboardEntry,
    RewardsLeaderboardPageResult,
    PublicProductUseCase,
    PublicProductCategoryDetail,
    PublicProductUser,
    PublicProductMetadata,
    PublicProductMedia,
    PublicProductAlternative,
    PublicProductAnalytics,
    PublicProductVerification,
    PublicPlanFeatureAssignment,
    PublicPlanFeature,
    PublicPlan,
    PublicProductRedirectPayload,
    PublicAnalyticsPayload,
    PublicUserMeta,
    PublicUserProfile,
    PublicUserSummary,
    PublicUsersPageResult,
    SponsoredPlacement,
    SponsoredPlacementSchedule,
    SponsoredProduct,
    StickyBannerProduct,
    UserProductsPageResult,
    UserProfileBadgeSummary,
    UserProfileCategoryEntry,
    UserProfilePayload,
    RewardsLeaderboardPosition,
    TagDetailPayload,
    TagDirectoryPageResult,
    TagProductsPageResult,
    TagSummary,
    TrafficPoint,
    UseCaseDetailPayload,
    UseCaseHighlight,
    UseCaseMeta,
    UseCaseSummary,
    UseCasesDirectoryPayload,
)
from services.users import get_or_create_user_by_clerk_id, get_user_by_clerk_id

router = APIRouter(prefix=api_prefix("public"), tags=["public-homepage"])

HOMEPAGE_FEED_PAGE_SIZE = 10
HOMEPAGE_FEED_MAX_PAGE_SIZE = 50
HOMEPAGE_FEED_CACHE_TTL = 300

HIGHLIGHTS_CACHE_TTL = 600
PLACEMENT_CACHE_TTL = 300
STICKY_BANNER_CACHE_TTL = 600
BADGE_PRODUCTS_CACHE_TTL = 300
TRENDING_PRODUCTS_CACHE_TTL = 300
TOP_CATEGORIES_CACHE_TTL = 600
LEADERBOARD_STATS_CACHE_TTL = 120
REALTIME_CACHE_TTL = 60
LEADERBOARD_PAGE_CACHE_TTL = 120
LEADERBOARD_PERIODIC_CACHE_TTL = 300
LEADERBOARD_MONTHS_CACHE_TTL = 3600
ANALYTICS_SUMMARY_CACHE_TTL = 300
ANALYTICS_TOP_PRODUCTS_DEFAULT_LIMIT = 8
ANALYTICS_TOP_PRODUCTS_MAX_LIMIT = 20

PRIORITY_FEATURE_KEY = "priorityPlacement"
SPONSORED_FEATURE_KEY = "sponsoredProducts"
STICKY_BANNER_FEATURE_KEY = "stickyBanner"

DEFAULT_HIGHLIGHT_LIMIT = 6
MAX_HIGHLIGHT_LIMIT = 12
BADGE_PRODUCTS_DEFAULT_LIMIT = 24
BADGE_PRODUCTS_MAX_LIMIT = 50
TRENDING_PRODUCTS_DEFAULT_LIMIT = 12
TRENDING_PRODUCTS_MAX_LIMIT = 50
TOP_CATEGORIES_DEFAULT_LIMIT = 12
TOP_CATEGORIES_MAX_LIMIT = 50
FEATURED_BY_CATEGORY_DEFAULT_LIMIT = 6
FEATURED_BY_CATEGORY_MAX_LIMIT = 12

BROWSE_PAGE_SIZE = 20
BROWSE_CACHE_TTL = 120

VERIFIED_REVENUE_PAGE_SIZE = 24
VERIFIED_REVENUE_MAX_PAGE_SIZE = 50
VERIFIED_REVENUE_CACHE_TTL = 300

PLANS_CACHE_TTL = 300

CATEGORIES_CACHE_TTL = 600
USE_CASES_CACHE_TTL = 600
ALTERNATIVES_CACHE_TTL = 600
TAGS_CACHE_TTL = 600

LEADERBOARD_DEFAULT_LIMIT = 50
LEADERBOARD_MAX_LIMIT = 100
LEADERBOARD_ARCHIVE_LOOKBACK_MONTHS = 12
LEADERBOARD_SCORE_WEIGHT_VIEWS = 1
LEADERBOARD_SCORE_WEIGHT_UNIQUE = 3
LEADERBOARD_SCORE_WEIGHT_UPVOTES = 10
LEADERBOARD_VERIFIED_MULTIPLIER = 1.4
VERIFIED_REVENUE_RANKING_MULTIPLIER = 1.4

REWARDS_STATS_CACHE_TTL = 300
REWARDS_PAGE_CACHE_TTL = 300
REWARDS_LEADERBOARD_CACHE_TTL = 120
REWARDS_LEADERBOARD_DEFAULT_PAGE_SIZE = 20
REWARDS_LEADERBOARD_MAX_PAGE_SIZE = 100
USERS_PAGE_SIZE = 20
USERS_MAX_PAGE_SIZE = 50
USERS_CACHE_TTL = 300
USER_PRODUCTS_PAGE_SIZE = 20
USER_PRODUCTS_MAX_PAGE_SIZE = 50
USER_PRODUCTS_CACHE_TTL = 120
USER_PROFILE_CACHE_TTL = 300
USER_META_CACHE_TTL = 600

PRODUCT_DETAIL_CACHE_TTL = 300
PRODUCT_META_CACHE_TTL = 300
PRODUCT_REVENUE_CACHE_TTL = 300
PRODUCT_SIMILAR_CACHE_TTL = 300
PRODUCT_LEADERBOARD_CACHE_TTL = 120

CATEGORY_PRODUCTS_PAGE_SIZE = 20
CATEGORY_PRODUCTS_MAX_PAGE_SIZE = 50

TAG_PRODUCTS_PAGE_SIZE = 24
TAG_PRODUCTS_MAX_PAGE_SIZE = 50

ALTERNATIVE_DETAIL_PAGE_SIZE = 8
ALTERNATIVE_DETAIL_MAX_PAGE_SIZE = 48

CATEGORY_HIGHLIGHT_LIMIT = 4
USE_CASE_HIGHLIGHT_LIMIT = 8

ALTERNATIVE_CATALOG_PAGE_SIZE = 18
ALTERNATIVE_CATALOG_MAX_PAGE_SIZE = 50

TAG_DIRECTORY_DEFAULT_PAGE_SIZE = 36
TAG_LIST_LIMIT = 200
KEYWORD_SLUG_HASH_LENGTH = 6

TRENDING_CATEGORY_DAYS = 7
TRENDING_CATEGORY_DEFAULT_LIMIT = 60
TRENDING_CATEGORY_MAX_LIMIT = 100

TAG_HASH_REGEX = re.compile(r"^[a-f0-9]+$", re.IGNORECASE)

BROWSE_SORT_LABELS = {
    "new": "Newest",
    "trending": "Trending",
    "votes": "Most Upvoted",
    "az": "A–Z",
}

PLATFORM_SLUG_MAP = {
    "web": Platform.WEB,
    "ios": Platform.IOS,
    "android": Platform.ANDROID,
    "mac": Platform.MAC,
    "windows": Platform.WINDOWS,
    "linux": Platform.LINUX,
    "chrome": Platform.CHROME_EXTENSION,
}

PRODUCT_TYPE_SLUG_MAP = {
    "saas": ProductType.SAAS,
    "browser-extension": ProductType.BROWSER_EXTENSION,
    "mobile-app": ProductType.MOBILE_APP,
    "desktop-app": ProductType.DESKTOP_APP,
    "api": ProductType.API,
    "open-source": ProductType.OPEN_SOURCE,
    "other": ProductType.OTHER,
}

PRICING_MODEL_SLUG_MAP = {
    "free": PricingModel.FREE,
    "freemium": PricingModel.FREEMIUM,
    "subscription": PricingModel.SUBSCRIPTION,
    "one-time": PricingModel.ONE_TIME,
    "custom": PricingModel.CUSTOM,
}


def _scalar_value(value: object) -> int:
    if value is None:
        return 0
    if isinstance(value, tuple):
        value = value[0] if value else 0
    else:
        mapping = getattr(value, "_mapping", None)
        if mapping is not None:
            value = next(iter(mapping.values()), 0) if mapping else 0
        elif hasattr(value, "__getitem__"):
            try:
                value = value[0]
            except (TypeError, IndexError, KeyError):
                pass
    return int(value or 0)


def _normalize_page(value: int | None, fallback: int = 1) -> int:
    if value is None:
        return fallback
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if parsed > 0 else fallback


def _normalize_page_size(value: int | None, fallback: int) -> int:
    return _normalize_page_size_with_max(value, fallback, HOMEPAGE_FEED_MAX_PAGE_SIZE)


def _normalize_page_size_with_max(value: int | None, fallback: int, max_value: int) -> int:
    if value is None:
        return fallback
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    if parsed <= 0:
        return fallback
    return min(parsed, max_value)


def _normalize_highlight_limit(value: int | None, fallback: int) -> int:
    if value is None:
        return fallback
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    parsed = max(parsed, 0)
    return min(parsed, MAX_HIGHLIGHT_LIMIT)


def _normalize_view(value: str | None) -> str:
    if not value:
        return HomepageFeedView.NEW.value
    normalized = value.strip().lower()
    if normalized in {
        HomepageFeedView.NEW.value,
        HomepageFeedView.VERIFIED_REVENUE.value,
        HomepageFeedView.MOST_CLICKED.value,
    }:
        return normalized
    return HomepageFeedView.NEW.value


def _normalize_plan_type(value: str | None) -> PlanType | None:
    if not value:
        return None
    normalized = value.strip()
    if not normalized:
        return None
    try:
        return PlanType(normalized)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Plan type not found") from exc


def _normalize_filter_slug(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip()
    if not normalized or normalized == "__all__":
        return None
    return normalized


def _normalize_browse_sort(value: str | None) -> str:
    if not value:
        return "new"
    normalized = value.strip().lower()
    return normalized if normalized in BROWSE_SORT_LABELS else "new"


def _normalize_query(value: str | None) -> str | None:
    if not value:
        return None
    trimmed = value.strip()
    return trimmed if trimmed else None


def _extract_keyword_hash(slug: str) -> str | None:
    if not slug:
        return None
    last_hyphen = slug.rfind("-")
    if last_hyphen == -1:
        return None
    hash_value = slug[last_hyphen + 1 :]
    if len(hash_value) != KEYWORD_SLUG_HASH_LENGTH or not TAG_HASH_REGEX.match(hash_value):
        return None
    return hash_value.lower()


def _parse_platform(value: str | None) -> Platform | None:
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in PLATFORM_SLUG_MAP:
        return PLATFORM_SLUG_MAP[normalized]
    try:
        return Platform(normalized)
    except ValueError:
        return None


def _parse_product_type(value: str | None) -> ProductType | None:
    if not value:
        return None
    normalized = value.strip().lower().replace("_", "-")
    if normalized in PRODUCT_TYPE_SLUG_MAP:
        return PRODUCT_TYPE_SLUG_MAP[normalized]
    try:
        return ProductType(normalized)
    except ValueError:
        return None


def _parse_pricing_model(value: str | None) -> PricingModel | None:
    if not value:
        return None
    normalized = value.strip().lower().replace("_", "-")
    if normalized in PRICING_MODEL_SLUG_MAP:
        return PRICING_MODEL_SLUG_MAP[normalized]
    try:
        return PricingModel(normalized)
    except ValueError:
        return None


def _pluralize(value: int, singular: str) -> str:
    return singular if value == 1 else f"{singular}s"


def _keyword_to_slug(keyword: str) -> str:
    normalized = keyword.strip().lower()
    if not normalized:
        return ""
    base = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    digest = hashlib.md5(normalized.encode("utf-8")).hexdigest()
    hash_suffix = digest[:KEYWORD_SLUG_HASH_LENGTH]
    return f"{base}-{hash_suffix}" if base else hash_suffix


def _ensure_http_url(raw_url: str) -> str | None:
    trimmed = raw_url.strip()
    if not trimmed:
        return None
    parsed = urlparse(trimmed)
    if not parsed.scheme:
        parsed = urlparse(f"https://{trimmed}")
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return urlunparse(parsed)


def _add_utm_params(raw_url: str, params: dict[str, str | None]) -> str:
    try:
        parsed = urlparse(raw_url)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        utm_map = {
            "utm_source": params.get("source"),
            "utm_medium": params.get("medium"),
            "utm_campaign": params.get("campaign"),
            "utm_content": params.get("content"),
            "utm_term": params.get("term"),
        }
        for key, value in utm_map.items():
            if not value:
                continue
            if key not in query:
                query[key] = value
        updated_query = urlencode(query, doseq=True)
        return urlunparse(parsed._replace(query=updated_query))
    except Exception:
        return raw_url


def _utc_range_for_days(days: int, *, now: datetime | None = None) -> tuple[datetime, datetime]:
    safe_days = max(int(days), 1)
    now = now or datetime.now(timezone.utc)
    end_date = now.date()
    start_date = end_date - timedelta(days=safe_days - 1)
    start_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
    return start_dt, end_dt


def _resolve_product_revenue(connector: PaymentConnector | None) -> tuple[int | None, str | None]:
    if not connector:
        return None, None
    if connector.latest_all_time_revenue_cents is not None:
        return connector.latest_all_time_revenue_cents, connector.latest_currency_code
    if connector.revenue_history:
        latest = max(connector.revenue_history, key=lambda row: row.period_start)
        return latest.all_time_revenue_cents, latest.currency_code
    return None, None


def _normalize_leaderboard_limit(value: int | None) -> int:
    if value is None:
        return LEADERBOARD_DEFAULT_LIMIT
    try:
        normalized = int(value)
    except (TypeError, ValueError):
        return LEADERBOARD_DEFAULT_LIMIT
    return max(1, min(normalized, LEADERBOARD_MAX_LIMIT))


def _normalize_rewards_page_size(value: int | None) -> int:
    if value is None:
        return REWARDS_LEADERBOARD_DEFAULT_PAGE_SIZE
    try:
        normalized = int(value)
    except (TypeError, ValueError):
        return REWARDS_LEADERBOARD_DEFAULT_PAGE_SIZE
    return max(1, min(normalized, REWARDS_LEADERBOARD_MAX_PAGE_SIZE))


def _start_of_iso_week(year: int, week: int) -> datetime | None:
    try:
        return datetime.fromisocalendar(year, week, 1).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _format_period_label(period: LeaderboardPeriod, start: datetime, end: datetime) -> str:
    if period == LeaderboardPeriod.DAY:
        return f"{start.strftime('%B')} {start.day}"
    if period == LeaderboardPeriod.WEEK:
        end_day = end - timedelta(days=1)
        return f"{start.strftime('%b')} {start.day} - {end_day.strftime('%b')} {end_day.day}"
    return start.strftime("%B %Y")


def _resolve_period_window(
    *,
    period: LeaderboardPeriod,
    year: int,
    month: int | None = None,
    day: int | None = None,
    week: int | None = None,
) -> tuple[datetime, datetime, str] | None:
    if period == LeaderboardPeriod.DAY:
        if month is None or day is None:
            return None
        try:
            start = datetime(year, month, day, tzinfo=timezone.utc)
        except ValueError:
            return None
        end = start + timedelta(days=1)
        return start, end, _format_period_label(period, start, end)

    if period == LeaderboardPeriod.WEEK:
        if week is None:
            return None
        start = _start_of_iso_week(year, week)
        if not start:
            return None
        end = start + timedelta(days=7)
        return start, end, _format_period_label(period, start, end)

    if month is None:
        return None
    try:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
    except ValueError:
        return None
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end, _format_period_label(period, start, end)


def _month_key(date: datetime) -> str:
    last_day = calendar.monthrange(date.year, date.month)[1]
    return f"{last_day:02d}-{date.month:02d}-{date.year}"


def _parse_month_key(value: str | None) -> datetime | None:
    if not value:
        return None
    match = re.match(r"^(\d{2})-(\d{2})-(\d{4})$", value)
    if not match:
        return None
    day = int(match.group(1))
    month = int(match.group(2))
    year = int(match.group(3))
    if month < 1 or month > 12:
        return None
    last_day = calendar.monthrange(year, month)[1]
    if day != last_day:
        return None
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _shift_month(date: datetime, delta: int) -> datetime:
    total_months = (date.year * 12) + (date.month - 1) + delta
    year = total_months // 12
    month = (total_months % 12) + 1
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _resolve_product_badges(product: Product, now: datetime) -> list[str]:
    badges: list[str] = []
    for badge in product.product_badges or []:
        if badge.expires_at and badge.expires_at <= now:
            continue
        badges.append(badge.badge)
    return badges


def _is_sponsored(product: Product) -> bool:
    plan = product.plan
    if not plan:
        return False
    for assignment in plan.assignments or []:
        feature = assignment.feature
        if not feature:
            continue
        if assignment.enabled and feature.key == PRIORITY_FEATURE_KEY:
            return True
    return False


def _product_load_options():
    return [
        selectinload(Product.category),
        selectinload(Product.analytics),
        selectinload(Product.product_badges),
        selectinload(Product.verification),
        selectinload(Product.plan)
        .selectinload(Plan.assignments)
        .selectinload(PlanFeatureAssignment.feature),
        selectinload(Product.payment_connector).selectinload(PaymentConnector.revenue_history),
    ]


def _product_detail_load_options():
    return [
        selectinload(Product.category)
        .selectinload(Category.use_case_categories)
        .selectinload(UseCaseCategory.use_case),
        selectinload(Product.analytics),
        selectinload(Product.product_badges),
        selectinload(Product.verification),
        selectinload(Product.plan)
        .selectinload(Plan.assignments)
        .selectinload(PlanFeatureAssignment.feature),
        selectinload(Product.payment_connector).selectinload(PaymentConnector.revenue_history),
        selectinload(Product.metadata_record),
        selectinload(Product.product_media),
        selectinload(Product.alternatives),
        selectinload(Product.user),
        selectinload(Product.feature_entitlements),
    ]


def _map_use_cases(category: Category | None) -> list[PublicProductUseCase]:
    if not category or not category.use_case_categories:
        return []
    results: list[PublicProductUseCase] = []
    seen: set[str] = set()
    for link in category.use_case_categories:
        use_case = link.use_case
        if not use_case or not use_case.slug:
            continue
        if use_case.slug in seen:
            continue
        seen.add(use_case.slug)
        results.append(PublicProductUseCase(slug=use_case.slug, label=use_case.label))
    results.sort(key=lambda item: item.label.lower())
    return results


def _map_plan_assignments(plan: Plan | None) -> list[PublicPlanFeatureAssignment]:
    if not plan or not plan.assignments:
        return []
    assignments: list[PublicPlanFeatureAssignment] = []
    for assignment in plan.assignments:
        feature = assignment.feature
        if not feature:
            continue
        assignments.append(
            PublicPlanFeatureAssignment(
                key=feature.key,
                enabled=bool(assignment.enabled),
            )
        )
    return assignments


def _map_active_feature_entitlements(product: Product) -> list[str]:
    entitlements = product.feature_entitlements or []
    active_keys = {
        entitlement.feature_key
        for entitlement in entitlements
        if entitlement.status
        in {FeatureEntitlementStatus.ACTIVE, FeatureEntitlementStatus.PENDING}
    }
    return sorted(active_keys)


async def _fetch_product_upvote_count(session: Session, product_id: int) -> int:
    stmt = select(func.count(ProductUpvote.id)).where(ProductUpvote.product_id == product_id)
    return int(_scalar_value((await session.exec(stmt)).first()))


async def _fetch_product_by_slug(session: Session, slug: str) -> Product | None:
    stmt = (
        select(Product)
        .where(and_(Product.slug == slug, Product.status == ProductStatus.PUBLISHED))
        .options(*_product_detail_load_options())
    )
    return (await session.exec(stmt)).scalars().one_or_none()


async def _fetch_product_by_id(session: Session, product_id: int) -> Product | None:
    stmt = (
        select(Product)
        .where(and_(Product.id == product_id, Product.status == ProductStatus.PUBLISHED))
        .options(*_product_detail_load_options())
    )
    return (await session.exec(stmt)).scalars().one_or_none()


def _map_product_user(
    user: User | None, *, avatar_url: str | None = None
) -> PublicProductUser | None:
    if not user:
        return None
    return PublicProductUser(
        id=str(user.id),
        clerkId=user.clerk_id,
        firstName=user.first_name,
        lastName=user.last_name,
        avatarUrl=avatar_url,
        email=user.email,
        role=user.role.value if user.role else None,
    )


def _map_product_media(product: Product) -> list[PublicProductMedia]:
    media = product.product_media or []
    items = [
        PublicProductMedia(
            id=str(item.id),
            imageUrl=item.image_url,
            altText=item.alt_text,
        )
        for item in media
        if item.image_url
    ]
    return items


def _map_product_alternatives(product: Product) -> list[PublicProductAlternative]:
    alternatives = product.alternatives or []
    return [
        PublicProductAlternative(
            id=str(alt.id),
            slug=alt.slug,
            name=alt.name,
            websiteUrl=alt.website_url,
            logoUrl=alt.logo_url,
        )
        for alt in alternatives
    ]


def _map_product_detail_payload(
    product: Product,
    *,
    upvote_count: int | None = None,
    interest: ProductInterestSignals | None = None,
    user_avatar_url: str | None = None,
) -> PublicProductDetailPayload:
    now = datetime.now(timezone.utc)
    badges = _resolve_product_badges(product, now)
    category = product.category
    category_payload = (
        PublicProductCategoryDetail(
            id=str(category.id),
            name=category.name,
            slug=category.slug,
            useCases=_map_use_cases(category),
        )
        if category
        else None
    )
    metadata = (
        PublicProductMetadata(
            demoUrl=product.metadata_record.demo_url if product.metadata_record else None,
            utmCampaign=product.metadata_record.utm_campaign if product.metadata_record else None,
        )
        if product.metadata_record
        else None
    )
    analytics = (
        PublicProductAnalytics(upvotes=product.analytics.upvotes)
        if product.analytics
        else None
    )
    verification = (
        PublicProductVerification(isVerified=product.verification.is_verified)
        if product.verification
        else None
    )
    return PublicProductDetailPayload(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        tagline=product.tagline,
        description=product.description,
        websiteUrl=product.website_url,
        logo=product.logo,
        bannerImage=product.banner_image,
        pricingModel=product.pricing_model.value if product.pricing_model else None,
        startingPriceCents=product.starting_price_cents,
        currencyCode=product.currency_code,
        platforms=[platform.value for platform in (product.platforms or [])],
        status=product.status.value if product.status else "published",
        type=product.type.value if product.type else None,
        publishedAt=product.published_at.isoformat() if product.published_at else None,
        createdAt=product.created_at.isoformat() if product.created_at else None,
        updatedAt=product.updated_at.isoformat() if product.updated_at else None,
        keywords=product.keywords or [],
        category=category_payload,
        alternatives=_map_product_alternatives(product),
        user=_map_product_user(product.user, avatar_url=user_avatar_url),
        metadata=metadata,
        analytics=analytics,
        verification=verification,
        interest=interest,
        media=_map_product_media(product),
        badges=badges,
        planAssignments=_map_plan_assignments(product.plan),
        activeFeatureEntitlements=_map_active_feature_entitlements(product),
        upvotesCount=upvote_count,
    )


def _map_product_meta_payload(
    product: Product, *, user_avatar_url: str | None = None
) -> PublicProductMetaPayload:
    category = product.category
    metadata = (
        PublicProductMetadata(
            demoUrl=product.metadata_record.demo_url if product.metadata_record else None,
            utmCampaign=product.metadata_record.utm_campaign if product.metadata_record else None,
        )
        if product.metadata_record
        else None
    )
    analytics = (
        PublicProductAnalytics(upvotes=product.analytics.upvotes)
        if product.analytics
        else None
    )
    verification = (
        PublicProductVerification(isVerified=product.verification.is_verified)
        if product.verification
        else None
    )
    return PublicProductMetaPayload(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        tagline=product.tagline,
        description=product.description,
        websiteUrl=product.website_url,
        logo=product.logo,
        bannerImage=product.banner_image,
        pricingModel=product.pricing_model.value if product.pricing_model else None,
        startingPriceCents=product.starting_price_cents,
        currencyCode=product.currency_code,
        platforms=[platform.value for platform in (product.platforms or [])],
        status=product.status.value if product.status else "published",
        type=product.type.value if product.type else None,
        publishedAt=product.published_at.isoformat() if product.published_at else None,
        createdAt=product.created_at.isoformat() if product.created_at else None,
        updatedAt=product.updated_at.isoformat() if product.updated_at else None,
        keywords=product.keywords or [],
        category=ProductCategorySummary(
            name=category.name if category else None,
            slug=category.slug if category else None,
        ),
        user=_map_product_user(product.user, avatar_url=user_avatar_url),
        metadata=metadata,
        analytics=analytics,
        verification=verification,
        media=_map_product_media(product),
        planAssignments=_map_plan_assignments(product.plan),
        activeFeatureEntitlements=_map_active_feature_entitlements(product),
    )


def _map_public_plan_features(
    features: list[PlanFeature],
    assignments: list[PlanFeatureAssignment],
) -> list[PublicPlanFeature]:
    assignment_map = {assignment.feature_id: assignment for assignment in assignments}
    items: list[PublicPlanFeature] = []
    for feature in features:
        assignment = assignment_map.get(feature.id)
        items.append(
            PublicPlanFeature(
                id=str(feature.id),
                name=feature.name,
                key=feature.key,
                description=feature.description,
                enabled=assignment.enabled if assignment else False,
                isExperimental=assignment.is_experimental if assignment else False,
            )
        )
    return items


def _map_public_plan(
    plan: Plan,
    *,
    features: list[PlanFeature],
    product_count: int,
) -> PublicPlan:
    return PublicPlan(
        id=str(plan.id),
        name=plan.name,
        slug=plan.slug,
        description=plan.description,
        type=plan.type.value if plan.type else PlanType.ONE_TIME_PRICE.value,
        price=plan.price,
        discount=plan.discount,
        boostForDays=plan.boost_for_days,
        isDefault=plan.is_default,
        externalId=plan.external_id,
        paymentFrequencyCount=plan.payment_frequency_count,
        paymentFrequencyInterval=plan.payment_frequency_interval.value
        if plan.payment_frequency_interval
        else None,
        subscriptionPeriodCount=plan.subscription_period_count,
        subscriptionPeriodInterval=plan.subscription_period_interval.value
        if plan.subscription_period_interval
        else None,
        productCount=product_count,
        features=_map_public_plan_features(features, plan.assignments or []),
    )


def _parse_product_id(value: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="Product not found.") from exc


def _parse_user_id(value: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=404, detail="User not found.") from exc


async def _assert_published_product(session: Session, product_id: int) -> None:
    stmt = select(Product.id).where(
        and_(Product.id == product_id, Product.status == ProductStatus.PUBLISHED)
    )
    exists_row = (await session.exec(stmt)).first()
    if not exists_row:
        raise HTTPException(status_code=404, detail="Product not found.")


async def _fetch_user_products_page(
    session: Session,
    *,
    user_id: int,
    page: int,
    page_size: int,
) -> tuple[list[Product], bool, int]:
    base_filter = and_(
        Product.status == ProductStatus.PUBLISHED,
        Product.user_id == user_id,
    )
    total = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(base_filter))).one()
    )
    offset = (page - 1) * page_size
    stmt = (
        select(Product)
        .where(base_filter)
        .order_by(Product.created_at.desc())
        .options(*_product_load_options())
        .offset(offset)
        .limit(page_size + 1)
    )
    rows = (await session.exec(stmt)).scalars().all()
    has_more = len(rows) > page_size
    return rows[:page_size], has_more, total


async def _build_rewards_leaderboard_position(
    session: Session, *, user_id: int
) -> RewardsLeaderboardPosition | None:
    balance_stmt = (
        select(RewardBalance, User)
        .join(User, User.id == RewardBalance.user_id)
        .where(RewardBalance.user_id == user_id)
    )
    row = (await session.exec(balance_stmt)).first()
    if not row:
        return None
    balance, user = row
    if not balance or not user:
        return None
    if balance.lifetime_earned <= 0 or user.status != UserStatus.ACTIVE:
        return None

    ahead_stmt = (
        select(func.count(RewardBalance.user_id))
        .join(User, User.id == RewardBalance.user_id)
        .where(
            and_(
                User.status == UserStatus.ACTIVE,
                RewardBalance.lifetime_earned > 0,
                or_(
                    RewardBalance.lifetime_earned > balance.lifetime_earned,
                    and_(
                        RewardBalance.lifetime_earned == balance.lifetime_earned,
                        RewardBalance.updated_at > balance.updated_at,
                    ),
                ),
            )
        )
    )
    eligible_stmt = (
        select(func.count(RewardBalance.user_id))
        .join(User, User.id == RewardBalance.user_id)
        .where(
            and_(
                User.status == UserStatus.ACTIVE,
                RewardBalance.lifetime_earned > 0,
            )
        )
    )

    launch_stmt = select(func.count(Product.id)).where(
        and_(
            Product.user_id == user_id,
            Product.status == ProductStatus.PUBLISHED,
        )
    )
    ahead_count = _scalar_value((await session.exec(ahead_stmt)).one())
    eligible_count = _scalar_value((await session.exec(eligible_stmt)).one())
    launch_count = _scalar_value((await session.exec(launch_stmt)).one())

    return RewardsLeaderboardPosition(
        rank=ahead_count + 1,
        totalEligible=eligible_count,
        lifetimeEarned=int(balance.lifetime_earned or 0),
        launchCount=launch_count,
    )


async def _resolve_clerk_avatar_map(
    clerk_ids: Sequence[str | None],
) -> dict[str, str | None]:
    unique_ids = [cid for cid in dict.fromkeys(clerk_ids) if cid]
    if not unique_ids:
        return {}

    results = await asyncio.gather(
        *[get_clerk_avatar_url(clerk_id) for clerk_id in unique_ids],
        return_exceptions=True,
    )
    avatar_map: dict[str, str | None] = {}
    for clerk_id, result in zip(unique_ids, results):
        if isinstance(result, Exception):
            continue
        avatar_map[clerk_id] = result
    return avatar_map


async def _build_user_revenue_map(
    session: Session, *, user_ids: Sequence[int]
) -> dict[int, dict[str, int | str | None]]:
    if not user_ids:
        return {}

    stmt = (
        select(PaymentConnector, Product.user_id)
        .join(Product, Product.id == PaymentConnector.product_id)
        .where(
            and_(
                Product.user_id.in_(user_ids),
                Product.status == ProductStatus.PUBLISHED,
                PaymentConnector.status == PaymentConnectorStatus.ACTIVE,
                PaymentConnector.verified_at.isnot(None),
            )
        )
        .options(selectinload(PaymentConnector.revenue_history))
    )
    rows = (await session.exec(stmt)).all()

    connectors = [row[0] for row in rows]
    needs_rates = False
    for connector in connectors:
        currency = (connector.latest_currency_code or "USD").upper()
        if currency != "USD":
            needs_rates = True
            break
        history = connector.revenue_history or []
        if history:
            latest = max(history, key=lambda entry: entry.period_start)
            currency = (latest.currency_code or "USD").upper()
            if currency != "USD":
                needs_rates = True
                break

    rates = await get_usd_conversion_rates() if needs_rates else {"USD": 1.0}

    revenue_by_user: dict[int, dict[str, int | str | None]] = {}
    for connector, user_id in rows:
        history = connector.revenue_history or []
        latest_snapshot = (
            max(history, key=lambda entry: entry.period_start) if history else None
        )
        amount = (
            connector.latest_all_time_revenue_cents
            if connector.latest_all_time_revenue_cents is not None
            else latest_snapshot.all_time_revenue_cents
            if latest_snapshot is not None
            else None
        )
        if amount is None:
            continue

        currency_code = (
            connector.latest_currency_code
            or (latest_snapshot.currency_code if latest_snapshot else None)
            or "USD"
        )
        currency_code = currency_code.upper()

        if currency_code != "USD":
            amount, rate_used = convert_to_usd_cents(amount, currency_code, rates)
            if rate_used is not None:
                currency_code = "USD"

        existing = revenue_by_user.get(int(user_id))
        current_cents = int(existing["cents"]) if existing else 0
        revenue_by_user[int(user_id)] = {
            "cents": current_cents + int(amount),
            "currency": currency_code or (existing["currency"] if existing else "USD"),
        }

    return revenue_by_user


async def _fetch_category_summaries(session: Session) -> list[CategorySummary]:
    stmt = (
        select(
            Category.id,
            Category.name,
            Category.slug,
            Category.description,
            Category.icon,
            func.count(Product.id).label("product_count"),
        )
        .join(Product, Product.category_id == Category.id)
        .where(Product.status == ProductStatus.PUBLISHED)
        .group_by(Category.id)
        .order_by(Category.name.asc())
    )
    rows = (await session.exec(stmt)).all()
    summaries: list[CategorySummary] = []
    for row in rows:
        summaries.append(
            CategorySummary(
                id=str(row[0]),
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4],
                count=int(row[5] or 0),
            )
        )
    return summaries


async def _fetch_use_case_counts(session: Session) -> dict[int, int]:
    stmt = (
        select(
            UseCaseCategory.use_case_id,
            func.count(Product.id).label("product_count"),
        )
        .join(Product, Product.category_id == UseCaseCategory.category_id)
        .where(Product.status == ProductStatus.PUBLISHED)
        .group_by(UseCaseCategory.use_case_id)
    )
    rows = (await session.exec(stmt)).all()
    return {int(row[0]): int(row[1] or 0) for row in rows}


async def _fetch_use_case_summaries(session: Session) -> list[UseCaseSummary]:
    use_cases = (await session.exec(select(UseCase).order_by(UseCase.label.asc()))).scalars().all()
    counts = await _fetch_use_case_counts(session)
    return [
        UseCaseSummary(
            id=str(use_case.id),
            label=use_case.label,
            slug=use_case.slug,
            productCount=counts.get(use_case.id, 0),
        )
        for use_case in use_cases
    ]


async def _fetch_category_by_slug(session: Session, slug: str) -> Category | None:
    stmt = select(Category).where(Category.slug == slug)
    return (await session.exec(stmt)).scalars().one_or_none()


async def _fetch_category_products_page(
    session: Session,
    *,
    category_id: int,
    page: int,
    page_size: int,
) -> tuple[list[Product], bool, int]:
    base_filter = and_(
        Product.status == ProductStatus.PUBLISHED,
        Product.category_id == category_id,
    )
    total = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(base_filter))).one()
    )
    offset = (page - 1) * page_size
    stmt = (
        select(Product)
        .where(base_filter)
        .order_by(Product.created_at.desc())
        .options(*_product_load_options())
        .offset(offset)
        .limit(page_size + 1)
    )
    rows = (await session.exec(stmt)).scalars().all()
    has_more = len(rows) > page_size
    return rows[:page_size], has_more, total


async def _fetch_use_case_categories(
    session: Session, use_case_id: int
) -> tuple[list[CategorySummary], int]:
    stmt = (
        select(
            Category.id,
            Category.name,
            Category.slug,
            Category.description,
            Category.icon,
            func.count(Product.id).label("product_count"),
        )
        .join(UseCaseCategory, UseCaseCategory.category_id == Category.id)
        .join(Product, Product.category_id == Category.id)
        .where(
            and_(
                UseCaseCategory.use_case_id == use_case_id,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
        .group_by(Category.id)
        .order_by(func.count(Product.id).desc(), Category.name.asc())
    )
    rows = (await session.exec(stmt)).all()
    categories: list[CategorySummary] = []
    total_products = 0
    for row in rows:
        count = int(row[5] or 0)
        total_products += count
        categories.append(
            CategorySummary(
                id=str(row[0]),
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4],
                count=count,
            )
        )
    return categories, total_products


async def _fetch_tag_summary_by_slug(
    session: Session, slug: str
) -> TagSummary | None:
    hash_value = _extract_keyword_hash(slug)
    if not hash_value:
        return None
    status_value = ProductStatus.PUBLISHED.name

    stmt = text(
        f"""
        WITH expanded AS (
          SELECT
            LOWER(TRIM(k)) AS keyword,
            TRIM(k) AS raw_keyword,
            SUBSTRING(md5(LOWER(TRIM(k))), 1, {KEYWORD_SLUG_HASH_LENGTH}) AS hash,
            p.id AS product_id,
            COALESCE(p.updated_at, p.published_at, p.created_at) AS updated_at
          FROM product p
          CROSS JOIN LATERAL UNNEST(p.keywords) AS k
          WHERE
            p.status = :status
            AND k IS NOT NULL
            AND TRIM(k) <> ''
        )
        SELECT
          keyword,
          MIN(raw_keyword) AS canonical,
          hash,
          COUNT(DISTINCT product_id)::int AS product_count,
          MAX(updated_at) AS last_updated
        FROM expanded
        WHERE hash = :hash_value
        GROUP BY keyword, hash
        """
    )
    rows = (
        await session.exec(
            stmt,
            params={
                "hash_value": hash_value,
                "status": status_value,
            },
        )
    ).all()
    for row in rows:
        keyword = row[0]
        canonical = row[1] or keyword
        slug_value = _keyword_to_slug(keyword)
        if slug_value != slug:
            continue
        last_updated = row[4]
        return TagSummary(
            keyword=keyword,
            canonical=canonical,
            hash=row[2],
            slug=slug_value,
            productCount=int(row[3] or 0),
            lastUpdated=last_updated.isoformat() if last_updated else None,
        )
    return None


async def _fetch_tag_products_page(
    session: Session,
    *,
    slug: str,
    page: int,
    page_size: int,
) -> TagProductsPageResult | None:
    summary = await _fetch_tag_summary_by_slug(session, slug)
    if not summary:
        return None

    normalized_keyword = summary.keyword.strip().lower()
    offset = (page - 1) * page_size
    status_value = ProductStatus.PUBLISHED.name

    stmt = text(
        """
        SELECT
          p.id AS id
        FROM product p
        WHERE
          p.status = :status
          AND EXISTS (
            SELECT 1
            FROM UNNEST(p.keywords) AS keyword
            WHERE LOWER(TRIM(keyword)) = :keyword
          )
        ORDER BY COALESCE(p.updated_at, p.published_at, p.created_at) DESC
        OFFSET :offset
        LIMIT :limit
        """
    )
    rows = (
        await session.exec(
            stmt,
            params={
                "keyword": normalized_keyword,
                "offset": offset,
                "limit": page_size,
                "status": status_value,
            },
        )
    ).all()
    product_ids = [int(row[0]) for row in rows]
    products = await _fetch_products_by_ids(session, product_ids)
    score_map = await _fetch_score_map(session, product_ids)
    interest_map = await _fetch_interest_map(session, product_ids)
    now = datetime.now(timezone.utc)

    items = [
        _map_product_to_card(
            product,
            now=now,
            score_map=score_map,
            interest_map=interest_map,
        )
        for product in products
    ]

    total = summary.productCount
    has_more = offset + len(product_ids) < total
    next_page = page + 1 if has_more else None

    return TagProductsPageResult(
        summary=summary,
        items=items,
        total=total,
        page=page,
        pageSize=page_size,
        hasMore=has_more,
        nextPage=next_page,
    )


async def _fetch_alternative_by_slug(
    session: Session, slug: str
) -> AlternativeProduct | None:
    stmt = select(AlternativeProduct).where(AlternativeProduct.slug == slug)
    return (await session.exec(stmt)).scalars().one_or_none()


async def _fetch_alternative_products_page(
    session: Session,
    *,
    alternative_id: int,
    page: int,
    page_size: int,
) -> tuple[list[Product], bool, int]:
    alternative_exists = exists(
        select(ProductAlternativeProductLink.product_id).where(
            and_(
                ProductAlternativeProductLink.product_id == Product.id,
                ProductAlternativeProductLink.alternative_product_id == alternative_id,
            )
        )
    )
    base_filter = and_(Product.status == ProductStatus.PUBLISHED, alternative_exists)

    priority_exists = exists(
        select(PlanFeatureAssignment.id)
        .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
        .where(
            and_(
                PlanFeatureAssignment.plan_id == Product.plan_id,
                PlanFeatureAssignment.enabled.is_(True),
                PlanFeature.key == PRIORITY_FEATURE_KEY,
            )
        )
    )

    priority_filter = and_(base_filter, priority_exists)
    regular_filter = and_(base_filter, ~priority_exists)

    total_priority = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(priority_filter))).one()
    )
    total_regular = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(regular_filter))).one()
    )

    skip = (page - 1) * page_size
    if skip < total_priority:
        priority_skip = skip
        priority_take = min(page_size, total_priority - priority_skip)
        regular_skip = 0
        regular_take = max(0, page_size - priority_take)
    else:
        priority_skip = total_priority
        priority_take = 0
        regular_skip = skip - total_priority
        regular_take = page_size

    order_by = [
        func.coalesce(ProductAnalytics.upvotes, 0).desc(),
        Product.created_at.desc(),
        Product.name.asc(),
    ]

    products: list[Product] = []

    if priority_take > 0:
        priority_stmt = (
            select(Product)
            .outerjoin(ProductAnalytics)
            .where(priority_filter)
            .order_by(*order_by)
            .options(*_product_load_options())
            .offset(priority_skip)
            .limit(priority_take)
        )
        products.extend((await session.exec(priority_stmt)).scalars().all())

    if regular_take > 0:
        regular_stmt = (
            select(Product)
            .outerjoin(ProductAnalytics)
            .where(regular_filter)
            .order_by(*order_by)
            .options(*_product_load_options())
            .offset(regular_skip)
            .limit(regular_take)
        )
        products.extend((await session.exec(regular_stmt)).scalars().all())

    total = total_priority + total_regular
    has_more = skip + len(products) < total
    return products, has_more, total


async def _fetch_featured_alternatives(
    session: Session,
    *,
    exclude_id: int | None = None,
    limit: int = 6,
) -> list[AlternativeCatalogItem]:
    safe_limit = max(1, min(int(limit), 12))
    stmt = (
        select(
            AlternativeProduct.id,
            AlternativeProduct.name,
            AlternativeProduct.slug,
            AlternativeProduct.description,
            AlternativeProduct.website_url,
            AlternativeProduct.logo_url,
            func.count(ProductAlternativeProductLink.product_id).label("product_count"),
        )
        .join(
            ProductAlternativeProductLink,
            ProductAlternativeProductLink.alternative_product_id == AlternativeProduct.id,
        )
        .group_by(AlternativeProduct.id)
        .order_by(AlternativeProduct.name.asc())
        .limit(safe_limit)
    )
    if exclude_id:
        stmt = stmt.where(AlternativeProduct.id != exclude_id)

    rows = (await session.exec(stmt)).all()
    items: list[AlternativeCatalogItem] = []
    for row in rows:
        items.append(
            AlternativeCatalogItem(
                id=str(row[0]),
                name=row[1],
                slug=row[2],
                description=row[3],
                websiteUrl=row[4],
                logoUrl=row[5],
                productCount=int(row[6] or 0),
            )
        )
    return items


async def _resolve_browse_category_ids(
    session: Session,
    *,
    use_case_slug: str | None,
    category_slug: str | None,
) -> list[int] | None:
    if category_slug:
        category_stmt = select(Category).where(Category.slug == category_slug)
        category = (await session.exec(category_stmt)).scalars().one_or_none()
        if not category:
            return []
        return [category.id]

    if not use_case_slug:
        return None

    use_case_stmt = select(UseCase).where(UseCase.slug == use_case_slug)
    use_case = (await session.exec(use_case_stmt)).scalars().one_or_none()
    if not use_case:
        return []

    category_stmt = select(UseCaseCategory.category_id).where(
        UseCaseCategory.use_case_id == use_case.id
    )
    rows = (await session.exec(category_stmt)).all()
    return [int(row[0]) for row in rows]


async def _fetch_score_map(
    session: Session, product_ids: Sequence[int]
) -> dict[int, int]:
    if not product_ids:
        return {}
    now = datetime.now(timezone.utc)
    period_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        period_end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        period_end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)

    run_stmt = select(LeaderboardRun).where(
        and_(
            LeaderboardRun.period_start == period_start,
            LeaderboardRun.period_end == period_end,
        )
    )
    run = (await session.exec(run_stmt)).scalars().one_or_none()
    if not run:
        return {}

    score_stmt = select(ProductLeaderboardScore).where(
        and_(
            ProductLeaderboardScore.run_id == run.id,
            ProductLeaderboardScore.product_id.in_(product_ids),
        )
    )
    rows = (await session.exec(score_stmt)).scalars().all()
    return {row.product_id: row.score or 0 for row in rows}


async def _fetch_interest_map(
    session: Session, product_ids: Sequence[int], *, days: int = 7
) -> dict[int, ProductInterestSignals]:
    if not product_ids:
        return {}
    now = datetime.now(timezone.utc)
    current_start, current_end = _utc_range_for_days(days, now=now)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)

    current_stmt = (
        select(
            ProductTrafficDaily.product_id,
            func.sum(ProductTrafficDaily.page_views).label("page_views"),
            func.sum(ProductTrafficDaily.unique_visitors).label("unique_visitors"),
            func.sum(ProductTrafficDaily.sessions).label("sessions"),
        )
        .where(
            and_(
                ProductTrafficDaily.product_id.in_(product_ids),
                ProductTrafficDaily.date >= current_start,
                ProductTrafficDaily.date <= current_end,
            )
        )
        .group_by(ProductTrafficDaily.product_id)
    )
    prev_stmt = (
        select(
            ProductTrafficDaily.product_id,
            func.sum(ProductTrafficDaily.page_views).label("page_views"),
            func.sum(ProductTrafficDaily.unique_visitors).label("unique_visitors"),
            func.sum(ProductTrafficDaily.sessions).label("sessions"),
        )
        .where(
            and_(
                ProductTrafficDaily.product_id.in_(product_ids),
                ProductTrafficDaily.date >= previous_start,
                ProductTrafficDaily.date <= previous_end,
            )
        )
        .group_by(ProductTrafficDaily.product_id)
    )

    current_rows = (await session.exec(current_stmt)).all()
    previous_rows = (await session.exec(prev_stmt)).all()

    current_map = {
        row[0]: {
            "page_views": int(row[1] or 0),
            "unique_visitors": int(row[2] or 0),
            "sessions": int(row[3] or 0),
        }
        for row in current_rows
    }
    previous_map = {
        row[0]: {
            "page_views": int(row[1] or 0),
            "unique_visitors": int(row[2] or 0),
            "sessions": int(row[3] or 0),
        }
        for row in previous_rows
    }

    signals: dict[int, ProductInterestSignals] = {}
    for product_id in set(current_map.keys()) | set(previous_map.keys()):
        current = current_map.get(product_id, {"page_views": 0, "unique_visitors": 0, "sessions": 0})
        previous = previous_map.get(product_id, {"page_views": 0, "unique_visitors": 0, "sessions": 0})

        clicks = max(int(current["page_views"]), 0)
        prev_clicks = max(int(previous["page_views"]), 0)
        click_velocity = (
            (clicks - prev_clicks) / prev_clicks
            if prev_clicks > 0
            else 1.0
            if clicks > 0
            else 0.0
        )

        unique_visitors = max(int(current["unique_visitors"]), 0)
        sessions = max(int(current["sessions"]), 0)
        repeat_visits = max(sessions - unique_visitors, 0)

        signals[product_id] = ProductInterestSignals(
            clicks7d=clicks,
            clickVelocityWoW=click_velocity,
            uniqueVisitors7d=unique_visitors,
            repeatVisits7d=repeat_visits,
        )

    return signals


def _current_leaderboard_window(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = now or datetime.now(timezone.utc)
    period_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        period_end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        period_end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    return period_start, period_end


async def _fetch_verified_revenue_product_ids(
    session: Session, product_ids: Sequence[int] | None = None
) -> set[int]:
    stmt = select(PaymentConnector.product_id).where(_verified_revenue_condition())
    if product_ids:
        stmt = stmt.where(PaymentConnector.product_id.in_(product_ids))
    rows = (await session.exec(stmt)).all()
    return {int(row[0]) for row in rows}


async def _fetch_leaderboard_run(
    session: Session, *, period_start: datetime, period_end: datetime
) -> LeaderboardRun | None:
    stmt = select(LeaderboardRun).where(
        and_(
            LeaderboardRun.period_start == period_start,
            LeaderboardRun.period_end == period_end,
        )
    )
    return (await session.exec(stmt)).scalars().one_or_none()


async def _fetch_leaderboard_product_ids(
    session: Session,
    *,
    run_id: int,
    limit: int,
    category_slug: str | None,
    verified_revenue_only: bool,
) -> tuple[list[int], dict[int, int]]:
    stmt = (
        select(
            ProductLeaderboardScore.product_id,
            ProductLeaderboardScore.score,
            ProductLeaderboardScore.upvotes,
        )
        .join(Product, Product.id == ProductLeaderboardScore.product_id)
        .where(
            and_(
                ProductLeaderboardScore.run_id == run_id,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
    )
    if category_slug:
        stmt = stmt.join(Category, Category.id == Product.category_id).where(
            Category.slug == category_slug
        )
    if verified_revenue_only:
        stmt = stmt.join(
            PaymentConnector, PaymentConnector.product_id == Product.id
        ).where(_verified_revenue_condition())

    stmt = stmt.order_by(
        ProductLeaderboardScore.score.desc(),
        ProductLeaderboardScore.upvotes.desc(),
        ProductLeaderboardScore.product_id.asc(),
    ).limit(limit)

    rows = (await session.exec(stmt)).all()
    product_ids = [int(row[0]) for row in rows]
    score_map = {int(row[0]): int(row[1] or 0) for row in rows}
    return product_ids, score_map


async def _compute_period_scores(
    session: Session,
    *,
    period_start: datetime,
    period_end: datetime,
    category_slug: str | None,
    verified_revenue_only: bool,
    limit: int | None,
) -> tuple[list[int], dict[int, int]]:
    start_date = period_start.date()
    end_date = (period_end - timedelta(days=1)).date()

    traffic_stmt = (
        select(
            ProductTrafficDaily.product_id,
            func.sum(ProductTrafficDaily.page_views).label("views"),
            func.sum(ProductTrafficDaily.unique_visitors).label("visitors"),
        )
        .join(Product, Product.id == ProductTrafficDaily.product_id)
        .where(
            and_(
                ProductTrafficDaily.date >= start_date,
                ProductTrafficDaily.date <= end_date,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
        .group_by(ProductTrafficDaily.product_id)
    )
    if category_slug:
        traffic_stmt = traffic_stmt.join(
            Category, Category.id == Product.category_id
        ).where(Category.slug == category_slug)
    if verified_revenue_only:
        traffic_stmt = traffic_stmt.join(
            PaymentConnector, PaymentConnector.product_id == Product.id
        ).where(_verified_revenue_condition())

    upvote_stmt = (
        select(
            ProductUpvote.product_id,
            func.count(ProductUpvote.id).label("upvotes"),
        )
        .join(Product, Product.id == ProductUpvote.product_id)
        .where(
            and_(
                ProductUpvote.created_at >= period_start,
                ProductUpvote.created_at < period_end,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
        .group_by(ProductUpvote.product_id)
    )
    if category_slug:
        upvote_stmt = upvote_stmt.join(
            Category, Category.id == Product.category_id
        ).where(Category.slug == category_slug)
    if verified_revenue_only:
        upvote_stmt = upvote_stmt.join(
            PaymentConnector, PaymentConnector.product_id == Product.id
        ).where(_verified_revenue_condition())

    traffic_rows = (await session.exec(traffic_stmt)).all()
    upvote_rows = (await session.exec(upvote_stmt)).all()

    views_map = {int(row[0]): int(row[1] or 0) for row in traffic_rows}
    visitors_map = {int(row[0]): int(row[2] or 0) for row in traffic_rows}
    upvotes_map = {int(row[0]): int(row[1] or 0) for row in upvote_rows}

    product_ids = set(views_map.keys()) | set(visitors_map.keys()) | set(
        upvotes_map.keys()
    )
    if not product_ids:
        return [], {}

    verified_ids = await _fetch_verified_revenue_product_ids(
        session, list(product_ids)
    )

    scored_rows = []
    for product_id in product_ids:
        views = views_map.get(product_id, 0)
        visitors = visitors_map.get(product_id, 0)
        upvotes = upvotes_map.get(product_id, 0)
        base_score = (
            views * LEADERBOARD_SCORE_WEIGHT_VIEWS
            + visitors * LEADERBOARD_SCORE_WEIGHT_UNIQUE
            + upvotes * LEADERBOARD_SCORE_WEIGHT_UPVOTES
        )
        if base_score <= 0:
            continue
        multiplier = (
            LEADERBOARD_VERIFIED_MULTIPLIER
            if product_id in verified_ids
            else 1.0
        )
        score = int(round(base_score * multiplier))
        scored_rows.append((product_id, score, upvotes))

    scored_rows.sort(key=lambda row: (-row[1], -row[2], row[0]))
    if isinstance(limit, int):
        scored_rows = scored_rows[:limit]

    ordered_ids = [row[0] for row in scored_rows]
    score_map = {row[0]: row[1] for row in scored_rows}
    return ordered_ids, score_map


async def _build_leaderboard_archive(session: Session) -> LeaderboardArchive:
    now = datetime.now(timezone.utc)
    earliest_month = _shift_month(
        datetime(now.year, now.month, 1, tzinfo=timezone.utc),
        -(LEADERBOARD_ARCHIVE_LOOKBACK_MONTHS - 1),
    )

    months: set[tuple[int, int]] = set()
    weeks: set[tuple[int, int]] = set()

    score_exists = exists(
        select(ProductLeaderboardScore.id).where(
            and_(
                ProductLeaderboardScore.run_id == LeaderboardRun.id,
                ProductLeaderboardScore.score > 0,
            )
        )
    )
    run_stmt = (
        select(LeaderboardRun.period_start, LeaderboardRun.period_end)
        .where(
            and_(
                LeaderboardRun.period_start >= earliest_month,
                score_exists,
            )
        )
        .order_by(LeaderboardRun.period_start.desc())
    )

    runs = (await session.exec(run_stmt)).all()
    for period_start, period_end in runs:
        duration_days = int((period_end - period_start).days)
        if duration_days == 7 or duration_days == 1:
            iso_year, iso_week, _ = period_start.isocalendar()
            weeks.add((iso_year, iso_week))
            months.add((period_start.year, period_start.month))
        elif 28 <= duration_days <= 32:
            months.add((period_start.year, period_start.month))

    upvote_stmt = (
        select(ProductUpvote.created_at)
        .join(Product, Product.id == ProductUpvote.product_id)
        .where(
            and_(
                ProductUpvote.created_at >= earliest_month,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
    )
    upvote_rows = (await session.exec(upvote_stmt)).all()
    for (created_at,) in upvote_rows:
        iso_year, iso_week, _ = created_at.isocalendar()
        weeks.add((iso_year, iso_week))
        months.add((created_at.year, created_at.month))

    sorted_months = sorted(list(months), key=lambda row: (row[0], row[1]), reverse=True)
    sorted_weeks = sorted(
        list(weeks),
        key=lambda row: (
            _start_of_iso_week(row[0], row[1]) or datetime.min.replace(tzinfo=timezone.utc)
        ),
        reverse=True,
    )

    return LeaderboardArchive(
        months=[
            LeaderboardArchiveMonth(year=year, month=month)
            for year, month in sorted_months
        ],
        weeks=[
            LeaderboardArchiveWeek(year=year, week=week)
            for year, week in sorted_weeks
        ],
    )


def _map_product_to_card(
    product: Product,
    *,
    now: datetime,
    score_map: dict[int, int],
    interest_map: dict[int, ProductInterestSignals],
) -> PublicProductCard:
    badges = _resolve_product_badges(product, now)
    is_sponsored = _is_sponsored(product)
    revenue_cents, revenue_currency = _resolve_product_revenue(product.payment_connector)
    interest = interest_map.get(product.id)

    category = (
        ProductCategorySummary(
            name=product.category.name if product.category else None,
            slug=product.category.slug if product.category else None,
        )
        if product.category
        else None
    )

    return PublicProductCard(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        logo=product.logo,
        tagline=product.tagline or "",
        category=category,
        badges=badges,
        sponsored=is_sponsored,
        isVerified=bool(product.verification and product.verification.is_verified),
        createdAt=product.created_at.isoformat() if product.created_at else None,
        updatedAt=product.updated_at.isoformat() if product.updated_at else None,
        latestRevenueCents=revenue_cents,
        revenueCurrencyCode=revenue_currency if revenue_cents is not None else None,
        scoreCount=score_map.get(product.id),
        interest=interest,
    )


async def _fetch_browse_products(
    session: Session,
    *,
    use_case_slug: str | None,
    category_slug: str | None,
    verified: bool,
    sort: str,
    page: int,
    page_size: int,
    query: str | None,
    platform: Platform | None,
    pricing_model: PricingModel | None,
    product_type: ProductType | None,
) -> tuple[list[Product], bool, int]:
    category_ids = await _resolve_browse_category_ids(
        session, use_case_slug=use_case_slug, category_slug=category_slug
    )

    if category_ids is not None and not category_ids:
        return [], False, 0

    conditions = [Product.status == ProductStatus.PUBLISHED]

    if category_ids:
        conditions.append(Product.category_id.in_(category_ids))

    if platform:
        conditions.append(Product.platforms.any(platform))

    if pricing_model:
        conditions.append(Product.pricing_model == pricing_model)

    if product_type:
        conditions.append(Product.type == product_type)

    if verified:
        verified_exists = exists(
            select(ProductVerification.id).where(
                and_(
                    ProductVerification.product_id == Product.id,
                    ProductVerification.is_verified.is_(True),
                )
            )
        )
        conditions.append(verified_exists)

    if query:
        like = f"%{query}%"
        tokens = [token for token in re.split(r"[\\s,]+", query) if token]
        tokens_lower = [token.lower() for token in tokens]
        keyword_values = {query, *tokens, *tokens_lower}
        keyword_conditions = [
            Product.keywords.any(value) for value in keyword_values if value
        ]
        category_match = exists(
            select(Category.id).where(
                and_(Category.id == Product.category_id, Category.name.ilike(like))
            )
        )
        conditions.append(
            or_(
                Product.name.ilike(like),
                Product.tagline.ilike(like),
                Product.description.ilike(like),
                category_match,
                *keyword_conditions,
            )
        )

    base_filter = and_(*conditions)

    priority_exists = exists(
        select(PlanFeatureAssignment.id)
        .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
        .where(
            and_(
                PlanFeatureAssignment.plan_id == Product.plan_id,
                PlanFeatureAssignment.enabled.is_(True),
                PlanFeature.key == PRIORITY_FEATURE_KEY,
            )
        )
    )

    priority_filter = and_(base_filter, priority_exists)
    regular_filter = and_(base_filter, ~priority_exists)

    total_priority = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(priority_filter))).one()
    )
    total_regular = _scalar_value(
        (await session.exec(select(func.count(Product.id)).where(regular_filter))).one()
    )

    skip = (page - 1) * page_size

    if skip < total_priority:
        priority_skip = skip
        priority_take = min(page_size, total_priority - priority_skip)
        regular_skip = 0
        regular_take = max(0, page_size - priority_take)
    else:
        priority_skip = total_priority
        priority_take = 0
        regular_skip = skip - total_priority
        regular_take = page_size

    if sort == "az":
        order_by = [Product.name.asc()]
    elif sort in {"votes", "trending"}:
        order_by = [
            func.coalesce(ProductAnalytics.upvotes, 0).desc(),
            Product.created_at.desc(),
        ]
    else:
        order_by = [Product.created_at.desc()]

    products: list[Product] = []

    if priority_take > 0:
        priority_stmt = (
            select(Product)
            .outerjoin(ProductAnalytics)
            .where(priority_filter)
            .order_by(*order_by)
            .options(*_product_load_options())
            .offset(priority_skip)
            .limit(priority_take)
        )
        products.extend((await session.exec(priority_stmt)).scalars().all())

    if regular_take > 0:
        regular_stmt = (
            select(Product)
            .outerjoin(ProductAnalytics)
            .where(regular_filter)
            .order_by(*order_by)
            .options(*_product_load_options())
            .offset(regular_skip)
            .limit(regular_take)
        )
        products.extend((await session.exec(regular_stmt)).scalars().all())

    total = total_priority + total_regular
    has_more = skip + len(products) < total

    return products, has_more, total


def _build_browse_filter_summary(
    filters: BrowseFilters,
    *,
    use_cases: list[UseCaseSummary],
    categories: list[CategorySummary],
    result_count: int,
) -> list[str]:
    sort_label = BROWSE_SORT_LABELS.get(filters.sort, BROWSE_SORT_LABELS["new"])
    summary = [
        f"Showing {result_count} {_pluralize(result_count, 'result')}",
        f"Sorted by {sort_label}",
    ]

    if filters.useCase:
        label = next(
            (entry.label for entry in use_cases if entry.slug == filters.useCase),
            None,
        )
        if label:
            summary.append(f"Use case: {label}")

    if filters.category:
        label = next(
            (entry.name for entry in categories if entry.slug == filters.category),
            None,
        )
        if label:
            summary.append(f"Category: {label}")

    if filters.verified:
        summary.append("Verified makers only")

    return summary


def _map_product_to_feed_item(
    product: Product,
    *,
    now: datetime,
    score_map: dict[int, int],
    interest_map: dict[int, ProductInterestSignals],
) -> HomepageFeedItem:
    badges = _resolve_product_badges(product, now)
    is_sponsored = _is_sponsored(product)
    revenue_cents, revenue_currency = _resolve_product_revenue(product.payment_connector)
    interest = interest_map.get(product.id)

    return HomepageFeedItem(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        logo=product.logo,
        tagline=product.tagline or "",
        createdAt=product.created_at.isoformat(),
        updatedAt=product.updated_at.isoformat(),
        badges=badges,
        category=product.category.name if product.category else None,
        categorySlug=product.category.slug if product.category else None,
        scoreCount=score_map.get(product.id),
        isSponsored=is_sponsored,
        isVoted=False,
        isVerified=bool(product.verification and product.verification.is_verified),
        variant="sponsored" if is_sponsored else "default",
        latestRevenueCents=revenue_cents,
        revenueCurrencyCode=revenue_currency if revenue_cents is not None else None,
        interest=interest,
        shuffleRank=random.random(),
    )


async def _fetch_products_by_ids(
    session: Session, product_ids: Sequence[int]
) -> list[Product]:
    if not product_ids:
        return []
    stmt = (
        select(Product)
        .where(Product.id.in_(product_ids))
        .options(*_product_load_options())
    )
    rows = (await session.exec(stmt)).scalars().all()
    product_map = {product.id: product for product in rows}
    return [product_map[product_id] for product_id in product_ids if product_id in product_map]


async def _fetch_new_feed_products(
    session: Session, *, page: int, page_size: int
) -> tuple[list[Product], bool]:
    stmt = (
        select(Product)
        .outerjoin(ProductAnalytics)
        .where(Product.status == ProductStatus.PUBLISHED)
        .order_by(
            Product.created_at.desc(),
            func.coalesce(ProductAnalytics.upvotes, 0).desc(),
        )
        .options(*_product_load_options())
    )
    offset = (page - 1) * page_size
    rows = (
        await session.exec(stmt.offset(offset).limit(page_size + 1))
    ).scalars().all()
    has_more = len(rows) > page_size
    return rows[:page_size], has_more


def _verified_revenue_condition():
    revenue_exists = exists(
        select(PaymentRevenueSnapshot.id).where(
            and_(
                PaymentRevenueSnapshot.connector_id == PaymentConnector.id,
                PaymentRevenueSnapshot.all_time_revenue_cents > 0,
            )
        )
    )
    return and_(
        PaymentConnector.status == PaymentConnectorStatus.ACTIVE,
        PaymentConnector.verified_at.isnot(None),
        or_(
            PaymentConnector.latest_all_time_revenue_cents > 0,
            revenue_exists,
        ),
    )


async def _fetch_verified_revenue_products(
    session: Session, *, page: int, page_size: int
) -> tuple[list[Product], bool]:
    stmt = (
        select(Product)
        .join(PaymentConnector, PaymentConnector.product_id == Product.id)
        .outerjoin(ProductAnalytics, ProductAnalytics.product_id == Product.id)
        .where(
            and_(
                Product.status == ProductStatus.PUBLISHED,
                _verified_revenue_condition(),
            )
        )
        .order_by(
            PaymentConnector.latest_all_time_revenue_cents.desc().nullslast(),
            func.coalesce(ProductAnalytics.upvotes, 0).desc(),
            Product.created_at.desc(),
        )
        .options(*_product_load_options())
    )
    offset = (page - 1) * page_size
    rows = (
        await session.exec(stmt.offset(offset).limit(page_size + 1))
    ).scalars().all()
    has_more = len(rows) > page_size
    return rows[:page_size], has_more


async def _fetch_verified_revenue_products_page(
    session: Session, *, page: int, page_size: int
) -> tuple[list[Product], bool, int]:
    conditions = and_(
        Product.status == ProductStatus.PUBLISHED,
        _verified_revenue_condition(),
    )
    stmt = (
        select(Product)
        .join(PaymentConnector, PaymentConnector.product_id == Product.id)
        .outerjoin(ProductAnalytics, ProductAnalytics.product_id == Product.id)
        .where(conditions)
        .order_by(
            PaymentConnector.latest_all_time_revenue_cents.desc().nullslast(),
            func.coalesce(ProductAnalytics.upvotes, 0).desc(),
            Product.created_at.desc(),
        )
        .options(*_product_load_options())
    )
    count_stmt = (
        select(func.count(Product.id))
        .join(PaymentConnector, PaymentConnector.product_id == Product.id)
        .where(conditions)
    )
    total = _scalar_value((await session.exec(count_stmt)).one())
    offset = (page - 1) * page_size
    rows = (
        await session.exec(stmt.offset(offset).limit(page_size + 1))
    ).scalars().all()
    has_more = len(rows) > page_size
    return rows[:page_size], has_more, total


async def _fetch_most_clicked_products(
    session: Session, *, page: int, page_size: int, days: int = 7
) -> tuple[list[Product], bool]:
    start_dt, end_dt = _utc_range_for_days(days)
    aggregate_stmt = (
        select(
            ProductTrafficDaily.product_id,
            func.sum(ProductTrafficDaily.page_views).label("views"),
        )
        .join(Product, Product.id == ProductTrafficDaily.product_id)
        .where(
            and_(
                Product.status == ProductStatus.PUBLISHED,
                ProductTrafficDaily.date >= start_dt,
                ProductTrafficDaily.date <= end_dt,
            )
        )
        .group_by(ProductTrafficDaily.product_id)
        .order_by(func.sum(ProductTrafficDaily.page_views).desc())
    )
    offset = (page - 1) * page_size
    rows = (await session.exec(aggregate_stmt.offset(offset).limit(page_size + 1))).all()
    has_more = len(rows) > page_size
    product_ids = [row[0] for row in rows[:page_size]]
    products = await _fetch_products_by_ids(session, product_ids)
    return products, has_more


async def _build_homepage_feed_page(
    session: Session, *, view: str, page: int, page_size: int
) -> HomepageFeedPageResult:
    if view == HomepageFeedView.VERIFIED_REVENUE.value:
        products, has_more = await _fetch_verified_revenue_products(
            session, page=page, page_size=page_size
        )
    elif view == HomepageFeedView.MOST_CLICKED.value:
        products, has_more = await _fetch_most_clicked_products(
            session, page=page, page_size=page_size
        )
    else:
        products, has_more = await _fetch_new_feed_products(
            session, page=page, page_size=page_size
        )

    product_ids = [product.id for product in products]
    score_map = await _fetch_score_map(session, product_ids)
    interest_map = await _fetch_interest_map(session, product_ids)
    now = datetime.now(timezone.utc)

    items = [
        _map_product_to_feed_item(
            product,
            now=now,
            score_map=score_map,
            interest_map=interest_map,
        )
        for product in products
    ]
    next_page = page + 1 if has_more else None

    return HomepageFeedPageResult(
        items=items,
        page=page,
        pageSize=page_size,
        hasMore=has_more,
        nextPage=next_page,
    )


@router.get("/homepage/feed", response_model=HomepageFeedPageResult)
async def get_homepage_feed(
    request: Request,
    *,
    view: str | None = Query(None),
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> HomepageFeedPageResult:
    normalized_view = _normalize_view(view)
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size(page_size, HOMEPAGE_FEED_PAGE_SIZE)

    async def build_payload() -> dict:
        result = await _build_homepage_feed_page(
            session, view=normalized_view, page=safe_page, page_size=safe_page_size
        )
        return result.model_dump(mode="json")

    payload = await cached_json(
        "public:homepage-feed",
        ttl_seconds=HOMEPAGE_FEED_CACHE_TTL,
        path=request.url.path,
        params=[
            ("view", normalized_view),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return HomepageFeedPageResult.model_validate(payload)


@router.get("/homepage/feed/all", response_model=HomepageFeedAllResult)
async def get_homepage_feed_all(
    request: Request,
    *,
    view: str | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    max_pages: int | None = Query(None, alias="maxPages"),
    session: Session = Depends(get_session),
) -> HomepageFeedAllResult:
    normalized_view = _normalize_view(view)
    safe_page_size = _normalize_page_size(page_size, HOMEPAGE_FEED_PAGE_SIZE)
    if max_pages is None:
        max_pages = (
            5
            if normalized_view
            in {HomepageFeedView.VERIFIED_REVENUE.value, HomepageFeedView.MOST_CLICKED.value}
            else 100
        )
    try:
        max_pages_value = int(max_pages)
    except (TypeError, ValueError):
        max_pages_value = 1
    safe_max_pages = max(1, max_pages_value)

    async def build_payload() -> dict:
        items: list[HomepageFeedItem] = []
        page = 1
        iterations = 0

        while iterations < safe_max_pages:
            result = await _build_homepage_feed_page(
                session, view=normalized_view, page=page, page_size=safe_page_size
            )
            items.extend(result.items)
            iterations += 1
            if not result.hasMore or not result.nextPage:
                break
            if result.nextPage == page:
                break
            page = result.nextPage

        if normalized_view == HomepageFeedView.VERIFIED_REVENUE.value:
            def sort_key(item: HomepageFeedItem) -> tuple[int, int, int]:
                revenue = item.latestRevenueCents or 0
                score = item.scoreCount or 0
                created = int(datetime.fromisoformat(item.createdAt).timestamp())
                return (-revenue, -score, -created)

            items.sort(key=sort_key)

        return HomepageFeedAllResult(items=items).model_dump(mode="json")

    payload = await cached_json(
        "public:homepage-feed-all",
        ttl_seconds=HOMEPAGE_FEED_CACHE_TTL,
        path=request.url.path,
        params=[
            ("view", normalized_view),
            ("pageSize", str(safe_page_size)),
            ("maxPages", str(safe_max_pages)),
        ],
        builder=build_payload,
    )
    return HomepageFeedAllResult.model_validate(payload)


@router.get(
    "/verified-revenue/products",
    response_model=VerifiedRevenueProductsPageResult,
)
async def get_verified_revenue_products(
    request: Request,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> VerifiedRevenueProductsPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size,
        VERIFIED_REVENUE_PAGE_SIZE,
        VERIFIED_REVENUE_MAX_PAGE_SIZE,
    )

    async def build_payload() -> dict:
        products, has_more, total = await _fetch_verified_revenue_products_page(
            session,
            page=safe_page,
            page_size=safe_page_size,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)
        items = [
            _map_product_to_feed_item(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]
        payload = VerifiedRevenueProductsPageResult(
            items=items,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:verified-revenue-products",
        ttl_seconds=VERIFIED_REVENUE_CACHE_TTL,
        path=request.url.path,
        params=[
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return VerifiedRevenueProductsPageResult.model_validate(payload)


@router.get("/plans", response_model=list[PublicPlan])
async def get_public_plans(
    request: Request,
    *,
    type: str | None = Query(None),
    session: Session = Depends(get_session),
) -> list[PublicPlan]:
    plan_type = _normalize_plan_type(type)

    async def build_payload() -> list[dict]:
        stmt = (
            select(Plan)
            .options(
                selectinload(Plan.assignments),
            )
            .order_by(Plan.price.asc())
        )
        if plan_type:
            stmt = stmt.where(Plan.type == plan_type)
        plans = (await session.exec(stmt)).scalars().all()
        features = (
            await session.exec(select(PlanFeature).order_by(PlanFeature.name.asc()))
        ).scalars().all()
        count_rows = (
            await session.exec(
                select(Product.plan_id, func.count(Product.id))
                .where(Product.plan_id.is_not(None))
                .group_by(Product.plan_id)
            )
        ).all()
        product_counts = {
            int(row[0]): int(row[1] or 0) for row in count_rows if row[0] is not None
        }
        payload = [
            _map_public_plan(
                plan,
                features=features,
                product_count=product_counts.get(plan.id or 0, 0),
            ).model_dump(mode="json")
            for plan in plans
        ]
        return payload

    payload = await cached_json(
        "public:plans",
        ttl_seconds=PLANS_CACHE_TTL,
        path=request.url.path,
        params=[("type", plan_type.value if plan_type else "")],
        builder=build_payload,
    )
    return [PublicPlan.model_validate(item) for item in payload]


@router.get("/browse", response_model=BrowsePagePayload)
async def get_browse_page(
    request: Request,
    *,
    use_case: str | None = Query(None, alias="useCase"),
    category: str | None = Query(None),
    verified: bool | None = Query(None),
    sort: str | None = Query(None),
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    query: str | None = Query(None, alias="q"),
    platform: str | None = Query(None),
    pricing_model: str | None = Query(None, alias="pricingModel"),
    product_type: str | None = Query(None, alias="productType"),
    session: Session = Depends(get_session),
) -> BrowsePagePayload:
    normalized_use_case = _normalize_filter_slug(use_case)
    normalized_category = _normalize_filter_slug(category)
    normalized_sort = _normalize_browse_sort(sort)
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size(page_size, BROWSE_PAGE_SIZE)
    normalized_query = _normalize_query(query)
    platform_enum = _parse_platform(platform)
    pricing_enum = _parse_pricing_model(pricing_model)
    product_type_enum = _parse_product_type(product_type)

    filters = BrowseFilters(
        useCase=normalized_use_case,
        category=normalized_category,
        verified=bool(verified),
        sort=normalized_sort,
        page=safe_page,
        pageSize=safe_page_size,
        query=normalized_query,
        platform=platform if platform_enum else None,
        pricingModel=pricing_model if pricing_enum else None,
        productType=product_type if product_type_enum else None,
    )

    async def build_payload() -> dict:
        use_cases = await _fetch_use_case_summaries(session)
        categories = await _fetch_category_summaries(session)
        products, has_more, total = await _fetch_browse_products(
            session,
            use_case_slug=normalized_use_case,
            category_slug=normalized_category,
            verified=bool(verified),
            sort=normalized_sort,
            page=safe_page,
            page_size=safe_page_size,
            query=normalized_query,
            platform=platform_enum,
            pricing_model=pricing_enum,
            product_type=product_type_enum,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        filter_summary = _build_browse_filter_summary(
            filters,
            use_cases=use_cases,
            categories=categories,
            result_count=len(items),
        )

        has_active_filters = bool(
            filters.useCase
            or filters.category
            or filters.verified
            or filters.query
            or filters.sort != "new"
            or filters.platform
            or filters.pricingModel
            or filters.productType
        )

        payload = BrowsePagePayload(
            filters=filters,
            products=items,
            hasMore=has_more,
            total=total,
            useCases=use_cases,
            categories=categories,
            filterSummary=filter_summary,
            hasActiveFilters=has_active_filters,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:browse-page",
        ttl_seconds=BROWSE_CACHE_TTL,
        path=request.url.path,
        params=[
            ("useCase", normalized_use_case or ""),
            ("category", normalized_category or ""),
            ("verified", str(bool(verified)).lower()),
            ("sort", normalized_sort),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
            ("q", normalized_query or ""),
            ("platform", platform or ""),
            ("pricingModel", pricing_model or ""),
            ("productType", product_type or ""),
        ],
        builder=build_payload,
    )
    return BrowsePagePayload.model_validate(payload)


@router.get("/browse/products", response_model=BrowseProductsPageResult)
async def get_browse_products(
    request: Request,
    *,
    use_case: str | None = Query(None, alias="useCase"),
    category: str | None = Query(None),
    verified: bool | None = Query(None),
    sort: str | None = Query(None),
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    query: str | None = Query(None, alias="q"),
    platform: str | None = Query(None),
    pricing_model: str | None = Query(None, alias="pricingModel"),
    product_type: str | None = Query(None, alias="productType"),
    session: Session = Depends(get_session),
) -> BrowseProductsPageResult:
    normalized_use_case = _normalize_filter_slug(use_case)
    normalized_category = _normalize_filter_slug(category)
    normalized_sort = _normalize_browse_sort(sort)
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size(page_size, BROWSE_PAGE_SIZE)
    normalized_query = _normalize_query(query)
    platform_enum = _parse_platform(platform)
    pricing_enum = _parse_pricing_model(pricing_model)
    product_type_enum = _parse_product_type(product_type)

    async def build_payload() -> dict:
        products, has_more, total = await _fetch_browse_products(
            session,
            use_case_slug=normalized_use_case,
            category_slug=normalized_category,
            verified=bool(verified),
            sort=normalized_sort,
            page=safe_page,
            page_size=safe_page_size,
            query=normalized_query,
            platform=platform_enum,
            pricing_model=pricing_enum,
            product_type=product_type_enum,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = BrowseProductsPageResult(
            items=items,
            hasMore=has_more,
            page=safe_page,
            pageSize=safe_page_size,
            total=total,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:browse-products",
        ttl_seconds=BROWSE_CACHE_TTL,
        path=request.url.path,
        params=[
            ("useCase", normalized_use_case or ""),
            ("category", normalized_category or ""),
            ("verified", str(bool(verified)).lower()),
            ("sort", normalized_sort),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
            ("q", normalized_query or ""),
            ("platform", platform or ""),
            ("pricingModel", pricing_model or ""),
            ("productType", product_type or ""),
        ],
        builder=build_payload,
    )
    return BrowseProductsPageResult.model_validate(payload)


@router.get("/categories/{slug}/detail", response_model=CategoryDetailPayload)
async def get_category_detail(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> CategoryDetailPayload:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, CATEGORY_PRODUCTS_PAGE_SIZE, CATEGORY_PRODUCTS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        category = await _fetch_category_by_slug(session, slug)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        products, has_more, total = await _fetch_category_products_page(
            session,
            category_id=category.id,
            page=safe_page,
            page_size=safe_page_size,
        )

        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_feed_item(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = CategoryDetailPayload(
            category=CategorySummary(
                id=str(category.id),
                name=category.name,
                slug=category.slug,
                description=category.description,
                icon=category.icon,
                count=total,
            ),
            productsPage=CategoryProductsPageResult(
                items=items,
                total=total,
                page=safe_page,
                pageSize=safe_page_size,
                hasMore=has_more,
                nextPage=safe_page + 1 if has_more else None,
            ),
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:category-detail",
        ttl_seconds=CATEGORIES_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return CategoryDetailPayload.model_validate(payload)


@router.get("/trends/categories/{slug}", response_model=CategoryTrendsPayload)
async def get_category_trends(
    request: Request,
    slug: str,
    *,
    revenue: str | None = Query(None),
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> CategoryTrendsPayload:
    safe_limit = max(
        1,
        min(limit or TRENDING_CATEGORY_DEFAULT_LIMIT, TRENDING_CATEGORY_MAX_LIMIT),
    )
    revenue_filter = (revenue or "").strip().lower()
    verified_only = revenue_filter == "verified"
    now = datetime.now(timezone.utc)
    start_dt, end_dt = _utc_range_for_days(TRENDING_CATEGORY_DAYS, now=now)

    async def build_payload() -> dict:
        category = await _fetch_category_by_slug(session, slug)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        count_stmt = select(func.count(Product.id)).where(
            and_(
                Product.status == ProductStatus.PUBLISHED,
                Product.category_id == category.id,
            )
        )
        total_products = _scalar_value((await session.exec(count_stmt)).one())

        traffic_stmt = (
            select(
                ProductTrafficDaily.product_id,
                func.sum(ProductTrafficDaily.page_views).label("page_views"),
            )
            .join(Product, Product.id == ProductTrafficDaily.product_id)
            .where(
                and_(
                    Product.status == ProductStatus.PUBLISHED,
                    Product.category_id == category.id,
                    ProductTrafficDaily.date >= start_dt,
                    ProductTrafficDaily.date <= end_dt,
                )
            )
            .group_by(ProductTrafficDaily.product_id)
        )
        rows = (await session.exec(traffic_stmt)).all()

        if not rows:
            payload = CategoryTrendsPayload(
                category=CategorySummary(
                    id=str(category.id),
                    name=category.name,
                    slug=category.slug,
                    description=category.description,
                    icon=category.icon,
                    count=total_products,
                ),
                items=[],
                total=0,
            )
            return payload.model_dump(mode="json")

        product_ids = [int(row[0]) for row in rows]
        verified_ids = await _fetch_verified_revenue_product_ids(session, product_ids)

        scored: list[tuple[int, float, int]] = []
        for product_id, clicks in rows:
            clicks_value = int(clicks or 0)
            if clicks_value <= 0:
                continue
            is_verified = product_id in verified_ids
            if verified_only and not is_verified:
                continue
            multiplier = VERIFIED_REVENUE_RANKING_MULTIPLIER if is_verified else 1.0
            scored.append((int(product_id), clicks_value * multiplier, clicks_value))

        scored.sort(key=lambda row: (row[1], row[2]), reverse=True)
        ordered_ids = [row[0] for row in scored[:safe_limit]]

        if not ordered_ids:
            payload = CategoryTrendsPayload(
                category=CategorySummary(
                    id=str(category.id),
                    name=category.name,
                    slug=category.slug,
                    description=category.description,
                    icon=category.icon,
                    count=total_products,
                ),
                items=[],
                total=0,
            )
            return payload.model_dump(mode="json")

        products = await _fetch_products_by_ids(session, ordered_ids)
        score_map = await _fetch_score_map(session, ordered_ids)
        interest_map = await _fetch_interest_map(session, ordered_ids)
        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = CategoryTrendsPayload(
            category=CategorySummary(
                id=str(category.id),
                name=category.name,
                slug=category.slug,
                description=category.description,
                icon=category.icon,
                count=total_products,
            ),
            items=items,
            total=len(scored),
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:trends-category",
        ttl_seconds=TRENDING_PRODUCTS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("revenue", revenue_filter),
            ("limit", str(safe_limit)),
        ],
        builder=build_payload,
    )
    return CategoryTrendsPayload.model_validate(payload)


@router.get("/categories/{slug}/products", response_model=CategoryProductsPageResult)
async def get_category_products(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> CategoryProductsPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, CATEGORY_PRODUCTS_PAGE_SIZE, CATEGORY_PRODUCTS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        category = await _fetch_category_by_slug(session, slug)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        products, has_more, total = await _fetch_category_products_page(
            session,
            category_id=category.id,
            page=safe_page,
            page_size=safe_page_size,
        )

        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_feed_item(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = CategoryProductsPageResult(
            items=items,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:category-products",
        ttl_seconds=CATEGORIES_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return CategoryProductsPageResult.model_validate(payload)


@router.get("/users", response_model=PublicUsersPageResult)
async def get_public_users(
    request: Request,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> PublicUsersPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, USERS_PAGE_SIZE, USERS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        total_stmt = select(func.count(func.distinct(Product.user_id))).where(
            Product.status == ProductStatus.PUBLISHED
        )
        total = _scalar_value((await session.exec(total_stmt)).one())

        stmt = (
            select(
                User.id,
                User.clerk_id,
                User.first_name,
                User.last_name,
                func.count(Product.id).label("product_count"),
            )
            .join(Product, Product.user_id == User.id)
            .where(Product.status == ProductStatus.PUBLISHED)
            .group_by(User.id)
            .order_by(func.count(Product.id).desc())
            .offset((safe_page - 1) * safe_page_size)
            .limit(safe_page_size)
        )
        rows = (await session.exec(stmt)).all()
        user_ids = [int(row[0]) for row in rows]
        revenue_map = await _build_user_revenue_map(session, user_ids=user_ids)
        avatar_map = await _resolve_clerk_avatar_map([row[1] for row in rows])

        items = []
        for row in rows:
            user_id = int(row[0])
            revenue = revenue_map.get(user_id) or {}
            items.append(
                PublicUserSummary(
                    id=str(user_id),
                    clerkId=row[1],
                    firstName=row[2],
                    lastName=row[3],
                    avatarUrl=avatar_map.get(row[1]),
                    productCount=int(row[4] or 0),
                    latestRevenueCents=revenue.get("cents"),
                    revenueCurrencyCode=revenue.get("currency"),
                )
            )

        has_more = (safe_page - 1) * safe_page_size + len(items) < total
        payload = PublicUsersPageResult(
            items=items,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:users-page",
        ttl_seconds=USERS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return PublicUsersPageResult.model_validate(payload)


@router.get("/users/{user_id}/meta", response_model=PublicUserMeta)
async def get_public_user_meta(
    request: Request,
    user_id: str,
    session: Session = Depends(get_session),
) -> PublicUserMeta:
    user_pk = _parse_user_id(user_id)

    async def build_payload() -> dict:
        user = (await session.exec(select(User).where(User.id == user_pk))).scalars().one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        payload = PublicUserMeta(firstName=user.first_name, lastName=user.last_name)
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:user-meta",
        ttl_seconds=USER_META_CACHE_TTL,
        path=request.url.path,
        params=[("userId", str(user_pk))],
        builder=build_payload,
    )
    return PublicUserMeta.model_validate(payload)


@router.get("/users/{user_id}/products", response_model=UserProductsPageResult)
async def get_public_user_products(
    request: Request,
    user_id: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> UserProductsPageResult:
    user_pk = _parse_user_id(user_id)
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, USER_PRODUCTS_PAGE_SIZE, USER_PRODUCTS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        products, has_more, total = await _fetch_user_products_page(
            session,
            user_id=user_pk,
            page=safe_page,
            page_size=safe_page_size,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_feed_item(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = UserProductsPageResult(
            items=items,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:user-products",
        ttl_seconds=USER_PRODUCTS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("userId", str(user_pk)),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return UserProductsPageResult.model_validate(payload)


@router.get("/users/{user_id}/payload", response_model=UserProfilePayload)
async def get_public_user_payload(
    request: Request,
    user_id: str,
    session: Session = Depends(get_session),
) -> UserProfilePayload:
    user_pk = _parse_user_id(user_id)

    async def build_payload() -> dict:
        user = (await session.exec(select(User).where(User.id == user_pk))).scalars().one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        products, has_more, total_products = await _fetch_user_products_page(
            session,
            user_id=user_pk,
            page=1,
            page_size=USER_PRODUCTS_PAGE_SIZE,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_feed_item(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        products_page = UserProductsPageResult(
            items=items,
            total=total_products,
            page=1,
            pageSize=USER_PRODUCTS_PAGE_SIZE,
            hasMore=has_more,
            nextPage=2 if has_more else None,
        )

        upvote_stmt = (
            select(func.coalesce(func.sum(ProductAnalytics.upvotes), 0))
            .join(Product, Product.id == ProductAnalytics.product_id)
            .where(
                and_(
                    Product.user_id == user_pk,
                    Product.status == ProductStatus.PUBLISHED,
                )
            )
        )
        total_upvotes = _scalar_value((await session.exec(upvote_stmt)).one())

        verified_stmt = select(func.count(Product.id)).where(
            and_(
                Product.user_id == user_pk,
                Product.status == ProductStatus.PUBLISHED,
                Product.verification.has(ProductVerification.is_verified.is_(True)),
            )
        )
        verified_count = _scalar_value((await session.exec(verified_stmt)).one())

        category_stmt = (
            select(
                Category.name,
                func.count(Product.id).label("product_count"),
            )
            .join(Product, Product.category_id == Category.id)
            .where(
                and_(
                    Product.user_id == user_pk,
                    Product.status == ProductStatus.PUBLISHED,
                )
            )
            .group_by(Category.name)
        )
        category_rows = (await session.exec(category_stmt)).all()
        category_entries = [
            UserProfileCategoryEntry(name=row[0], count=int(row[1] or 0))
            for row in category_rows
        ]
        category_entries.sort(key=lambda entry: entry.count, reverse=True)
        focus_categories = [entry.name for entry in category_entries[:4]]
        extra_category_count = max(len(category_entries) - len(focus_categories), 0)

        badge_stmt = (
            select(ProductBadge.badge)
            .join(Product, Product.id == ProductBadge.product_id)
            .where(
                and_(
                    Product.user_id == user_pk,
                    Product.status == ProductStatus.PUBLISHED,
                    or_(
                        ProductBadge.expires_at.is_(None),
                        ProductBadge.expires_at > now,
                    ),
                )
            )
            .order_by(ProductBadge.created_at.desc())
        )
        badge_rows = (await session.exec(badge_stmt)).all()
        showcase: list[str] = []
        overflow = 0
        seen_badges: set[str] = set()
        for (badge,) in badge_rows:
            if badge in seen_badges:
                continue
            seen_badges.add(badge)
            if len(showcase) < 6:
                showcase.append(badge)
            else:
                overflow += 1

        earliest_stmt = text(
            """
            SELECT MIN(COALESCE("published_at", "created_at")) AS earliest
            FROM "product"
            WHERE "user_id" = :user_id AND "status" = :status
            """
        )
        earliest_row = (await session.exec(earliest_stmt.params(
            user_id=user_pk, status=ProductStatus.PUBLISHED.value
        ))).first()
        earliest_value = earliest_row[0] if earliest_row else None
        earliest_launch = (
            earliest_value.isoformat() if isinstance(earliest_value, datetime) else None
        )

        reward_balance_stmt = select(RewardBalance.balance).where(
            RewardBalance.user_id == user_pk
        )
        reward_balance_row = (await session.exec(reward_balance_stmt)).one_or_none()
        reward_points = int(reward_balance_row[0]) if reward_balance_row else 0

        revenue_map = await _build_user_revenue_map(session, user_ids=[user_pk])
        revenue_entry = revenue_map.get(user_pk) or {}
        total_verified_revenue_cents = int(revenue_entry.get("cents") or 0)
        total_verified_revenue_currency = (
            str(revenue_entry.get("currency"))
            if total_verified_revenue_cents > 0
            else None
        )

        leaderboard_position = await _build_rewards_leaderboard_position(
            session, user_id=user_pk
        )
        avatar_url = await get_clerk_avatar_url(user.clerk_id)

        profile = PublicUserProfile(
            id=str(user.id),
            clerkId=user.clerk_id,
            firstName=user.first_name,
            lastName=user.last_name,
            avatarUrl=avatar_url,
            productCount=total_products,
        )

        payload = UserProfilePayload(
            profile=profile,
            leaderboardPosition=leaderboard_position,
            productsPage=products_page,
            totalProducts=total_products,
            totalUpvotes=total_upvotes,
            totalVerifiedRevenueCents=total_verified_revenue_cents,
            totalVerifiedRevenueCurrency=total_verified_revenue_currency,
            rewardPoints=reward_points,
            verifiedCount=verified_count,
            categories=category_entries,
            focusCategories=focus_categories,
            extraCategoryCount=extra_category_count,
            badges=UserProfileBadgeSummary(showcase=showcase, overflow=overflow),
            earliestLaunch=earliest_launch,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:user-profile",
        ttl_seconds=USER_PROFILE_CACHE_TTL,
        path=request.url.path,
        params=[("userId", str(user_pk))],
        builder=build_payload,
    )
    return UserProfilePayload.model_validate(payload)


@router.get("/categories/directory", response_model=CategoriesDirectoryPayload)
async def get_categories_directory(
    request: Request,
    session: Session = Depends(get_session),
) -> CategoriesDirectoryPayload:
    async def build_payload() -> dict:
        categories = await _fetch_category_summaries(session)
        total_products = sum(category.count for category in categories)
        category_count = len(categories)
        average_per_category = (
            max(1, round(total_products / category_count)) if category_count > 0 else 0
        )

        highlight_categories = sorted(
            categories,
            key=lambda entry: (-entry.count, entry.name.lower()),
        )[:CATEGORY_HIGHLIGHT_LIMIT]

        payload = CategoriesDirectoryPayload(
            categories=categories,
            highlightCategories=highlight_categories,
            categoryCount=category_count,
            totalProducts=total_products,
            averagePerCategory=average_per_category,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:categories-directory",
        ttl_seconds=CATEGORIES_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return CategoriesDirectoryPayload.model_validate(payload)


@router.get("/use-cases/directory", response_model=UseCasesDirectoryPayload)
async def get_use_cases_directory(
    request: Request,
    session: Session = Depends(get_session),
) -> UseCasesDirectoryPayload:
    async def build_payload() -> dict:
        use_cases = await _fetch_use_case_summaries(session)
        filtered = [entry for entry in use_cases if entry.productCount > 0]
        total_products = sum(entry.productCount for entry in filtered)
        use_case_count = len(filtered)
        average_per_use_case = (
            max(1, round(total_products / use_case_count)) if use_case_count > 0 else 0
        )

        highlight = sorted(
            filtered,
            key=lambda entry: (-entry.productCount, entry.label.lower()),
        )[:USE_CASE_HIGHLIGHT_LIMIT]

        payload = UseCasesDirectoryPayload(
            useCases=filtered,
            highlightUseCases=highlight,
            useCaseCount=use_case_count,
            totalProducts=total_products,
            averagePerUseCase=average_per_use_case,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:use-cases-directory",
        ttl_seconds=USE_CASES_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return UseCasesDirectoryPayload.model_validate(payload)


@router.get("/use-cases/{slug}/meta", response_model=UseCaseMeta)
async def get_use_case_meta(
    request: Request,
    slug: str,
    session: Session = Depends(get_session),
) -> UseCaseMeta:
    async def build_payload() -> dict:
        use_case = (
            await session.exec(select(UseCase).where(UseCase.slug == slug))
        ).scalars().one_or_none()
        if not use_case:
            raise HTTPException(status_code=404, detail="Use case not found")

        counts = await _fetch_use_case_counts(session)
        payload = UseCaseMeta(
            id=str(use_case.id),
            label=use_case.label,
            slug=use_case.slug,
            createdAt=use_case.created_at.isoformat(),
            updatedAt=use_case.updated_at.isoformat(),
            productCount=counts.get(use_case.id, 0),
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:use-case-meta",
        ttl_seconds=USE_CASES_CACHE_TTL,
        path=request.url.path,
        params=[("slug", slug)],
        builder=build_payload,
    )
    return UseCaseMeta.model_validate(payload)


@router.get("/use-cases/{slug}/detail", response_model=UseCaseDetailPayload)
async def get_use_case_detail(
    request: Request,
    slug: str,
    session: Session = Depends(get_session),
) -> UseCaseDetailPayload:
    async def build_payload() -> dict:
        use_case = (
            await session.exec(select(UseCase).where(UseCase.slug == slug))
        ).scalars().one_or_none()
        if not use_case:
            raise HTTPException(status_code=404, detail="Use case not found")

        categories, product_count = await _fetch_use_case_categories(
            session, use_case.id
        )
        payload = UseCaseDetailPayload(
            useCase=UseCaseMeta(
                id=str(use_case.id),
                label=use_case.label,
                slug=use_case.slug,
                createdAt=use_case.created_at.isoformat(),
                updatedAt=use_case.updated_at.isoformat(),
                productCount=product_count,
            ),
            categories=categories,
            productCount=product_count,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:use-case-detail",
        ttl_seconds=USE_CASES_CACHE_TTL,
        path=request.url.path,
        params=[("slug", slug)],
        builder=build_payload,
    )
    return UseCaseDetailPayload.model_validate(payload)


@router.get("/tags/directory", response_model=TagDirectoryPageResult)
async def get_tag_directory(
    request: Request,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    include_total: bool | None = Query(None, alias="includeTotal"),
    session: Session = Depends(get_session),
) -> TagDirectoryPageResult:
    safe_page = _normalize_page(page, 1)
    try:
        parsed_page_size = int(page_size) if page_size is not None else TAG_DIRECTORY_DEFAULT_PAGE_SIZE
    except (TypeError, ValueError):
        parsed_page_size = TAG_DIRECTORY_DEFAULT_PAGE_SIZE
    if parsed_page_size <= 0:
        parsed_page_size = TAG_DIRECTORY_DEFAULT_PAGE_SIZE
    safe_page_size = max(1, min(parsed_page_size, TAG_LIST_LIMIT))
    limit = min(TAG_LIST_LIMIT, safe_page_size + 1)
    offset = max(0, (safe_page - 1) * safe_page_size)

    async def build_payload() -> dict:
        status_value = ProductStatus.PUBLISHED.name
        tag_stmt = text(
            """
            WITH expanded AS (
              SELECT
                LOWER(TRIM(k)) AS keyword,
                TRIM(k) AS raw_keyword,
                SUBSTRING(md5(LOWER(TRIM(k))), 1, 6) AS hash,
                p.id AS product_id,
                COALESCE(p.updated_at, p.published_at, p.created_at) AS updated_at
              FROM product p
              CROSS JOIN LATERAL UNNEST(p.keywords) AS k
              WHERE
                p.status = :status
                AND k IS NOT NULL
                AND TRIM(k) <> ''
            )
            SELECT
              keyword,
              MIN(raw_keyword) AS canonical,
              hash,
              COUNT(DISTINCT product_id)::int AS product_count,
              MAX(updated_at) AS last_updated
            FROM expanded
            GROUP BY keyword, hash
            ORDER BY product_count DESC, canonical ASC
            OFFSET :offset
            LIMIT :limit
            """
        )

        rows = (
            await session.exec(
                tag_stmt,
                params={"offset": offset, "limit": limit, "status": status_value},
            )
        ).all()
        items: list[TagSummary] = []

        for row in rows[:safe_page_size]:
            keyword = row[0]
            canonical = row[1]
            hash_value = row[2]
            product_count = int(row[3] or 0)
            last_updated = row[4].isoformat() if row[4] else None
            items.append(
                TagSummary(
                    keyword=keyword,
                    canonical=canonical,
                    hash=hash_value,
                    slug=_keyword_to_slug(keyword),
                    productCount=product_count,
                    lastUpdated=last_updated,
                )
            )

        has_more = len(rows) > safe_page_size
        total = None

        if include_total:
            total_stmt = text(
                """
                WITH expanded AS (
                  SELECT
                    LOWER(TRIM(k)) AS keyword,
                    COALESCE(p.updated_at, p.published_at, p.created_at) AS updated_at
                  FROM product p
                  CROSS JOIN LATERAL UNNEST(p.keywords) AS k
                  WHERE
                    p.status = :status
                    AND k IS NOT NULL
                    AND TRIM(k) <> ''
                ),
                grouped AS (
                  SELECT
                    keyword,
                    MAX(updated_at) AS last_updated
                  FROM expanded
                  GROUP BY keyword
                )
                SELECT COUNT(*)::int AS total
                FROM grouped
                """
            )
            total_row = (
                await session.exec(total_stmt, params={"status": status_value})
            ).one_or_none()
            total = int(total_row[0] or 0) if total_row else 0

        payload = TagDirectoryPageResult(
            items=items,
            hasMore=has_more,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:tags-directory",
        ttl_seconds=TAGS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
            ("includeTotal", str(bool(include_total)).lower()),
        ],
        builder=build_payload,
    )
    return TagDirectoryPageResult.model_validate(payload)


@router.get("/tags/{slug}/detail", response_model=TagDetailPayload)
async def get_tag_detail(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> TagDetailPayload:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, TAG_PRODUCTS_PAGE_SIZE, TAG_PRODUCTS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        page_result = await _fetch_tag_products_page(
            session,
            slug=slug,
            page=safe_page,
            page_size=safe_page_size,
        )
        if not page_result:
            raise HTTPException(status_code=404, detail="Tag not found")

        payload = TagDetailPayload(
            summary=page_result.summary,
            productsPage=page_result,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:tag-detail",
        ttl_seconds=TAGS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return TagDetailPayload.model_validate(payload)


@router.get("/tags/{slug}/products", response_model=TagProductsPageResult)
async def get_tag_products(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> TagProductsPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, TAG_PRODUCTS_PAGE_SIZE, TAG_PRODUCTS_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        page_result = await _fetch_tag_products_page(
            session,
            slug=slug,
            page=safe_page,
            page_size=safe_page_size,
        )
        if not page_result:
            raise HTTPException(status_code=404, detail="Tag not found")
        return page_result.model_dump(mode="json")

    payload = await cached_json(
        "public:tag-products",
        ttl_seconds=TAGS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return TagProductsPageResult.model_validate(payload)


@router.get("/alternatives/catalog", response_model=AlternativeCatalogPageResult)
async def get_alternative_catalog(
    request: Request,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    query: str | None = Query(None, alias="q"),
    session: Session = Depends(get_session),
) -> AlternativeCatalogPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = max(
        1,
        min(
            _normalize_page_size(page_size, ALTERNATIVE_CATALOG_PAGE_SIZE),
            ALTERNATIVE_CATALOG_MAX_PAGE_SIZE,
        ),
    )
    trimmed_query = _normalize_query(query)
    skip = (safe_page - 1) * safe_page_size
    take = safe_page_size + 1

    async def build_payload() -> dict:
        search_filter = None
        if trimmed_query:
            like = f"%{trimmed_query}%"
            category_match = exists(
                select(AlternativeProductCategoryLink.alternative_product_id)
                .join(Category, Category.id == AlternativeProductCategoryLink.category_id)
                .where(
                    and_(
                        AlternativeProductCategoryLink.alternative_product_id
                        == AlternativeProduct.id,
                        Category.name.ilike(like),
                    )
                )
            )
            product_match = exists(
                select(ProductAlternativeProductLink.alternative_product_id)
                .join(Product, Product.id == ProductAlternativeProductLink.product_id)
                .where(
                    and_(
                        ProductAlternativeProductLink.alternative_product_id
                        == AlternativeProduct.id,
                        Product.name.ilike(like),
                    )
                )
            )
            search_filter = or_(
                AlternativeProduct.name.ilike(like),
                AlternativeProduct.description.ilike(like),
                category_match,
                product_match,
            )

        stmt = (
            select(
                AlternativeProduct.id,
                AlternativeProduct.name,
                AlternativeProduct.slug,
                AlternativeProduct.description,
                AlternativeProduct.website_url,
                AlternativeProduct.logo_url,
                func.count(ProductAlternativeProductLink.product_id).label("product_count"),
            )
            .join(
                ProductAlternativeProductLink,
                ProductAlternativeProductLink.alternative_product_id == AlternativeProduct.id,
            )
            .group_by(AlternativeProduct.id)
            .order_by(AlternativeProduct.name.asc())
            .offset(skip)
            .limit(take)
        )

        if search_filter is not None:
            stmt = stmt.where(search_filter)

        rows = (await session.exec(stmt)).all()
        has_more = len(rows) > safe_page_size
        items: list[AlternativeCatalogItem] = []

        for row in rows[:safe_page_size]:
            items.append(
                AlternativeCatalogItem(
                    id=str(row[0]),
                    name=row[1],
                    slug=row[2],
                    description=row[3],
                    websiteUrl=row[4],
                    logoUrl=row[5],
                    productCount=int(row[6] or 0),
                )
            )

        payload = AlternativeCatalogPageResult(
            items=items,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
            page=safe_page,
            pageSize=safe_page_size,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:alternatives-catalog",
        ttl_seconds=ALTERNATIVES_CACHE_TTL,
        path=request.url.path,
        params=[
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
            ("q", trimmed_query or ""),
        ],
        builder=build_payload,
    )
    return AlternativeCatalogPageResult.model_validate(payload)


@router.get("/alternatives/{slug}/detail", response_model=AlternativeDetailPayload)
async def get_alternative_detail(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> AlternativeDetailPayload:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, ALTERNATIVE_DETAIL_PAGE_SIZE, ALTERNATIVE_DETAIL_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        alternative = await _fetch_alternative_by_slug(session, slug)
        if not alternative:
            raise HTTPException(status_code=404, detail="Alternative not found")

        products, has_more, total = await _fetch_alternative_products_page(
            session,
            alternative_id=alternative.id,
            page=safe_page,
            page_size=safe_page_size,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        featured = await _fetch_featured_alternatives(
            session,
            exclude_id=alternative.id,
            limit=6,
        )

        payload = AlternativeDetailPayload(
            alternative=AlternativeDetailSummary(
                id=str(alternative.id),
                name=alternative.name,
                slug=alternative.slug,
                description=alternative.description,
                websiteUrl=alternative.website_url,
                logoUrl=alternative.logo_url,
                productCount=total,
            ),
            productsPage=AlternativeProductsPageResult(
                items=items,
                total=total,
                page=safe_page,
                pageSize=safe_page_size,
                hasMore=has_more,
                nextPage=safe_page + 1 if has_more else None,
            ),
            featuredAlternatives=featured,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:alternative-detail",
        ttl_seconds=ALTERNATIVES_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return AlternativeDetailPayload.model_validate(payload)


@router.get("/alternatives/{slug}/products", response_model=AlternativeProductsPageResult)
async def get_alternative_products(
    request: Request,
    slug: str,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> AlternativeProductsPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_page_size_with_max(
        page_size, ALTERNATIVE_DETAIL_PAGE_SIZE, ALTERNATIVE_DETAIL_MAX_PAGE_SIZE
    )

    async def build_payload() -> dict:
        alternative = await _fetch_alternative_by_slug(session, slug)
        if not alternative:
            raise HTTPException(status_code=404, detail="Alternative not found")

        products, has_more, total = await _fetch_alternative_products_page(
            session,
            alternative_id=alternative.id,
            page=safe_page,
            page_size=safe_page_size,
        )
        product_ids = [product.id for product in products]
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        now = datetime.now(timezone.utc)

        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]

        payload = AlternativeProductsPageResult(
            items=items,
            total=total,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:alternative-products",
        ttl_seconds=ALTERNATIVES_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return AlternativeProductsPageResult.model_validate(payload)


@router.get("/products/{slug}/detail", response_model=PublicProductDetailPayload)
async def get_product_detail(
    request: Request,
    slug: str,
    *,
    session: Session = Depends(get_session),
) -> PublicProductDetailPayload:
    async def build_payload() -> dict:
        product = await _fetch_product_by_slug(session, slug)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        upvote_count = await _fetch_product_upvote_count(session, product.id)
        interest_map = await _fetch_interest_map(session, [product.id])
        user_avatar_url = await get_clerk_avatar_url(
            product.user.clerk_id if product.user else None
        )
        payload = _map_product_detail_payload(
            product,
            upvote_count=upvote_count,
            interest=interest_map.get(product.id),
            user_avatar_url=user_avatar_url,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:product-detail",
        ttl_seconds=PRODUCT_DETAIL_CACHE_TTL,
        path=request.url.path,
        params=[("slug", slug)],
        builder=build_payload,
    )
    return PublicProductDetailPayload.model_validate(payload)


@router.get("/products/{slug}/meta", response_model=PublicProductMetaPayload)
async def get_product_meta(
    request: Request,
    slug: str,
    *,
    session: Session = Depends(get_session),
) -> PublicProductMetaPayload:
    async def build_payload() -> dict:
        product = await _fetch_product_by_slug(session, slug)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")
        user_avatar_url = await get_clerk_avatar_url(
            product.user.clerk_id if product.user else None
        )
        payload = _map_product_meta_payload(product, user_avatar_url=user_avatar_url)
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:product-meta",
        ttl_seconds=PRODUCT_META_CACHE_TTL,
        path=request.url.path,
        params=[("slug", slug)],
        builder=build_payload,
    )
    return PublicProductMetaPayload.model_validate(payload)


@router.get("/products/{slug}/redirect", response_model=PublicProductRedirectPayload)
async def get_product_redirect(
    request: Request,
    slug: str,
    *,
    utm_content: str | None = Query(None, alias="utmContent"),
    session: Session = Depends(get_session),
) -> PublicProductRedirectPayload:
    async def build_payload() -> dict:
        product = await _fetch_product_by_slug(session, slug)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found.")

        fallback_path = f"/products/{product.slug}"
        destination = None

        if product.website_url:
            normalized = _ensure_http_url(product.website_url)
            if normalized:
                destination = _add_utm_params(
                    normalized,
                    {
                        "source": "shipyard",
                        "medium": "referral",
                        "campaign": product.metadata_record.utm_campaign
                        if product.metadata_record
                        else None,
                        "content": utm_content,
                    },
                )

        payload = PublicProductRedirectPayload(
            destination=destination,
            fallbackPath=fallback_path,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:product-redirect",
        ttl_seconds=PRODUCT_META_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("utmContent", utm_content or ""),
        ],
        builder=build_payload,
    )
    return PublicProductRedirectPayload.model_validate(payload)


@router.get("/products/{product_id}/revenue", response_model=ProductRevenueSummary | None)
async def get_product_revenue(
    request: Request,
    product_id: str,
    *,
    session: Session = Depends(get_session),
) -> ProductRevenueSummary | None:
    product_pk = _parse_product_id(product_id)
    await _assert_published_product(session, product_pk)

    async def build_payload() -> dict | None:
        stmt = (
            select(PaymentConnector)
            .where(PaymentConnector.product_id == product_pk)
            .options(selectinload(PaymentConnector.revenue_history))
        )
        connector = (await session.exec(stmt)).scalars().one_or_none()
        if not connector:
            return None
        summary = build_revenue_summary(connector)
        return summary

    payload = await cached_json(
        "public:product-revenue",
        ttl_seconds=PRODUCT_REVENUE_CACHE_TTL,
        path=request.url.path,
        params=[("productId", str(product_pk))],
        builder=build_payload,
    )
    if payload is None:
        return None
    return ProductRevenueSummary.model_validate(payload)


@router.get("/products/{product_id}/leaderboard", response_model=PublicProductLeaderboardScore)
async def get_product_leaderboard_score(
    request: Request,
    product_id: str,
    *,
    session: Session = Depends(get_session),
) -> PublicProductLeaderboardScore:
    product_pk = _parse_product_id(product_id)
    await _assert_published_product(session, product_pk)

    async def build_payload() -> dict:
        period_start, period_end = _current_leaderboard_window()
        run = await _fetch_leaderboard_run(
            session, period_start=period_start, period_end=period_end
        )
        if not run:
            return PublicProductLeaderboardScore(points=0, rank=None, available=False).model_dump(
                mode="json"
            )
        stmt = select(ProductLeaderboardScore).where(
            and_(
                ProductLeaderboardScore.run_id == run.id,
                ProductLeaderboardScore.product_id == product_pk,
            )
        )
        score = (await session.exec(stmt)).scalars().one_or_none()
        if not score:
            return PublicProductLeaderboardScore(points=0, rank=None, available=False).model_dump(
                mode="json"
            )
        return PublicProductLeaderboardScore(
            points=int(score.score or 0),
            rank=score.rank,
            available=True,
        ).model_dump(mode="json")

    payload = await cached_json(
        "public:product-leaderboard",
        ttl_seconds=PRODUCT_LEADERBOARD_CACHE_TTL,
        path=request.url.path,
        params=[("productId", str(product_pk))],
        builder=build_payload,
    )
    return PublicProductLeaderboardScore.model_validate(payload)


@router.get("/products/{product_id}/upvote-status", response_model=PublicProductUpvoteState)
async def get_product_upvote_status(
    product_id: str,
    *,
    user_id: OptionalUserId = None,
    session: Session = Depends(get_session),
) -> PublicProductUpvoteState:
    product_pk = _parse_product_id(product_id)
    await _assert_published_product(session, product_pk)

    upvote_count = await _fetch_product_upvote_count(session, product_pk)
    if not user_id:
        return PublicProductUpvoteState(upvoted=False, upvotes=upvote_count)

    user = await get_user_by_clerk_id(session, user_id)
    if not user or user.status != UserStatus.ACTIVE:
        return PublicProductUpvoteState(upvoted=False, upvotes=upvote_count)

    stmt = select(ProductUpvote.id).where(
        and_(ProductUpvote.product_id == product_pk, ProductUpvote.user_id == user.id)
    )
    exists_row = (await session.exec(stmt)).first()
    return PublicProductUpvoteState(upvoted=bool(exists_row), upvotes=upvote_count)


@router.post("/products/{product_id}/upvote", response_model=PublicProductUpvoteState)
async def upvote_product(
    product_id: str,
    *,
    clerk_id: CurrentUserId,
    session: Session = Depends(get_session),
) -> PublicProductUpvoteState:
    product_pk = _parse_product_id(product_id)
    await _assert_published_product(session, product_pk)

    user = await get_or_create_user_by_clerk_id(session, clerk_id)
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Account is not active.")

    existing_stmt = select(ProductUpvote.id).where(
        and_(ProductUpvote.product_id == product_pk, ProductUpvote.user_id == user.id)
    )
    existing = (await session.exec(existing_stmt)).first()
    if not existing:
        session.add(ProductUpvote(product_id=product_pk, user_id=user.id))
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()

    upvote_count = await _fetch_product_upvote_count(session, product_pk)
    return PublicProductUpvoteState(upvoted=True, upvotes=upvote_count)


@router.get("/use-cases/{slug}/products", response_model=list[PublicProductCard])
async def get_use_case_products(
    request: Request,
    slug: str,
    *,
    exclude_id: str | None = Query(None, alias="excludeId"),
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[PublicProductCard]:
    safe_limit = max(1, min(limit or 6, 12))
    exclude_pk = _parse_product_id(exclude_id) if exclude_id else None

    async def build_payload() -> list[dict]:
        stmt = (
            select(Product.id)
            .join(Category, Category.id == Product.category_id)
            .join(UseCaseCategory, UseCaseCategory.category_id == Category.id)
            .join(UseCase, UseCase.id == UseCaseCategory.use_case_id)
            .where(
                and_(
                    UseCase.slug == slug,
                    Product.status == ProductStatus.PUBLISHED,
                )
            )
            .order_by(func.random())
            .limit(safe_limit)
        )
        if exclude_pk is not None:
            stmt = stmt.where(Product.id != exclude_pk)
        rows = (await session.exec(stmt)).all()
        product_ids = [int(row[0]) for row in rows]
        if not product_ids:
            return []
        products = await _fetch_products_by_ids(session, product_ids)
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        items = [
            _map_product_to_card(product, score_map=score_map, interest_map=interest_map)
            for product in products
        ]
        return [item.model_dump(mode="json") for item in items]

    payload = await cached_json(
        "public:use-case-products",
        ttl_seconds=PRODUCT_SIMILAR_CACHE_TTL,
        path=request.url.path,
        params=[
            ("slug", slug),
            ("excludeId", exclude_id or ""),
            ("limit", str(safe_limit)),
        ],
        builder=build_payload,
    )
    return [PublicProductCard.model_validate(item) for item in payload]


async def _resolve_realtime_visitors(session: Session) -> int:
    stmt = select(SiteTrafficDaily.unique_visitors).order_by(SiteTrafficDaily.date.desc()).limit(1)
    row = (await session.exec(stmt)).one_or_none()
    if row is None:
        return 1
    return max(_scalar_value(row), 0)


async def _build_leaderboard_stats(session: Session) -> LeaderboardStats:
    total_products = _scalar_value(
        (await session.exec(select(func.count(Product.id)))).one()
    )
    total_creators = _scalar_value(
        (await session.exec(select(func.count(User.id)))).one()
    )
    total_upvotes = _scalar_value(
        (
            await session.exec(
                select(func.coalesce(func.sum(ProductAnalytics.upvotes), 0))
            )
        ).one()
    )
    top_score = _scalar_value(
        (
            await session.exec(
                select(func.coalesce(func.max(ProductAnalytics.upvotes), 0))
            )
        ).one()
    )

    start_dt, end_dt = _utc_range_for_days(30)
    traffic_stmt = (
        select(
            SiteTrafficDaily.date,
            func.sum(SiteTrafficDaily.page_views).label("page_views"),
            func.sum(SiteTrafficDaily.unique_visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficDaily.date >= start_dt,
                SiteTrafficDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficDaily.date)
        .order_by(SiteTrafficDaily.date.asc())
    )

    traffic_rows = (await session.exec(traffic_stmt)).all()
    traffic_series: list[TrafficPoint] = []
    page_views_total = 0
    visitors_total = 0

    for row in traffic_rows:
        date_value = row[0]
        page_views = int(row[1] or 0)
        visitors = int(row[2] or 0)
        page_views_total += page_views
        visitors_total += visitors
        traffic_series.append(
            TrafficPoint(
                date=date_value.date().isoformat(),
                pageViews=page_views,
                visitors=visitors,
            )
        )

    realtime_visitors = await _resolve_realtime_visitors(session)

    return LeaderboardStats(
        totalProducts=total_products,
        totalCreators=total_creators,
        totalUpvotes=total_upvotes,
        topScore=top_score,
        pageViews30=page_views_total,
        visitors30=visitors_total,
        trafficSeries=traffic_series,
        realtimeVisitors=realtime_visitors,
    )


@router.get("/leaderboard/stats", response_model=LeaderboardStats)
async def get_leaderboard_stats(
    request: Request,
    session: Session = Depends(get_session),
) -> LeaderboardStats:
    async def build_payload() -> dict:
        stats = await _build_leaderboard_stats(session)
        return stats.model_dump(mode="json")

    payload = await cached_json(
        "public:leaderboard-stats",
        ttl_seconds=LEADERBOARD_STATS_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return LeaderboardStats.model_validate(payload)


@router.get("/leaderboard/page", response_model=LeaderboardPagePayload)
async def get_leaderboard_page(
    request: Request,
    category: str | None = Query(None),
    limit: int | None = Query(None),
    verified: bool | None = Query(None),
    session: Session = Depends(get_session),
) -> LeaderboardPagePayload:
    safe_limit = _normalize_leaderboard_limit(limit)
    category_slug = category.strip() if category else None
    verified_revenue_only = bool(verified)

    async def build_payload() -> dict:
        stats = await _build_leaderboard_stats(session)
        categories = await _fetch_category_summaries(session)
        period_start, period_end = _current_leaderboard_window()
        run = await _fetch_leaderboard_run(
            session, period_start=period_start, period_end=period_end
        )

        product_ids: list[int] = []
        score_map: dict[int, int] = {}
        if run:
            product_ids, score_map = await _fetch_leaderboard_product_ids(
                session,
                run_id=run.id,
                limit=safe_limit,
                category_slug=category_slug,
                verified_revenue_only=verified_revenue_only,
            )

        products = await _fetch_products_by_ids(session, product_ids)
        interest_map = (
            await _fetch_interest_map(session, product_ids)
            if product_ids
            else {}
        )
        now = datetime.now(timezone.utc)
        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]
        category_name = (
            next((entry.name for entry in categories if entry.slug == category_slug), None)
            if category_slug
            else None
        )

        payload = LeaderboardPagePayload(
            filters=LeaderboardPageFilters(
                categorySlug=category_slug,
                limit=safe_limit,
                verifiedRevenueOnly=verified_revenue_only,
            ),
            stats=stats,
            categories=categories,
            products=items,
            categoryName=category_name,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:leaderboard-page",
        ttl_seconds=LEADERBOARD_PAGE_CACHE_TTL,
        path=request.url.path,
        params=[
            ("category", category_slug or ""),
            ("limit", str(safe_limit)),
            ("verified", str(verified_revenue_only).lower()),
        ],
        builder=build_payload,
    )
    return LeaderboardPagePayload.model_validate(payload)


@router.get("/leaderboard/periodic", response_model=PeriodicLeaderboardPayload)
async def get_periodic_leaderboard(
    request: Request,
    period: LeaderboardPeriod = Query(LeaderboardPeriod.DAY),
    year: int = Query(..., ge=1970, le=3000),
    month: int | None = Query(None, ge=1, le=12),
    day: int | None = Query(None, ge=1, le=31),
    week: int | None = Query(None, ge=1, le=53),
    limit: int | None = Query(None),
    verified: bool | None = Query(None),
    category: str | None = Query(None),
    session: Session = Depends(get_session),
) -> PeriodicLeaderboardPayload:
    category_slug = category.strip() if category else None
    verified_revenue_only = bool(verified)
    window = _resolve_period_window(
        period=period, year=year, month=month, day=day, week=week
    )
    if not window:
        raise HTTPException(status_code=404, detail="Period not available")
    period_start, period_end, period_label = window

    today = datetime.now(timezone.utc)
    today = datetime.combine(today.date(), time.min, tzinfo=timezone.utc)
    if period_start > today:
        raise HTTPException(status_code=404, detail="Period not available")

    safe_limit = (
        _normalize_leaderboard_limit(limit)
        if limit is not None
        else LEADERBOARD_MAX_LIMIT
    )

    async def build_payload() -> dict:
        product_ids: list[int] = []
        score_map: dict[int, int] = {}

        if period == LeaderboardPeriod.MONTH:
            run = await _fetch_leaderboard_run(
                session, period_start=period_start, period_end=period_end
            )
            if run:
                product_ids, score_map = await _fetch_leaderboard_product_ids(
                    session,
                    run_id=run.id,
                    limit=safe_limit,
                    category_slug=category_slug,
                    verified_revenue_only=verified_revenue_only,
                )

        if not product_ids:
            product_ids, score_map = await _compute_period_scores(
                session,
                period_start=period_start,
                period_end=period_end,
                category_slug=category_slug,
                verified_revenue_only=verified_revenue_only,
                limit=safe_limit,
            )

        products = await _fetch_products_by_ids(session, product_ids)
        interest_map = (
            await _fetch_interest_map(session, product_ids)
            if product_ids
            else {}
        )
        now = datetime.now(timezone.utc)
        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]
        archive = await _build_leaderboard_archive(session)

        payload = PeriodicLeaderboardPayload(
            period=period,
            periodLabel=period_label,
            periodStart=period_start.isoformat(),
            periodEnd=period_end.isoformat(),
            products=items,
            archive=archive,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:leaderboard-periodic",
        ttl_seconds=LEADERBOARD_PERIODIC_CACHE_TTL,
        path=request.url.path,
        params=[
            ("period", period.value),
            ("year", str(year)),
            ("month", str(month or "")),
            ("day", str(day or "")),
            ("week", str(week or "")),
            ("limit", str(safe_limit)),
            ("category", category_slug or ""),
            ("verified", str(verified_revenue_only).lower()),
        ],
        builder=build_payload,
    )
    return PeriodicLeaderboardPayload.model_validate(payload)


@router.get("/leaderboard/months", response_model=list[MonthlyLeaderboardMonth])
async def get_leaderboard_months(
    request: Request,
    session: Session = Depends(get_session),
) -> list[MonthlyLeaderboardMonth]:
    async def build_payload() -> list[dict]:
        stmt = (
            select(LeaderboardRun.period_start)
            .distinct()
            .order_by(LeaderboardRun.period_start.desc())
        )
        rows = (await session.exec(stmt)).all()
        months = [
            MonthlyLeaderboardMonth(
                month=_month_key(period_start),
                label=period_start.strftime("%B %Y"),
            )
            for (period_start,) in rows
        ]
        return [month.model_dump(mode="json") for month in months]

    payload = await cached_json(
        "public:leaderboard-months",
        ttl_seconds=LEADERBOARD_MONTHS_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return [MonthlyLeaderboardMonth.model_validate(item) for item in payload]


def _analytics_share(value: int, total: int) -> float:
    return (value / total) * 100 if total > 0 else 0.0


def _analytics_label(date_value: datetime) -> str:
    return f"{date_value.strftime('%b')} {date_value.day}"


async def _build_site_analytics_snapshot(
    session: Session,
    *,
    start_dt: datetime,
    end_dt: datetime,
    top_product_limit: int,
) -> AnalyticsSnapshot:
    daily_rows = (
        await session.exec(
            select(SiteTrafficDaily)
            .where(
                and_(
                    SiteTrafficDaily.source == AnalyticsDataSource.GA4,
                    SiteTrafficDaily.date >= start_dt,
                    SiteTrafficDaily.date <= end_dt,
                )
            )
            .order_by(SiteTrafficDaily.date.asc())
        )
    ).scalars().all()

    daily_by_date = {row.date.date(): row for row in daily_rows}
    page_views = 0
    unique_visitors = 0
    sessions = 0
    new_users = 0
    bounce_weighted = 0.0
    duration_weighted = 0.0
    engagement_weighted = 0.0

    for row in daily_rows:
        page_views += int(row.page_views or 0)
        unique_visitors += int(row.unique_visitors or 0)
        sessions += int(row.sessions or 0)
        new_users += int(row.new_users or 0)
        bounce_weighted += float(row.bounce_rate or 0) * int(row.sessions or 0)
        duration_weighted += float(row.average_session_duration or 0) * int(
            row.sessions or 0
        )
        engagement_weighted += float(row.engagement_rate or 0) * int(
            row.sessions or 0
        )

    bounce_rate = bounce_weighted / sessions if sessions > 0 else 0.0
    average_session_duration = duration_weighted / sessions if sessions > 0 else 0.0
    engagement_rate = engagement_weighted / sessions if sessions > 0 else 0.0
    pages_per_session = page_views / sessions if sessions > 0 else 0.0
    resolved_new_users = new_users if new_users > 0 else min(unique_visitors, sessions)

    start_date = start_dt.date()
    end_date = end_dt.date()
    days = max((end_date - start_date).days + 1, 1)
    timeseries: list[AnalyticsTimeseriesPoint] = []

    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        row = daily_by_date.get(current_date)
        day_dt = datetime.combine(current_date, time.min, tzinfo=timezone.utc)
        timeseries.append(
            AnalyticsTimeseriesPoint(
                date=day_dt.isoformat(),
                label=_analytics_label(day_dt),
                pageViews=int(row.page_views or 0) if row else 0,
                uniqueVisitors=int(row.unique_visitors or 0) if row else 0,
            )
        )

    referrer_stmt = (
        select(
            SiteTrafficReferrerDaily.referrer,
            func.sum(SiteTrafficReferrerDaily.page_views).label("views"),
        )
        .where(
            and_(
                SiteTrafficReferrerDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficReferrerDaily.date >= start_dt,
                SiteTrafficReferrerDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficReferrerDaily.referrer)
        .order_by(func.sum(SiteTrafficReferrerDaily.page_views).desc())
        .limit(12)
    )
    referrer_rows = (await session.exec(referrer_stmt)).all()
    referrers = [
        AnalyticsReferrer(
            referrer=row[0],
            views=int(row[1] or 0),
            share=_analytics_share(int(row[1] or 0), page_views),
        )
        for row in referrer_rows
    ]

    browser_stmt = (
        select(
            SiteTrafficBrowserDaily.browser,
            func.sum(SiteTrafficBrowserDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficBrowserDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficBrowserDaily.date >= start_dt,
                SiteTrafficBrowserDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficBrowserDaily.browser)
        .order_by(func.sum(SiteTrafficBrowserDaily.visitors).desc())
        .limit(8)
    )
    browser_rows = (await session.exec(browser_stmt)).all()
    browsers = [
        AnalyticsBrowser(
            browser=row[0],
            visitors=int(row[1] or 0),
            share=_analytics_share(int(row[1] or 0), unique_visitors),
        )
        for row in browser_rows
    ]

    os_stmt = (
        select(
            SiteTrafficOperatingSystemDaily.operating_system,
            func.sum(SiteTrafficOperatingSystemDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficOperatingSystemDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficOperatingSystemDaily.date >= start_dt,
                SiteTrafficOperatingSystemDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficOperatingSystemDaily.operating_system)
        .order_by(func.sum(SiteTrafficOperatingSystemDaily.visitors).desc())
        .limit(8)
    )
    os_rows = (await session.exec(os_stmt)).all()
    operating_systems = [
        AnalyticsOperatingSystem(
            os=row[0],
            visitors=int(row[1] or 0),
            share=_analytics_share(int(row[1] or 0), unique_visitors),
        )
        for row in os_rows
    ]

    device_stmt = (
        select(
            SiteTrafficDeviceDaily.device_category,
            func.sum(SiteTrafficDeviceDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficDeviceDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficDeviceDaily.date >= start_dt,
                SiteTrafficDeviceDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficDeviceDaily.device_category)
        .order_by(func.sum(SiteTrafficDeviceDaily.visitors).desc())
        .limit(5)
    )
    device_rows = (await session.exec(device_stmt)).all()
    devices = [
        AnalyticsDevice(
            deviceCategory=row[0],
            visitors=int(row[1] or 0),
            share=_analytics_share(int(row[1] or 0), unique_visitors),
        )
        for row in device_rows
    ]

    country_stmt = (
        select(
            SiteTrafficCountryDaily.country,
            SiteTrafficCountryDaily.country_code,
            func.sum(SiteTrafficCountryDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficCountryDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficCountryDaily.date >= start_dt,
                SiteTrafficCountryDaily.date <= end_dt,
            )
        )
        .group_by(SiteTrafficCountryDaily.country, SiteTrafficCountryDaily.country_code)
        .order_by(func.sum(SiteTrafficCountryDaily.visitors).desc())
        .limit(10)
    )
    country_rows = (await session.exec(country_stmt)).all()
    countries = [
        AnalyticsCountry(
            country=row[0],
            code=row[1] or None,
            visitors=int(row[2] or 0),
            share=_analytics_share(int(row[2] or 0), unique_visitors),
        )
        for row in country_rows
    ]

    region_stmt = (
        select(
            SiteTrafficRegionDaily.region,
            SiteTrafficRegionDaily.country,
            SiteTrafficRegionDaily.country_code,
            func.sum(SiteTrafficRegionDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficRegionDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficRegionDaily.date >= start_dt,
                SiteTrafficRegionDaily.date <= end_dt,
            )
        )
        .group_by(
            SiteTrafficRegionDaily.region,
            SiteTrafficRegionDaily.country,
            SiteTrafficRegionDaily.country_code,
        )
        .order_by(func.sum(SiteTrafficRegionDaily.visitors).desc())
        .limit(10)
    )
    region_rows = (await session.exec(region_stmt)).all()
    regions = [
        AnalyticsRegion(
            region=row[0],
            country=row[1] or None,
            code=row[2] or None,
            visitors=int(row[3] or 0),
            share=_analytics_share(int(row[3] or 0), unique_visitors),
        )
        for row in region_rows
    ]

    city_stmt = (
        select(
            SiteTrafficCityDaily.city,
            SiteTrafficCityDaily.region,
            SiteTrafficCityDaily.country,
            SiteTrafficCityDaily.country_code,
            func.sum(SiteTrafficCityDaily.visitors).label("visitors"),
        )
        .where(
            and_(
                SiteTrafficCityDaily.source == AnalyticsDataSource.GA4,
                SiteTrafficCityDaily.date >= start_dt,
                SiteTrafficCityDaily.date <= end_dt,
            )
        )
        .group_by(
            SiteTrafficCityDaily.city,
            SiteTrafficCityDaily.region,
            SiteTrafficCityDaily.country,
            SiteTrafficCityDaily.country_code,
        )
        .order_by(func.sum(SiteTrafficCityDaily.visitors).desc())
        .limit(10)
    )
    city_rows = (await session.exec(city_stmt)).all()
    cities = [
        AnalyticsCity(
            city=row[0],
            region=row[1] or None,
            country=row[2] or None,
            code=row[3] or None,
            visitors=int(row[4] or 0),
            share=_analytics_share(int(row[4] or 0), unique_visitors),
        )
        for row in city_rows
    ]

    top_product_limit = max(1, top_product_limit)
    top_product_stmt = (
        select(
            ProductTrafficDaily.product_id,
            func.sum(ProductTrafficDaily.page_views).label("page_views"),
        )
        .join(Product, Product.id == ProductTrafficDaily.product_id)
        .where(
            and_(
                ProductTrafficDaily.source == AnalyticsDataSource.GA4,
                ProductTrafficDaily.date >= start_dt,
                ProductTrafficDaily.date <= end_dt,
                Product.status == ProductStatus.PUBLISHED,
            )
        )
        .group_by(ProductTrafficDaily.product_id)
        .order_by(func.sum(ProductTrafficDaily.page_views).desc())
        .limit(top_product_limit)
    )
    top_candidate_rows = (await session.exec(top_product_stmt)).all()
    candidate_ids = [int(row[0]) for row in top_candidate_rows]

    top_product_pages: list[AnalyticsTopProductPage] = []
    if candidate_ids:
        metrics_stmt = (
            select(
                ProductTrafficDaily.product_id,
                func.sum(ProductTrafficDaily.page_views).label("page_views"),
                func.sum(ProductTrafficDaily.unique_visitors).label("unique_visitors"),
                func.sum(ProductTrafficDaily.sessions).label("sessions"),
                func.sum(
                    ProductTrafficDaily.bounce_rate * ProductTrafficDaily.sessions
                ).label("bounce_weighted"),
                func.sum(
                    ProductTrafficDaily.average_session_duration
                    * ProductTrafficDaily.sessions
                ).label("duration_weighted"),
            )
            .where(
                and_(
                    ProductTrafficDaily.product_id.in_(candidate_ids),
                    ProductTrafficDaily.source == AnalyticsDataSource.GA4,
                    ProductTrafficDaily.date >= start_dt,
                    ProductTrafficDaily.date <= end_dt,
                )
            )
            .group_by(ProductTrafficDaily.product_id)
        )
        metrics_rows = (await session.exec(metrics_stmt)).all()

        meta_stmt = (
            select(
                Product.id,
                Product.slug,
                Product.name,
                ProductAnalytics.upvotes,
            )
            .outerjoin(ProductAnalytics, ProductAnalytics.product_id == Product.id)
            .where(Product.id.in_(candidate_ids))
        )
        meta_rows = (await session.exec(meta_stmt)).all()
        meta_by_id = {
            int(row[0]): {
                "slug": row[1],
                "name": row[2],
                "upvotes": row[3],
            }
            for row in meta_rows
        }

        for row in metrics_rows:
            product_id = int(row[0])
            meta = meta_by_id.get(product_id)
            if not meta or not meta.get("slug"):
                continue
            product_page_views = int(row[1] or 0)
            product_sessions = int(row[3] or 0)
            bounce_rate_value = (
                float(row[4] or 0) / product_sessions
                if product_sessions > 0
                else 0.0
            )
            avg_session_duration_value = (
                float(row[5] or 0) / product_sessions
                if product_sessions > 0
                else 0.0
            )
            top_product_pages.append(
                AnalyticsTopProductPage(
                    path=f"/products/{meta['slug']}",
                    slug=meta["slug"],
                    name=meta.get("name"),
                    upvotes=int(meta["upvotes"])
                    if meta.get("upvotes") is not None
                    else None,
                    pageViews=product_page_views,
                    uniqueVisitors=int(row[2] or 0),
                    sessions=product_sessions,
                    bounceRate=bounce_rate_value,
                    averageSessionDuration=avg_session_duration_value,
                    shareOfViews=_analytics_share(product_page_views, page_views),
                )
            )

        top_product_pages.sort(key=lambda entry: entry.pageViews, reverse=True)
        top_product_pages = top_product_pages[:top_product_limit]

    return AnalyticsSnapshot(
        pageViews=page_views,
        uniqueVisitors=unique_visitors,
        sessions=sessions,
        bounceRate=bounce_rate,
        averageSessionDuration=average_session_duration,
        newUsers=resolved_new_users,
        engagementRate=engagement_rate,
        pagesPerSession=pages_per_session,
        referrers=referrers,
        timeseries=timeseries,
        browsers=browsers,
        operatingSystems=operating_systems,
        devices=devices,
        countries=countries,
        regions=regions,
        cities=cities,
        topProductPages=top_product_pages,
    )


async def _sum_verified_revenue_cents(
    session: Session,
    *,
    start_dt: datetime,
    end_dt: datetime,
    rates: dict[str, float],
) -> int:
    stmt = (
        select(
            PaymentRevenueSnapshot.period_revenue_cents,
            PaymentRevenueSnapshot.currency_code,
        )
        .join(
            PaymentConnector,
            PaymentConnector.id == PaymentRevenueSnapshot.connector_id,
        )
        .where(
            and_(
                PaymentConnector.verified_at.isnot(None),
                PaymentConnector.status == PaymentConnectorStatus.ACTIVE,
                PaymentRevenueSnapshot.period_start >= start_dt,
                PaymentRevenueSnapshot.period_start <= end_dt,
            )
        )
    )
    rows = (await session.exec(stmt)).all()
    total = 0
    for row in rows:
        amount_cents = int(row[0] or 0)
        currency_code = (row[1] or "USD").upper()
        if currency_code == "USD":
            total += amount_cents
            continue
        usd_cents, rate_used = convert_to_usd_cents(amount_cents, currency_code, rates)
        if rate_used is not None:
            total += int(usd_cents)
    return total


async def _build_verified_revenue_summary(
    session: Session,
    *,
    current_start: datetime,
    current_end: datetime,
    previous_start: datetime,
    previous_end: datetime,
) -> AnalyticsVerifiedRevenue:
    rates = await get_usd_conversion_rates()
    current_total = await _sum_verified_revenue_cents(
        session,
        start_dt=current_start,
        end_dt=current_end,
        rates=rates,
    )
    previous_total = await _sum_verified_revenue_cents(
        session,
        start_dt=previous_start,
        end_dt=previous_end,
        rates=rates,
    )
    return AnalyticsVerifiedRevenue(
        currency="USD",
        rangeCents=current_total,
        previousRangeCents=previous_total,
    )


@router.get("/analytics/summary", response_model=PublicAnalyticsPayload)
async def get_public_analytics_summary(
    request: Request,
    *,
    top_product_limit: int | None = Query(None, alias="topProductLimit"),
    session: Session = Depends(get_session),
) -> PublicAnalyticsPayload:
    safe_limit = _normalize_page_size_with_max(
        top_product_limit,
        ANALYTICS_TOP_PRODUCTS_DEFAULT_LIMIT,
        ANALYTICS_TOP_PRODUCTS_MAX_LIMIT,
    )

    async def build_payload() -> dict:
        current_start, current_end = _utc_range_for_days(30)
        previous_end_date = current_start.date() - timedelta(days=1)
        previous_start_date = previous_end_date - timedelta(days=29)
        previous_start = datetime.combine(previous_start_date, time.min, tzinfo=timezone.utc)
        previous_end = datetime.combine(previous_end_date, time.max, tzinfo=timezone.utc)

        snapshot = await _build_site_analytics_snapshot(
            session,
            start_dt=current_start,
            end_dt=current_end,
            top_product_limit=safe_limit,
        )
        previous_snapshot = await _build_site_analytics_snapshot(
            session,
            start_dt=previous_start,
            end_dt=previous_end,
            top_product_limit=safe_limit,
        )
        realtime_visitors = await _resolve_realtime_visitors(session)
        verified_revenue = await _build_verified_revenue_summary(
            session,
            current_start=current_start,
            current_end=current_end,
            previous_start=previous_start,
            previous_end=previous_end,
        )

        payload = PublicAnalyticsPayload(
            snapshot=snapshot,
            previousSnapshot=previous_snapshot,
            realtimeVisitors=realtime_visitors,
            verifiedRevenue=verified_revenue,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:analytics-summary",
        ttl_seconds=ANALYTICS_SUMMARY_CACHE_TTL,
        path=request.url.path,
        params=[("topProductLimit", str(safe_limit))],
        builder=build_payload,
    )
    return PublicAnalyticsPayload.model_validate(payload)


@router.get("/analytics/realtime", response_model=RealtimeVisitors)
async def get_realtime_visitors(
    request: Request,
    session: Session = Depends(get_session),
) -> RealtimeVisitors:
    async def build_payload() -> dict:
        visitors = await _resolve_realtime_visitors(session)
        return RealtimeVisitors(visitors=visitors).model_dump(mode="json")

    payload = await cached_json(
        "public:realtime-visitors",
        ttl_seconds=REALTIME_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return RealtimeVisitors.model_validate(payload)


async def _build_public_rewards_stats(session: Session) -> PublicRewardsStats:
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    members_with_rewards = _scalar_value(
        (
            await session.exec(
                select(func.count(RewardBalance.user_id)).where(
                    RewardBalance.lifetime_earned > 0
                )
            )
        ).one()
    )
    active_balances = _scalar_value(
        (
            await session.exec(
                select(func.count(RewardBalance.user_id)).where(
                    RewardBalance.balance > 0
                )
            )
        ).one()
    )

    earned_stmt = (
        select(
            func.coalesce(func.sum(RewardTransaction.reward_amount), 0),
            func.count(RewardTransaction.id),
        )
        .where(
            and_(
                RewardTransaction.type == RewardTransactionType.EARN,
                RewardTransaction.created_at >= thirty_days_ago,
            )
        )
        .limit(1)
    )
    earned_row = (await session.exec(earned_stmt)).one()
    earned_amount = int(earned_row[0] or 0)
    earned_count = int(earned_row[1] or 0)

    spent_stmt = (
        select(
            func.coalesce(func.sum(RewardTransaction.reward_amount), 0),
            func.count(RewardTransaction.id),
        )
        .where(
            and_(
                RewardTransaction.type == RewardTransactionType.SPEND,
                RewardTransaction.created_at >= thirty_days_ago,
            )
        )
        .limit(1)
    )
    spent_row = (await session.exec(spent_stmt)).one()
    spent_amount = int(spent_row[0] or 0)

    redeemed_count = _scalar_value(
        (
            await session.exec(
                select(func.count(Redemption.id)).where(
                    and_(
                        Redemption.created_at >= thirty_days_ago,
                        Redemption.status.in_(
                            [
                                RedemptionStatus.PENDING,
                                RedemptionStatus.ACTIVE,
                                RedemptionStatus.REFUNDED,
                            ]
                        ),
                    )
                )
            )
        ).one()
    )

    return PublicRewardsStats(
        membersWithRewards=members_with_rewards,
        activeBalances=active_balances,
        earnedLast30d=PublicRewardsStatsWindow(
            rewardAmount=earned_amount,
            transactions=earned_count,
        ),
        spentLast30d=PublicRewardsSpentWindow(
            rewardAmount=spent_amount,
            redemptions=redeemed_count,
        ),
    )


@router.get("/rewards/stats", response_model=PublicRewardsStats)
async def get_public_rewards_stats(
    request: Request,
    session: Session = Depends(get_session),
) -> PublicRewardsStats:
    async def build_payload() -> dict:
        payload = await _build_public_rewards_stats(session)
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:rewards-stats",
        ttl_seconds=REWARDS_STATS_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return PublicRewardsStats.model_validate(payload)


@router.get("/rewards/data", response_model=PublicRewardsData)
async def get_public_rewards_data(
    request: Request,
    session: Session = Depends(get_session),
) -> PublicRewardsData:
    async def build_payload() -> dict:
        now = datetime.now(timezone.utc)
        ninety_days_ago = now - timedelta(days=90)

        stats = await _build_public_rewards_stats(session)

        rule_usage_stmt = (
            select(
                RewardTransaction.rule_id,
                RewardTransaction.rule_key,
                func.coalesce(func.sum(RewardTransaction.reward_amount), 0).label(
                    "reward_amount"
                ),
                func.count(RewardTransaction.id).label("award_count"),
            )
            .where(
                and_(
                    RewardTransaction.type == RewardTransactionType.EARN,
                    RewardTransaction.created_at >= ninety_days_ago,
                    RewardTransaction.rule_id.isnot(None),
                )
            )
            .group_by(RewardTransaction.rule_id, RewardTransaction.rule_key)
            .order_by(func.coalesce(func.sum(RewardTransaction.reward_amount), 0).desc())
            .limit(8)
        )
        rule_usage_rows = (await session.exec(rule_usage_stmt)).all()

        rule_stmt = select(RewardRule).where(RewardRule.is_active.is_(True))
        rule_rows = (await session.exec(rule_stmt)).scalars().all()

        catalog_stmt = (
            select(RewardCatalogItem)
            .where(RewardCatalogItem.is_active.is_(True))
            .order_by(
                RewardCatalogItem.category.asc(),
                RewardCatalogItem.base_cost.asc(),
                RewardCatalogItem.name.asc(),
            )
        )
        catalog_rows = (await session.exec(catalog_stmt)).scalars().all()

        redemption_counts_stmt = (
            select(
                Redemption.feature_key,
                func.count(Redemption.id).label("redemption_count"),
            )
            .where(
                and_(
                    Redemption.created_at >= ninety_days_ago,
                    Redemption.status.in_(
                        [
                            RedemptionStatus.PENDING,
                            RedemptionStatus.ACTIVE,
                            RedemptionStatus.REFUNDED,
                        ]
                    ),
                )
            )
            .group_by(Redemption.feature_key)
        )
        redemption_count_rows = (await session.exec(redemption_counts_stmt)).all()

        recent_redemptions_stmt = (
            select(Redemption)
            .where(
                Redemption.status.in_(
                    [
                        RedemptionStatus.ACTIVE,
                        RedemptionStatus.PENDING,
                        RedemptionStatus.REFUNDED,
                    ]
                )
            )
            .order_by(Redemption.created_at.desc())
            .limit(4)
            .options(
                selectinload(Redemption.catalog_item),
                selectinload(Redemption.product),
            )
        )
        recent_redemptions = (await session.exec(recent_redemptions_stmt)).scalars().all()

        usage_by_rule_id = {
            int(row[0]): {"reward_amount": int(row[2] or 0), "award_count": int(row[3] or 0)}
            for row in rule_usage_rows
            if row[0] is not None
        }

        rules = []
        for rule in rule_rows:
            usage = usage_by_rule_id.get(rule.id)
            rules.append(
                PublicRewardsRule(
                    id=str(rule.id),
                    name=rule.name,
                    description=rule.description,
                    category=rule.category,
                    baseRewardAmount=rule.base_reward_amount,
                    dailyCap=rule.daily_cap,
                    lifetimeCap=rule.lifetime_cap,
                    totalAwarded=usage["reward_amount"] if usage else 0,
                    awardCount=usage["award_count"] if usage else 0,
                )
            )

        rules.sort(
            key=lambda entry: (
                -entry.baseRewardAmount,
                -entry.totalAwarded,
                -entry.awardCount,
                entry.name,
            )
        )

        redemption_counts = {
            row[0]: int(row[1] or 0) for row in redemption_count_rows
        }

        rewards = [
            PublicRewardsReward(
                featureKey=item.feature_key,
                name=item.name,
                description=item.description,
                category=item.category,
                baseCost=item.base_cost,
                durationSeconds=item.duration_seconds,
                requiresProduct=item.requires_product,
                maxActivePerUser=item.max_active_per_user,
                maxPendingPerUser=item.max_pending_per_user,
                redemptionCount=redemption_counts.get(item.feature_key, 0),
            )
            for item in catalog_rows
        ]

        recent = [
            PublicRewardsRedemption(
                id=str(item.id),
                featureKey=item.feature_key,
                name=item.catalog_item.name if item.catalog_item else None,
                productName=item.product.name if item.product else None,
                productSlug=item.product.slug if item.product else None,
                cost=item.cost,
                status=item.status,
                createdAt=item.created_at.isoformat(),
            )
            for item in recent_redemptions
        ]

        payload = PublicRewardsData(
            stats=stats,
            rules=rules,
            rewards=rewards,
            recentRedemptions=recent,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:rewards-data",
        ttl_seconds=REWARDS_PAGE_CACHE_TTL,
        path=request.url.path,
        builder=build_payload,
    )
    return PublicRewardsData.model_validate(payload)


@router.get("/rewards/leaderboard", response_model=RewardsLeaderboardPageResult)
async def get_rewards_leaderboard_page(
    request: Request,
    *,
    page: int | None = Query(None),
    page_size: int | None = Query(None, alias="pageSize"),
    session: Session = Depends(get_session),
) -> RewardsLeaderboardPageResult:
    safe_page = _normalize_page(page, 1)
    safe_page_size = _normalize_rewards_page_size(page_size)
    offset = (safe_page - 1) * safe_page_size

    async def build_payload() -> dict:
        launch_counts = (
            select(
                Product.user_id,
                func.count(Product.id).label("launch_count"),
            )
            .where(Product.status == ProductStatus.PUBLISHED)
            .group_by(Product.user_id)
            .subquery()
        )

        stmt = (
            select(
                RewardBalance.user_id,
                RewardBalance.balance,
                RewardBalance.lifetime_earned,
                RewardBalance.lifetime_spent,
                RewardBalance.lifetime_adjusted,
                RewardBalance.lifetime_refunded,
                RewardBalance.current_streak_count,
                RewardBalance.longest_streak_count,
                RewardBalance.last_earned_at,
                RewardBalance.last_redeemed_at,
                User.first_name,
                User.last_name,
                launch_counts.c.launch_count,
            )
            .join(User, User.id == RewardBalance.user_id)
            .outerjoin(launch_counts, launch_counts.c.user_id == User.id)
            .where(
                and_(
                    RewardBalance.lifetime_earned > 0,
                    User.status == UserStatus.ACTIVE,
                )
            )
            .order_by(
                RewardBalance.lifetime_earned.desc(),
                RewardBalance.updated_at.desc(),
            )
            .offset(offset)
            .limit(safe_page_size)
        )
        rows = (await session.exec(stmt)).all()

        total = _scalar_value(
            (
                await session.exec(
                    select(func.count(RewardBalance.user_id))
                    .join(User, User.id == RewardBalance.user_id)
                    .where(
                        and_(
                            RewardBalance.lifetime_earned > 0,
                            User.status == UserStatus.ACTIVE,
                        )
                    )
                )
            ).one()
        )

        items: list[RewardsLeaderboardEntry] = []
        for row in rows:
            (
                user_id,
                balance,
                lifetime_earned,
                lifetime_spent,
                lifetime_adjusted,
                lifetime_refunded,
                current_streak,
                longest_streak,
                last_earned_at,
                last_redeemed_at,
                first_name,
                last_name,
                launch_count,
            ) = row

            display_name = f"{first_name or ''} {last_name or ''}".strip()
            if not display_name:
                display_name = "Shipyard member"
            initials = "".join(
                [part[0].upper() for part in display_name.split()[:2] if part]
            )
            if not initials:
                initials = "SY"

            items.append(
                RewardsLeaderboardEntry(
                    userId=str(user_id),
                    balance=int(balance or 0),
                    lifetimeEarned=int(lifetime_earned or 0),
                    lifetimeSpent=int(lifetime_spent or 0),
                    lifetimeAdjusted=int(lifetime_adjusted or 0),
                    lifetimeRefunded=int(lifetime_refunded or 0),
                    currentStreakCount=int(current_streak or 0),
                    longestStreakCount=int(longest_streak or 0),
                    lastEarnedAt=last_earned_at.isoformat() if last_earned_at else None,
                    lastRedeemedAt=last_redeemed_at.isoformat()
                    if last_redeemed_at
                    else None,
                    displayName=display_name,
                    initials=initials,
                    avatarUrl=None,
                    launchCount=int(launch_count or 0),
                )
            )

        has_more = offset + len(items) < total
        payload = RewardsLeaderboardPageResult(
            items=items,
            page=safe_page,
            pageSize=safe_page_size,
            hasMore=has_more,
            nextPage=safe_page + 1 if has_more else None,
            total=total,
        )
        return payload.model_dump(mode="json")

    payload = await cached_json(
        "public:rewards-leaderboard",
        ttl_seconds=REWARDS_LEADERBOARD_CACHE_TTL,
        path=request.url.path,
        params=[
            ("page", str(safe_page)),
            ("pageSize", str(safe_page_size)),
        ],
        builder=build_payload,
    )
    return RewardsLeaderboardPageResult.model_validate(payload)


@router.get("/categories/highlights", response_model=list[CategoryHighlight])
async def get_category_highlights(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[CategoryHighlight]:
    safe_limit = _normalize_highlight_limit(limit, DEFAULT_HIGHLIGHT_LIMIT)

    async def build_payload() -> list[dict]:
        if safe_limit == 0:
            return []
        stmt = (
            select(
                Category.id,
                Category.name,
                Category.slug,
                func.count(Product.id).label("product_count"),
            )
            .join(Product, Product.category_id == Category.id)
            .where(Product.status == ProductStatus.PUBLISHED)
            .group_by(Category.id)
            .order_by(func.count(Product.id).desc(), Category.name.asc())
            .limit(safe_limit)
        )
        rows = (await session.exec(stmt)).all()
        return [
            CategoryHighlight(
                id=str(row[0]), name=row[1], slug=row[2]
            ).model_dump(mode="json")
            for row in rows
        ]

    payload = await cached_json(
        "public:category-highlights",
        ttl_seconds=HIGHLIGHTS_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [CategoryHighlight.model_validate(item) for item in payload]


@router.get("/use-cases/highlights", response_model=list[UseCaseHighlight])
async def get_use_case_highlights(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[UseCaseHighlight]:
    safe_limit = _normalize_highlight_limit(limit, DEFAULT_HIGHLIGHT_LIMIT)

    async def build_payload() -> list[dict]:
        if safe_limit == 0:
            return []
        stmt = (
            select(
                UseCase.id,
                UseCase.label,
                UseCase.slug,
                func.count(Product.id).label("product_count"),
            )
            .join(UseCaseCategory, UseCaseCategory.use_case_id == UseCase.id)
            .join(Category, Category.id == UseCaseCategory.category_id)
            .join(Product, Product.category_id == Category.id)
            .where(Product.status == ProductStatus.PUBLISHED)
            .group_by(UseCase.id)
            .order_by(func.count(Product.id).desc(), UseCase.label.asc())
            .limit(safe_limit)
        )
        rows = (await session.exec(stmt)).all()
        return [
            UseCaseHighlight(
                id=str(row[0]), label=row[1], slug=row[2]
            ).model_dump(mode="json")
            for row in rows
        ]

    payload = await cached_json(
        "public:use-case-highlights",
        ttl_seconds=HIGHLIGHTS_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [UseCaseHighlight.model_validate(item) for item in payload]


@router.get("/alternatives/featured", response_model=list[AlternativeHighlight])
async def get_alternative_highlights(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[AlternativeHighlight]:
    safe_limit = _normalize_highlight_limit(limit, DEFAULT_HIGHLIGHT_LIMIT)

    async def build_payload() -> list[dict]:
        if safe_limit == 0:
            return []
        stmt = (
            select(AlternativeProduct.id, AlternativeProduct.name, AlternativeProduct.slug)
            .join(AlternativeProduct.products)
            .group_by(AlternativeProduct.id)
            .order_by(AlternativeProduct.name.asc())
            .limit(safe_limit)
        )
        rows = (await session.exec(stmt)).all()
        return [
            AlternativeHighlight(
                id=str(row[0]), name=row[1], slug=row[2]
            ).model_dump(mode="json")
            for row in rows
        ]

    payload = await cached_json(
        "public:alternative-highlights",
        ttl_seconds=HIGHLIGHTS_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [AlternativeHighlight.model_validate(item) for item in payload]


def _map_sponsored_product(product: Product) -> SponsoredProduct:
    return SponsoredProduct(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        tagline=product.tagline or None,
        logo=product.logo,
        bannerImage=product.banner_image,
    )


@router.get("/products/sponsored", response_model=list[SponsoredPlacement])
async def get_sponsored_products(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[SponsoredPlacement]:
    safe_limit = max(1, int(limit or 12))
    now = datetime.now(timezone.utc)

    async def build_payload() -> list[dict]:
        scheduled_stmt = (
            select(PlacementSchedule, Product)
            .join(Product, Product.id == PlacementSchedule.product_id)
            .where(
                and_(
                    PlacementSchedule.feature_key == SPONSORED_FEATURE_KEY,
                    PlacementSchedule.status == PlacementStatus.ACTIVE,
                    PlacementSchedule.starts_at <= now,
                    PlacementSchedule.ends_at >= now,
                    Product.status == ProductStatus.PUBLISHED,
                )
            )
            .order_by(func.random())
            .limit(safe_limit)
        )
        scheduled_rows = (await session.exec(scheduled_stmt)).all()
        scheduled_product_ids = {row[1].id for row in scheduled_rows}
        remaining = max(safe_limit - len(scheduled_rows), 0)

        plan_rows: list[Product] = []
        if remaining > 0:
            feature_exists = exists(
                select(PlanFeatureAssignment.id)
                .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
                .where(
                    PlanFeatureAssignment.plan_id == Plan.id,
                    PlanFeatureAssignment.enabled.is_(True),
                    PlanFeature.key == SPONSORED_FEATURE_KEY,
                )
            )
            plan_stmt = (
                select(Product)
                .join(Plan, Plan.id == Product.plan_id)
                .where(
                    and_(
                        Product.status == ProductStatus.PUBLISHED,
                        feature_exists,
                        Product.id.notin_(scheduled_product_ids),
                    )
                )
                .order_by(func.random())
                .limit(remaining)
            )
            plan_rows = (await session.exec(plan_stmt)).scalars().all()

        placements: list[SponsoredPlacement] = []
        seen = set()

        for schedule, product in scheduled_rows:
            if product.id in seen:
                continue
            seen.add(product.id)
            placements.append(
                SponsoredPlacement(
                    id=f"schedule:{schedule.id}",
                    origin="schedule",
                    product=_map_sponsored_product(product),
                    schedule=SponsoredPlacementSchedule(
                        id=str(schedule.id),
                        slotKey=schedule.slot_key,
                        startsAt=schedule.starts_at.isoformat(),
                        endsAt=schedule.ends_at.isoformat(),
                        redemptionId=str(schedule.redemption_id)
                        if schedule.redemption_id
                        else None,
                    ),
                )
            )
            if len(placements) >= safe_limit:
                break

        if len(placements) < safe_limit:
            for product in plan_rows:
                if product.id in seen:
                    continue
                seen.add(product.id)
                placements.append(
                    SponsoredPlacement(
                        id=f"plan:{product.id}",
                        origin="plan",
                        product=_map_sponsored_product(product),
                    )
                )
                if len(placements) >= safe_limit:
                    break

        return [placement.model_dump(mode="json") for placement in placements]

    payload = await cached_json(
        "public:sponsored-products",
        ttl_seconds=PLACEMENT_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [SponsoredPlacement.model_validate(item) for item in payload]


@router.get("/products/sticky-banner", response_model=list[StickyBannerProduct])
async def get_sticky_banner_products(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[StickyBannerProduct]:
    safe_limit = max(1, int(limit or 100))
    now = datetime.now(timezone.utc)

    async def build_payload() -> list[dict]:
        scheduled_stmt = (
            select(
                PlacementSchedule.product_id,
                func.min(PlacementSchedule.starts_at).label("starts_at"),
                func.min(PlacementSchedule.created_at).label("created_at"),
            )
            .join(Product, Product.id == PlacementSchedule.product_id)
            .where(
                and_(
                    PlacementSchedule.feature_key == STICKY_BANNER_FEATURE_KEY,
                    PlacementSchedule.status == PlacementStatus.ACTIVE,
                    PlacementSchedule.starts_at <= now,
                    PlacementSchedule.ends_at >= now,
                    Product.status == ProductStatus.PUBLISHED,
                )
            )
            .group_by(PlacementSchedule.product_id)
            .order_by(
                func.min(PlacementSchedule.starts_at).asc(),
                func.min(PlacementSchedule.created_at).asc(),
            )
            .limit(safe_limit)
        )
        scheduled_ids = [row[0] for row in (await session.exec(scheduled_stmt)).all()]

        remaining = max(safe_limit - len(scheduled_ids), 0)
        plan_ids: list[int] = []
        if remaining > 0:
            feature_exists = exists(
                select(PlanFeatureAssignment.id)
                .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
                .where(
                    PlanFeatureAssignment.plan_id == Plan.id,
                    PlanFeatureAssignment.enabled.is_(True),
                    PlanFeature.key == STICKY_BANNER_FEATURE_KEY,
                )
            )
            plan_stmt = (
                select(Product.id)
                .join(Plan, Plan.id == Product.plan_id)
                .where(
                    and_(
                        Product.status == ProductStatus.PUBLISHED,
                        feature_exists,
                        Product.id.notin_(scheduled_ids),
                    )
                )
                .order_by(
                    Product.plan_assigned_at.desc().nullslast(),
                    Product.created_at.desc(),
                )
                .limit(remaining)
            )
            plan_ids = (await session.exec(plan_stmt)).scalars().all()

        combined_ids = scheduled_ids + plan_ids
        if not combined_ids:
            return []

        products = await _fetch_products_by_ids(session, combined_ids)
        product_map = {product.id: product for product in products}
        ordered_products = []
        seen = set()
        for product_id in combined_ids:
            product = product_map.get(product_id)
            if not product or product.id in seen:
                continue
            ordered_products.append(product)
            seen.add(product.id)
            if len(ordered_products) >= safe_limit:
                break

        payload_items: list[StickyBannerProduct] = []
        for product in ordered_products:
            revenue_cents, revenue_currency = _resolve_product_revenue(
                product.payment_connector
            )
            payload_items.append(
                StickyBannerProduct(
                    id=str(product.id),
                    slug=product.slug,
                    name=product.name,
                    logo=product.logo,
                    tagline=product.tagline or None,
                    latestRevenueCents=revenue_cents,
                    revenueCurrencyCode=revenue_currency,
                )
            )

        return [item.model_dump(mode="json") for item in payload_items]

    payload = await cached_json(
        "public:sticky-banner",
        ttl_seconds=STICKY_BANNER_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [StickyBannerProduct.model_validate(item) for item in payload]


@router.get("/products/badges/{badge}", response_model=list[PublicProductCard])
async def get_products_by_badge(
    request: Request,
    badge: str,
    *,
    category_slug: str | None = Query(None, alias="categorySlug"),
    order: str | None = Query(None),
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[PublicProductCard]:
    normalized_badge = badge.strip()
    if not normalized_badge:
        raise HTTPException(status_code=404, detail="Badge not found.")

    safe_limit = max(
        1, min(limit or BADGE_PRODUCTS_DEFAULT_LIMIT, BADGE_PRODUCTS_MAX_LIMIT)
    )
    category_slug = _normalize_filter_slug(category_slug)
    normalized_order = (order or "asc").strip().lower()
    order_by = (
        ProductBadge.created_at.desc()
        if normalized_order == "desc"
        else ProductBadge.created_at.asc()
    )
    now = datetime.now(timezone.utc)

    async def build_payload() -> list[dict]:
        stmt = (
            select(ProductBadge.product_id)
            .join(Product, Product.id == ProductBadge.product_id)
            .where(
                and_(
                    ProductBadge.badge == normalized_badge,
                    Product.status == ProductStatus.PUBLISHED,
                    or_(
                        ProductBadge.expires_at.is_(None),
                        ProductBadge.expires_at > now,
                    ),
                )
            )
            .order_by(order_by)
            .limit(safe_limit)
        )
        if category_slug:
            stmt = stmt.join(Category, Category.id == Product.category_id).where(
                Category.slug == category_slug
            )
        rows = (await session.exec(stmt)).all()
        product_ids: list[int] = []
        seen: set[int] = set()
        for (product_id,) in rows:
            if product_id in seen:
                continue
            seen.add(product_id)
            product_ids.append(int(product_id))
        if not product_ids:
            return []
        products = await _fetch_products_by_ids(session, product_ids)
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]
        return [item.model_dump(mode="json") for item in items]

    payload = await cached_json(
        "public:products-by-badge",
        ttl_seconds=BADGE_PRODUCTS_CACHE_TTL,
        path=request.url.path,
        params=[
            ("badge", normalized_badge),
            ("categorySlug", category_slug or ""),
            ("order", normalized_order),
            ("limit", str(safe_limit)),
        ],
        builder=build_payload,
    )
    return [PublicProductCard.model_validate(item) for item in payload]


@router.get("/products/trending", response_model=list[PublicProductCard])
async def get_trending_products(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[PublicProductCard]:
    safe_limit = max(
        1, min(limit or TRENDING_PRODUCTS_DEFAULT_LIMIT, TRENDING_PRODUCTS_MAX_LIMIT)
    )
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)

    async def build_payload() -> list[dict]:
        badge_exists = exists(
            select(ProductBadge.id).where(ProductBadge.product_id == Product.id)
        )
        stmt = (
            select(Product.id)
            .join(ProductAnalytics, ProductAnalytics.product_id == Product.id)
            .where(
                and_(
                    Product.status == ProductStatus.PUBLISHED,
                    Product.created_at <= now,
                    Product.updated_at >= yesterday,
                    ProductAnalytics.upvotes > 0,
                    badge_exists,
                )
            )
            .order_by(ProductAnalytics.upvotes.desc())
            .limit(safe_limit)
        )
        rows = (await session.exec(stmt)).all()
        product_ids = [int(row[0]) for row in rows]
        if not product_ids:
            return []
        products = await _fetch_products_by_ids(session, product_ids)
        score_map = await _fetch_score_map(session, product_ids)
        interest_map = await _fetch_interest_map(session, product_ids)
        items = [
            _map_product_to_card(
                product,
                now=now,
                score_map=score_map,
                interest_map=interest_map,
            )
            for product in products
        ]
        return [item.model_dump(mode="json") for item in items]

    payload = await cached_json(
        "public:trending-products",
        ttl_seconds=TRENDING_PRODUCTS_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [PublicProductCard.model_validate(item) for item in payload]


@router.get("/categories/top", response_model=list[CategorySummary])
async def get_top_categories(
    request: Request,
    *,
    limit: int | None = Query(None),
    session: Session = Depends(get_session),
) -> list[CategorySummary]:
    safe_limit = max(
        1, min(limit or TOP_CATEGORIES_DEFAULT_LIMIT, TOP_CATEGORIES_MAX_LIMIT)
    )

    async def build_payload() -> list[dict]:
        stmt = (
            select(
                Category.id,
                Category.name,
                Category.slug,
                Category.description,
                Category.icon,
                func.count(Product.id).label("product_count"),
            )
            .join(Product, Product.category_id == Category.id)
            .where(Product.status == ProductStatus.PUBLISHED)
            .group_by(Category.id)
            .order_by(func.count(Product.id).desc(), Category.name.asc())
            .limit(safe_limit)
        )
        rows = (await session.exec(stmt)).all()
        items = [
            CategorySummary(
                id=str(row[0]),
                name=row[1],
                slug=row[2],
                description=row[3],
                icon=row[4],
                count=int(row[5] or 0),
            )
            for row in rows
        ]
        return [item.model_dump(mode="json") for item in items]

    payload = await cached_json(
        "public:categories-top",
        ttl_seconds=TOP_CATEGORIES_CACHE_TTL,
        path=request.url.path,
        params=[("limit", str(safe_limit))],
        builder=build_payload,
    )
    return [CategorySummary.model_validate(item) for item in payload]
