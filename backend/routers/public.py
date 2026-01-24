from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
import hashlib
import random
import re
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, exists, func, or_, select, text
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from database import get_session
from models import (
    AlternativeProduct,
    AlternativeProductCategoryLink,
    Category,
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
    ProductLeaderboardScore,
    ProductStatus,
    ProductTrafficDaily,
    PricingModel,
    ProductType,
    ProductVerification,
    SiteTrafficDaily,
    UseCase,
    UseCaseCategory,
    User,
)
from routers.base import api_prefix
from services.cache import cached_json
from services.schemas.public import (
    AlternativeHighlight,
    AlternativeCatalogItem,
    AlternativeCatalogPageResult,
    BrowseFilters,
    BrowsePagePayload,
    BrowseProductsPageResult,
    CategoryHighlight,
    CategorySummary,
    CategoriesDirectoryPayload,
    HomepageFeedAllResult,
    HomepageFeedItem,
    HomepageFeedPageResult,
    HomepageFeedView,
    LeaderboardStats,
    ProductCategorySummary,
    ProductInterestSignals,
    PublicProductCard,
    RealtimeVisitors,
    SponsoredPlacement,
    SponsoredPlacementSchedule,
    SponsoredProduct,
    StickyBannerProduct,
    TagDirectoryPageResult,
    TagSummary,
    TrafficPoint,
    UseCaseHighlight,
    UseCaseMeta,
    UseCaseSummary,
    UseCasesDirectoryPayload,
)

router = APIRouter(prefix=api_prefix("public"), tags=["public-homepage"])

HOMEPAGE_FEED_PAGE_SIZE = 10
HOMEPAGE_FEED_MAX_PAGE_SIZE = 50
HOMEPAGE_FEED_CACHE_TTL = 300

HIGHLIGHTS_CACHE_TTL = 600
PLACEMENT_CACHE_TTL = 300
STICKY_BANNER_CACHE_TTL = 600
LEADERBOARD_STATS_CACHE_TTL = 120
REALTIME_CACHE_TTL = 60

PRIORITY_FEATURE_KEY = "priorityPlacement"
SPONSORED_FEATURE_KEY = "sponsoredProducts"
STICKY_BANNER_FEATURE_KEY = "stickyBanner"

DEFAULT_HIGHLIGHT_LIMIT = 6
MAX_HIGHLIGHT_LIMIT = 12

BROWSE_PAGE_SIZE = 20
BROWSE_CACHE_TTL = 120

CATEGORIES_CACHE_TTL = 600
USE_CASES_CACHE_TTL = 600
ALTERNATIVES_CACHE_TTL = 600
TAGS_CACHE_TTL = 600

CATEGORY_HIGHLIGHT_LIMIT = 4
USE_CASE_HIGHLIGHT_LIMIT = 8

ALTERNATIVE_CATALOG_PAGE_SIZE = 18
ALTERNATIVE_CATALOG_MAX_PAGE_SIZE = 50

TAG_DIRECTORY_DEFAULT_PAGE_SIZE = 36
TAG_LIST_LIMIT = 200
KEYWORD_SLUG_HASH_LENGTH = 6

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
    if value is None:
        return fallback
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return fallback
    if parsed <= 0:
        return fallback
    return min(parsed, HOMEPAGE_FEED_MAX_PAGE_SIZE)


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


async def _fetch_verified_revenue_products(
    session: Session, *, page: int, page_size: int
) -> tuple[list[Product], bool]:
    revenue_exists = exists(
        select(PaymentRevenueSnapshot.id).where(
            and_(
                PaymentRevenueSnapshot.connector_id == PaymentConnector.id,
                PaymentRevenueSnapshot.all_time_revenue_cents > 0,
            )
        )
    )

    stmt = (
        select(Product)
        .join(PaymentConnector, PaymentConnector.product_id == Product.id)
        .outerjoin(ProductAnalytics, ProductAnalytics.product_id == Product.id)
        .where(
            and_(
                Product.status == ProductStatus.PUBLISHED,
                PaymentConnector.status == PaymentConnectorStatus.ACTIVE,
                PaymentConnector.verified_at.isnot(None),
                or_(
                    PaymentConnector.latest_all_time_revenue_cents > 0,
                    revenue_exists,
                ),
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
                p.status = 'published'
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

        rows = (await session.exec(tag_stmt, params={"offset": offset, "limit": limit})).all()
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
                    p.status = 'published'
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
            total_row = (await session.exec(total_stmt)).one_or_none()
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
