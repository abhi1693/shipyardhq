from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from hashlib import sha256
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser
from database import get_session
from models import (
    FeatureEntitlement,
    FeatureEntitlementStatus,
    MemberFeedback,
    PaymentConnector,
    PaymentCredentialStatus,
    Plan,
    PlanFeature,
    PlanFeatureAssignment,
    PlanType,
    Product,
    ProductAnalytics,
    ProductClaimAttempt,
    ProductClaimMethod,
    ProductClaimStatus,
    ProductStatus,
    ProductUpvote,
    ProductVerification,
    Redemption,
    RedemptionStatus,
    RewardBalance,
    RewardCatalogItem,
    RewardFeatureCategory,
    RewardTransaction,
    RewardTransactionType,
    User,
    UserPlanPurchase,
    UserStatus,
)
from routers.base import api_prefix
from services.schemas.member import (
    MemberActiveUser,
    MemberFeatureAccessPayload,
    MemberFeedbackCreateInput,
    MemberFeedbackListItem,
    MemberManageablePlanSummary,
    MemberManageableProductPayload,
    MemberManageableProductSummary,
    MemberOnboardingCompleteInput,
    MemberOnboardingCompletePayload,
    MemberOverviewContextPayload,
    MemberOverviewProduct,
    MemberSyncProfileInput,
)

router = APIRouter(prefix=api_prefix("member"), tags=["member"])
INACTIVE_ACCOUNT_MESSAGE = "Account is not active"
ACTIVE_FEATURE_STATUSES = (
    FeatureEntitlementStatus.ACTIVE,
    FeatureEntitlementStatus.PENDING,
)
ACTIVE_REWARD_ENTITLEMENT_STATUSES = (
    FeatureEntitlementStatus.ACTIVE,
    FeatureEntitlementStatus.PENDING,
    FeatureEntitlementStatus.PAUSED,
)
ACTIVE_PRODUCT_ENTITLEMENT_STATUSES = (
    FeatureEntitlementStatus.ACTIVE,
    FeatureEntitlementStatus.PENDING,
)
PRODUCT_SORT_KEYS = {"new", "updated", "az", "upvotes"}
PRODUCT_STATUS_KEYS = {
    ProductStatus.DRAFT.value,
    ProductStatus.PUBLISHED.value,
    ProductStatus.ARCHIVED.value,
}
CLAIM_PENDING_WINDOW = timedelta(minutes=15)
DNS_LOCK_WINDOW = timedelta(minutes=5)
CLAIM_EMAIL_DOMAIN_SECOND_LEVELS = {"co", "com", "org", "net", "gov", "ac", "edu"}


def _ensure_active_user(user: User) -> None:
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail=INACTIVE_ACCOUNT_MESSAGE)


def _map_active_user(user: User) -> MemberActiveUser:
    return MemberActiveUser(
        id=str(user.id),
        email=user.email,
        role=user.role.value if user.role else None,
        status=user.status.value if user.status else UserStatus.ACTIVE.value,
        firstName=user.first_name,
        lastName=user.last_name,
        onboardedAt=user.onboarded_at.isoformat() if user.onboarded_at else None,
    )


def _map_feedback_item(feedback: MemberFeedback) -> MemberFeedbackListItem:
    return MemberFeedbackListItem(
        id=str(feedback.id),
        subject=feedback.subject,
        message=feedback.message,
        rating=feedback.rating,
        status=feedback.status.value if feedback.status else "received",
        adminNote=feedback.admin_note,
        rewardEligible=feedback.reward_eligible,
        rewardGrantedAt=feedback.reward_granted_at.isoformat()
        if feedback.reward_granted_at
        else None,
        createdAt=feedback.created_at.isoformat(),
        updatedAt=feedback.updated_at.isoformat(),
    )


def _normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _sync_user_profile(
    user: User,
    *,
    email: str | None = None,
    first_name: str | None = None,
    last_name: str | None = None,
) -> bool:
    updated = False
    if email is not None and user.email != email:
        user.email = email
        updated = True
    if first_name is not None and user.first_name != first_name:
        user.first_name = first_name
        updated = True
    if last_name is not None and user.last_name != last_name:
        user.last_name = last_name
        updated = True
    return updated


async def _commit_member_user(session: Session, user: User) -> None:
    try:
        session.add(user)
        await session.commit()
        await session.refresh(user)
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Email is already in use.") from exc


def _iso_or_none(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed_raw = value.strip()
    if not parsed_raw:
        return None
    if parsed_raw.endswith("Z"):
        parsed_raw = f"{parsed_raw[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(parsed_raw)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _resolve_plan_assigned_at(
    *,
    current_plan: Plan | None,
    current_assigned_at: datetime | None,
    new_plan: Plan,
    now: datetime | None = None,
) -> datetime | None:
    active_now = now or _utc_now()
    new_boost_days = new_plan.boost_for_days or 0
    if new_plan.is_default or new_boost_days <= 0:
        return None

    remaining = timedelta(0)
    if (
        current_assigned_at
        and current_plan
        and not current_plan.is_default
        and (current_plan.boost_for_days or 0) > 0
    ):
        elapsed = max(active_now - current_assigned_at, timedelta(0))
        previous_total = timedelta(days=current_plan.boost_for_days or 0)
        remaining = max(previous_total - elapsed, timedelta(0))

    if remaining <= timedelta(0):
        return active_now
    return active_now + remaining


def _feature_keys_for_plan(plan: Plan | None) -> set[str]:
    if not plan or not plan.assignments:
        return set()
    return {
        assignment.feature.key
        for assignment in plan.assignments
        if assignment.enabled and assignment.feature and assignment.feature.key
    }


def _extract_root_domain(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    parsed = urlparse(raw if "://" in raw else f"https://{raw}")
    hostname = (parsed.hostname or "").strip(".").lower()
    if not hostname:
        return None
    labels = [label for label in hostname.split(".") if label]
    if len(labels) <= 2:
        return ".".join(labels)
    if len(labels[-1]) == 2 and labels[-2] in CLAIM_EMAIL_DOMAIN_SECOND_LEVELS:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def _email_matches_domain(email: str, root_domain: str) -> bool:
    parts = email.split("@")
    if len(parts) != 2:
        return False
    email_domain = parts[1].strip().lower()
    domain = root_domain.strip().lower()
    return email_domain == domain or email_domain.endswith(f".{domain}")


def _generate_verification_txt(website_url: str) -> str:
    normalized = website_url.strip().lower()
    digest = sha256(normalized.encode("utf-8")).hexdigest()[:12]
    return f"prod-verif-shipyard-{digest}"


def _extract_adjustment_amount(metadata: Any) -> float | None:
    if not isinstance(metadata, dict):
        return None
    candidate = (
        metadata.get("adjustment")
        or metadata.get("adjustmentAmount")
        or metadata.get("amount")
    )
    if isinstance(candidate, (int, float)):
        return float(candidate)
    if isinstance(candidate, str):
        try:
            return float(candidate)
        except ValueError:
            return None
    if isinstance(candidate, dict):
        nested = candidate.get("amount")
        if isinstance(nested, (int, float)):
            return float(nested)
        if isinstance(nested, str):
            try:
                return float(nested)
            except ValueError:
                return None
    return None


async def _get_owned_product_by_id(
    session: Session,
    *,
    product_id: str,
    user_id: int,
    include_plan_assignments: bool = False,
) -> Product:
    try:
        numeric_product_id = int(product_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid product identifier.") from exc

    plan_load = selectinload(Product.plan)
    if include_plan_assignments:
        plan_load = plan_load.selectinload(Plan.assignments).selectinload(
            PlanFeatureAssignment.feature
        )
    stmt = (
        select(Product)
        .where(
            Product.id == numeric_product_id,
            Product.user_id == user_id,
        )
        .options(plan_load)
    )
    product = (await session.exec(stmt)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or not owned by user.")
    return product


def _resolve_claim_target_payload(product: Product) -> dict[str, str]:
    website_url = (product.website_url or "").strip()
    if not website_url:
        raise HTTPException(status_code=400, detail="Product is missing a website URL.")
    domain = _extract_root_domain(website_url)
    if not domain:
        raise HTTPException(
            status_code=400,
            detail="Unable to derive domain from website.",
        )
    if product.verification and product.verification.is_verified:
        raise HTTPException(status_code=400, detail="This product is already verified.")
    expected_txt = (
        product.verification.verification_txt
        if product.verification and product.verification.verification_txt
        else _generate_verification_txt(website_url)
    )
    return {
        "id": str(product.id),
        "name": product.name,
        "slug": product.slug,
        "websiteUrl": website_url,
        "domain": domain,
        "expectedTxt": expected_txt,
    }


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
    _ensure_active_user(current_user)

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


@router.get("/me", response_model=MemberActiveUser)
async def get_member_me(current_user: CurrentUser) -> MemberActiveUser:
    _ensure_active_user(current_user)
    return _map_active_user(current_user)


@router.post("/me/sync", response_model=MemberActiveUser)
async def sync_member_me(
    payload: MemberSyncProfileInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberActiveUser:
    _ensure_active_user(current_user)
    updated = _sync_user_profile(
        current_user,
        email=_normalize_optional(payload.email),
        first_name=_normalize_optional(payload.firstName),
        last_name=_normalize_optional(payload.lastName),
    )
    if updated:
        await _commit_member_user(session, current_user)
    return _map_active_user(current_user)


@router.get("/feedback", response_model=list[MemberFeedbackListItem])
async def list_member_feedback(
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
) -> list[MemberFeedbackListItem]:
    _ensure_active_user(current_user)
    stmt = (
        select(MemberFeedback)
        .where(MemberFeedback.user_id == current_user.id)
        .order_by(MemberFeedback.created_at.desc())
        .limit(limit)
    )
    rows = (await session.exec(stmt)).all()
    return [_map_feedback_item(row) for row in rows]


@router.post(
    "/feedback",
    response_model=MemberFeedbackListItem,
    status_code=201,
)
async def create_member_feedback(
    payload: MemberFeedbackCreateInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberFeedbackListItem:
    _ensure_active_user(current_user)
    row = MemberFeedback(
        user_id=current_user.id,
        subject=payload.subject,
        message=payload.message,
        rating=payload.rating,
    )
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return _map_feedback_item(row)


@router.post(
    "/onboarding/complete",
    response_model=MemberOnboardingCompletePayload,
)
async def complete_member_onboarding(
    payload: MemberOnboardingCompleteInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberOnboardingCompletePayload:
    _ensure_active_user(current_user)
    updated = _sync_user_profile(
        current_user,
        email=_normalize_optional(payload.email),
        first_name=_normalize_optional(payload.firstName),
        last_name=_normalize_optional(payload.lastName),
    )
    first_time_onboarding = False
    if current_user.onboarded_at is None:
        current_user.role_intent = _normalize_optional(payload.roleIntent)
        current_user.heard_from = _normalize_optional(payload.heardFrom)
        current_user.onboarded_at = datetime.now(timezone.utc)
        updated = True
        first_time_onboarding = True

    if updated:
        await _commit_member_user(session, current_user)

    return MemberOnboardingCompletePayload(
        firstTimeOnboarding=first_time_onboarding,
        user=_map_active_user(current_user),
    )


@router.get("/overview/context", response_model=MemberOverviewContextPayload)
async def get_member_overview_context(
    current_user: CurrentUser,
    days: int = Query(default=7, ge=1, le=365),
    session: Session = Depends(get_session),
) -> MemberOverviewContextPayload:
    _ensure_active_user(current_user)

    products_stmt = select(Product.id, Product.slug).where(
        Product.user_id == current_user.id
    )
    product_rows = (await session.exec(products_stmt)).all()
    products = [
        MemberOverviewProduct(id=str(product_id), slug=slug)
        for product_id, slug in product_rows
    ]

    if not products:
        return MemberOverviewContextPayload(
            rangeDays=days,
            products=[],
            upvoteDates=[],
        )

    product_ids = [int(product.id) for product in products]
    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    range_start = today_start - timedelta(days=days - 1)
    range_end = today_start + timedelta(days=1)

    upvotes_stmt = (
        select(ProductUpvote.created_at)
        .where(
            ProductUpvote.product_id.in_(product_ids),
            ProductUpvote.created_at >= range_start,
            ProductUpvote.created_at < range_end,
        )
        .order_by(ProductUpvote.created_at.asc())
    )
    upvote_rows = (await session.exec(upvotes_stmt)).all()
    upvote_dates = [created_at.isoformat() for created_at in upvote_rows]

    return MemberOverviewContextPayload(
        rangeDays=days,
        products=products,
        upvoteDates=upvote_dates,
    )


@router.get(
    "/features/{feature_key}/has-access",
    response_model=MemberFeatureAccessPayload,
)
async def get_member_feature_access(
    feature_key: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberFeatureAccessPayload:
    _ensure_active_user(current_user)
    normalized_feature_key = feature_key.strip()
    if not normalized_feature_key:
        raise HTTPException(status_code=422, detail="feature_key is required")

    owned_product_stmt = (
        select(Product.id)
        .join(Plan, Product.plan_id == Plan.id)
        .join(PlanFeatureAssignment, PlanFeatureAssignment.plan_id == Plan.id)
        .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
        .where(
            Product.user_id == current_user.id,
            PlanFeatureAssignment.enabled.is_(True),
            PlanFeature.key == normalized_feature_key,
        )
        .limit(1)
    )
    has_owned_product_feature = (await session.exec(owned_product_stmt)).first() is not None

    has_purchased_feature = False
    if not has_owned_product_feature:
        purchased_feature_stmt = (
            select(UserPlanPurchase.id)
            .join(Plan, UserPlanPurchase.plan_id == Plan.id)
            .join(PlanFeatureAssignment, PlanFeatureAssignment.plan_id == Plan.id)
            .join(PlanFeature, PlanFeature.id == PlanFeatureAssignment.feature_id)
            .where(
                UserPlanPurchase.user_id == current_user.id,
                PlanFeatureAssignment.enabled.is_(True),
                PlanFeature.key == normalized_feature_key,
            )
            .limit(1)
        )
        has_purchased_feature = (
            await session.exec(purchased_feature_stmt)
        ).first() is not None

    has_direct_entitlement = False
    if not has_owned_product_feature and not has_purchased_feature:
        direct_entitlement_stmt = (
            select(FeatureEntitlement.id)
            .where(
                FeatureEntitlement.user_id == current_user.id,
                FeatureEntitlement.feature_key == normalized_feature_key,
                FeatureEntitlement.status.in_(ACTIVE_FEATURE_STATUSES),
            )
            .limit(1)
        )
        has_direct_entitlement = (
            await session.exec(direct_entitlement_stmt)
        ).first() is not None

    return MemberFeatureAccessPayload(
        featureKey=normalized_feature_key,
        hasAccess=(
            has_owned_product_feature
            or has_purchased_feature
            or has_direct_entitlement
        ),
    )


@router.get("/products")
async def list_member_products(
    current_user: CurrentUser,
    verification: str | None = Query(default=None),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    sort: str = Query(default="new"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)

    safe_sort = sort if sort in PRODUCT_SORT_KEYS else "new"
    safe_status = status if status in PRODUCT_STATUS_KEYS else None
    search_query = (q or "").strip()
    offset = (page - 1) * limit

    filters: list[Any] = [Product.user_id == current_user.id]
    if verification == "verified":
        filters.append(Product.verification.has(ProductVerification.is_verified.is_(True)))
    elif verification == "unverified":
        filters.append(Product.verification.has(ProductVerification.is_verified.is_(False)))

    if safe_status:
        filters.append(Product.status == ProductStatus(safe_status))

    if search_query:
        like_query = f"%{search_query}%"
        filters.append(
            or_(
                Product.name.ilike(like_query),
                Product.slug.ilike(like_query),
            )
        )

    count_stmt = select(func.count()).select_from(Product).where(*filters)
    total = int((await session.exec(count_stmt)).one() or 0)

    stmt = (
        select(Product)
        .where(*filters)
        .options(
            selectinload(Product.category),
            selectinload(Product.plan)
            .selectinload(Plan.assignments)
            .selectinload(PlanFeatureAssignment.feature),
            selectinload(Product.verification),
            selectinload(Product.analytics),
            selectinload(Product.feature_entitlements),
        )
    )

    if safe_sort == "updated":
        stmt = stmt.order_by(Product.updated_at.desc())
    elif safe_sort == "az":
        stmt = stmt.order_by(Product.name.asc())
    elif safe_sort == "upvotes":
        stmt = stmt.outerjoin(
            ProductAnalytics,
            ProductAnalytics.product_id == Product.id,
        ).order_by(
            ProductAnalytics.upvotes.desc().nullslast(),
            Product.created_at.desc(),
        )
    else:
        stmt = stmt.order_by(Product.created_at.desc())

    stmt = stmt.offset(offset).limit(limit)
    products = (await session.exec(stmt)).all()

    default_plan: Plan | None = None
    if any(product.plan is None for product in products):
        default_plan_stmt = (
            select(Plan)
            .where(Plan.is_default.is_(True))
            .options(
                selectinload(Plan.assignments).selectinload(
                    PlanFeatureAssignment.feature
                )
            )
            .order_by(Plan.id.asc())
            .limit(1)
        )
        default_plan = (await session.exec(default_plan_stmt)).first()

    payload_products: list[dict[str, Any]] = []
    for product in products:
        entitlement_features = {
            entitlement.feature_key
            for entitlement in product.feature_entitlements or []
            if entitlement.status in ACTIVE_PRODUCT_ENTITLEMENT_STATUSES
            and entitlement.feature_key
        }
        plan_for_access = product.plan or default_plan
        plan_features = _feature_keys_for_plan(plan_for_access)
        has_advanced_analytics = (
            "analytics.advanced" in plan_features
            or "analytics.advanced" in entitlement_features
        )
        can_view_analytics = (
            has_advanced_analytics
            or "analytics.basic" in plan_features
            or "analytics.basic" in entitlement_features
        )
        plan_for_display = product.plan or default_plan
        plan_payload = (
            {
                "id": str(plan_for_display.id),
                "name": plan_for_display.name,
            }
            if plan_for_display
            else None
        )
        category_payload = (
            {
                "id": str(product.category.id),
                "name": product.category.name,
                "slug": product.category.slug,
            }
            if product.category
            else None
        )
        verification_payload = (
            {"isVerified": bool(product.verification.is_verified)}
            if product.verification
            else None
        )
        analytics_payload = (
            {"upvotes": int(product.analytics.upvotes)}
            if product.analytics
            else {"upvotes": 0}
        )

        payload_products.append(
            {
                "id": str(product.id),
                "name": product.name,
                "slug": product.slug,
                "logo": product.logo,
                "userId": str(product.user_id),
                "status": product.status.value if product.status else ProductStatus.PUBLISHED.value,
                "createdAt": _iso_or_none(product.created_at),
                "updatedAt": _iso_or_none(product.updated_at),
                "category": category_payload,
                "plan": plan_payload,
                "verification": verification_payload,
                "analytics": analytics_payload,
                "canDelete": product.user_id == current_user.id,
                "canViewAnalytics": can_view_analytics,
            }
        )

    return {
        "products": payload_products,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/products/{product_id}/ownership")
async def get_owned_product_context(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    product = await _get_owned_product_by_id(
        session,
        product_id=product_id,
        user_id=current_user.id,
        include_plan_assignments=False,
    )
    current_plan = _map_manageable_plan(product)
    return {
        "product": {
            "id": str(product.id),
            "name": product.name,
            "slug": product.slug,
            "userId": str(product.user_id),
            "status": product.status.value if product.status else ProductStatus.PUBLISHED.value,
            "planAssignedAt": _iso_or_none(product.plan_assigned_at),
            "currentPlan": current_plan.model_dump() if current_plan else None,
        }
    }


@router.post("/products/{product_id}/plan")
async def set_owned_product_plan(
    product_id: str,
    payload: dict[str, Any],
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    product = await _get_owned_product_by_id(
        session,
        product_id=product_id,
        user_id=current_user.id,
        include_plan_assignments=False,
    )

    raw_plan_id = payload.get("planId")
    if raw_plan_id is not None and not isinstance(raw_plan_id, str):
        raise HTTPException(status_code=422, detail="planId must be a string or null.")
    plan_id = raw_plan_id.strip() if isinstance(raw_plan_id, str) else None
    if plan_id == "":
        plan_id = None

    subscription_id_provided = "subscriptionId" in payload
    raw_subscription_id = payload.get("subscriptionId")
    if raw_subscription_id is not None and not isinstance(raw_subscription_id, str):
        raise HTTPException(
            status_code=422,
            detail="subscriptionId must be a string or null.",
        )
    subscription_id = (
        raw_subscription_id.strip() if isinstance(raw_subscription_id, str) else None
    )
    if subscription_id == "":
        subscription_id = None

    if not plan_id:
        product.plan_id = None
        product.plan_assigned_at = None
        product.subscription_id = None
    else:
        try:
            numeric_plan_id = int(plan_id)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid plan identifier.") from exc

        plan_stmt = select(Plan).where(Plan.id == numeric_plan_id).limit(1)
        plan = (await session.exec(plan_stmt)).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")

        product.plan_assigned_at = _resolve_plan_assigned_at(
            current_plan=product.plan,
            current_assigned_at=product.plan_assigned_at,
            new_plan=plan,
        )
        product.plan_id = plan.id
        if plan.type != PlanType.RECURRING_PRICE:
            product.subscription_id = None
        elif subscription_id_provided:
            product.subscription_id = subscription_id

    try:
        session.add(product)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Unable to update product plan.") from exc

    return {"success": True}


@router.get("/products/{product_id}/connector")
async def get_member_product_connector(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any] | None:
    _ensure_active_user(current_user)
    product = await _get_owned_product_by_id(
        session,
        product_id=product_id,
        user_id=current_user.id,
        include_plan_assignments=False,
    )
    connector_stmt = (
        select(PaymentConnector)
        .where(PaymentConnector.product_id == product.id)
        .options(selectinload(PaymentConnector.credentials))
        .limit(1)
    )
    connector = (await session.exec(connector_stmt)).first()
    if not connector:
        return None

    active_credentials = sorted(
        [
            credential
            for credential in connector.credentials or []
            if credential.status == PaymentCredentialStatus.ACTIVE
        ],
        key=lambda credential: credential.created_at,
        reverse=True,
    )
    key_hint = active_credentials[0].key_hint if active_credentials else None
    config = connector.config if isinstance(connector.config, dict) else {}
    account_id = config.get("accountId")
    brand_id = config.get("brandId")

    return {
        "id": str(connector.id),
        "provider": connector.provider.value if connector.provider else None,
        "status": connector.status.value if connector.status else None,
        "lastSyncedAt": _iso_or_none(connector.last_synced_at),
        "lastSyncError": connector.last_sync_error,
        "latestAllTimeRevenueCents": connector.latest_all_time_revenue_cents,
        "latestCurrencyCode": connector.latest_currency_code,
        "latestPeriodStart": _iso_or_none(connector.latest_period_start),
        "config": config,
        "keyHint": key_hint,
        "accountId": account_id if isinstance(account_id, str) else None,
        "brandId": brand_id if isinstance(brand_id, str) else None,
    }


@router.get("/rewards/snapshot")
async def get_member_rewards_snapshot(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    user_id = current_user.id

    balance_stmt = select(RewardBalance).where(RewardBalance.user_id == user_id).limit(1)
    balance = (await session.exec(balance_stmt)).first()

    transactions_stmt = (
        select(RewardTransaction)
        .where(RewardTransaction.user_id == user_id)
        .order_by(RewardTransaction.created_at.desc())
        .limit(20)
        .options(
            selectinload(RewardTransaction.rule),
            selectinload(RewardTransaction.catalog_item),
            selectinload(RewardTransaction.product),
        )
    )
    transactions = (await session.exec(transactions_stmt)).all()

    catalog_stmt = (
        select(RewardCatalogItem)
        .where(RewardCatalogItem.is_active.is_(True))
        .order_by(
            RewardCatalogItem.category.asc(),
            RewardCatalogItem.base_cost.asc(),
            RewardCatalogItem.name.asc(),
        )
    )
    catalog_items = (await session.exec(catalog_stmt)).all()

    entitlements_stmt = (
        select(FeatureEntitlement)
        .where(
            FeatureEntitlement.user_id == user_id,
            FeatureEntitlement.status.in_(ACTIVE_REWARD_ENTITLEMENT_STATUSES),
        )
        .order_by(FeatureEntitlement.created_at.desc())
        .limit(20)
        .options(
            selectinload(FeatureEntitlement.catalog_item),
            selectinload(FeatureEntitlement.product),
        )
    )
    entitlements = (await session.exec(entitlements_stmt)).all()

    redemptions_stmt = (
        select(Redemption)
        .where(Redemption.user_id == user_id)
        .order_by(Redemption.created_at.desc())
        .limit(20)
        .options(
            selectinload(Redemption.catalog_item),
            selectinload(Redemption.product),
            selectinload(Redemption.placement_schedules),
        )
    )
    redemptions = (await session.exec(redemptions_stmt)).all()

    product_options_stmt = (
        select(Product)
        .where(Product.user_id == user_id)
        .order_by(Product.name.asc())
    )
    product_options = (await session.exec(product_options_stmt)).all()

    active_counts_stmt = (
        select(
            FeatureEntitlement.feature_key,
            func.count(FeatureEntitlement.feature_key),
        )
        .where(
            FeatureEntitlement.user_id == user_id,
            FeatureEntitlement.status.in_(ACTIVE_REWARD_ENTITLEMENT_STATUSES),
        )
        .group_by(FeatureEntitlement.feature_key)
    )
    active_counts_rows = (await session.exec(active_counts_stmt)).all()
    active_count_map = {
        str(row[0]): int(row[1] or 0)
        for row in active_counts_rows
        if row[0]
    }

    pending_counts_stmt = (
        select(
            Redemption.feature_key,
            func.count(Redemption.feature_key),
        )
        .where(
            Redemption.user_id == user_id,
            Redemption.status == RedemptionStatus.PENDING,
        )
        .group_by(Redemption.feature_key)
    )
    pending_counts_rows = (await session.exec(pending_counts_stmt)).all()
    pending_count_map = {
        str(row[0]): int(row[1] or 0)
        for row in pending_counts_rows
        if row[0]
    }

    balance_payload = {
        "balance": int(balance.balance) if balance else 0,
        "lifetimeEarned": int(balance.lifetime_earned) if balance else 0,
        "lifetimeSpent": int(balance.lifetime_spent) if balance else 0,
        "lifetimeAdjusted": int(balance.lifetime_adjusted) if balance else 0,
        "currentStreakCount": int(balance.current_streak_count) if balance else 0,
        "longestStreakCount": int(balance.longest_streak_count) if balance else 0,
        "currentStreakTier": balance.current_streak_tier if balance else None,
        "streakActiveThrough": _iso_or_none(balance.streak_active_through) if balance else None,
        "lastEarnedAt": _iso_or_none(balance.last_earned_at) if balance else None,
        "lastRedeemedAt": _iso_or_none(balance.last_redeemed_at) if balance else None,
    }

    catalog_payload = []
    for item in catalog_items:
        feature_key = item.feature_key
        active_count = active_count_map.get(feature_key, 0)
        pending_count = pending_count_map.get(feature_key, 0)
        reasons: list[str] = []
        if balance_payload["balance"] < item.base_cost:
            reasons.append("Insufficient rewards")
        if (
            item.max_active_per_user is not None
            and active_count >= item.max_active_per_user
        ):
            reasons.append("Active limit reached")
        if (
            item.max_pending_per_user is not None
            and pending_count >= item.max_pending_per_user
        ):
            reasons.append("Pending limit reached")
        if item.requires_product and not product_options:
            reasons.append("Add a product to redeem")

        catalog_payload.append(
            {
                "id": str(item.id),
                "featureKey": feature_key,
                "planFeatureKey": item.plan_feature_key,
                "name": item.name,
                "description": item.description,
                "category": item.category.value if item.category else RewardFeatureCategory.UTILITY.value,
                "baseCost": item.base_cost,
                "durationSeconds": item.duration_seconds,
                "isActive": bool(item.is_active),
                "maxActivePerUser": item.max_active_per_user,
                "maxPendingPerUser": item.max_pending_per_user,
                "requiresProduct": bool(item.requires_product),
                "metadata": item.metadata_ if item.metadata_ is not None else None,
                "canAfford": balance_payload["balance"] >= item.base_cost,
                "canRedeem": len(reasons) == 0,
                "reasons": reasons,
                "activeCount": active_count,
                "pendingCount": pending_count,
                "requiresSchedule": item.category == RewardFeatureCategory.PLACEMENT,
            }
        )

    transactions_payload = []
    for transaction in transactions:
        adjustment_amount = (
            _extract_adjustment_amount(transaction.metadata_)
            if transaction.type == RewardTransactionType.ADJUSTMENT
            else None
        )
        transactions_payload.append(
            {
                "id": str(transaction.id),
                "type": transaction.type.value if transaction.type else RewardTransactionType.EARN.value,
                "rewardAmount": transaction.reward_amount,
                "balanceAfter": transaction.balance_after,
                "createdAt": _iso_or_none(transaction.created_at),
                "ruleKey": transaction.rule.key if transaction.rule else transaction.rule_key,
                "ruleName": transaction.rule.name if transaction.rule else None,
                "rewardKey": transaction.catalog_item.feature_key
                if transaction.catalog_item
                else transaction.reward_key,
                "rewardName": transaction.catalog_item.name if transaction.catalog_item else None,
                "productId": str(transaction.product.id) if transaction.product else None,
                "productName": transaction.product.name if transaction.product else None,
                "metadata": transaction.metadata_ if transaction.metadata_ is not None else None,
                "notes": transaction.notes,
                "adjustmentAmount": adjustment_amount,
            }
        )

    active_entitlements_payload = [
        {
            "id": str(entitlement.id),
            "featureKey": entitlement.catalog_item.feature_key
            if entitlement.catalog_item
            else entitlement.feature_key,
            "name": entitlement.catalog_item.name
            if entitlement.catalog_item
            else entitlement.feature_key,
            "status": entitlement.status.value
            if entitlement.status
            else FeatureEntitlementStatus.PENDING.value,
            "startsAt": _iso_or_none(entitlement.starts_at),
            "expiresAt": _iso_or_none(entitlement.expires_at),
            "productId": str(entitlement.product.id) if entitlement.product else None,
            "productName": entitlement.product.name if entitlement.product else None,
            "productSlug": entitlement.product.slug if entitlement.product else None,
        }
        for entitlement in entitlements
    ]

    recent_redemptions_payload = []
    for redemption in redemptions:
        latest_schedule = None
        if redemption.placement_schedules:
            latest_schedule = sorted(
                redemption.placement_schedules,
                key=lambda schedule: schedule.created_at,
                reverse=True,
            )[0]
        recent_redemptions_payload.append(
            {
                "id": str(redemption.id),
                "featureKey": redemption.catalog_item.feature_key
                if redemption.catalog_item
                else redemption.feature_key,
                "name": redemption.catalog_item.name
                if redemption.catalog_item
                else redemption.feature_key,
                "status": redemption.status.value if redemption.status else RedemptionStatus.PENDING.value,
                "cost": redemption.cost,
                "createdAt": _iso_or_none(redemption.created_at),
                "startsAt": _iso_or_none(redemption.starts_at),
                "activatedAt": _iso_or_none(redemption.activated_at),
                "expiresAt": _iso_or_none(redemption.expires_at),
                "productId": str(redemption.product.id) if redemption.product else None,
                "productName": redemption.product.name if redemption.product else None,
                "productSlug": redemption.product.slug if redemption.product else None,
                "placementStatus": latest_schedule.status.value
                if latest_schedule and latest_schedule.status
                else None,
            }
        )

    product_options_payload = [
        {
            "id": str(product.id),
            "name": product.name,
            "slug": product.slug,
            "status": product.status.value if product.status else ProductStatus.DRAFT.value,
        }
        for product in product_options
    ]

    return {
        "balance": balance_payload,
        "transactions": transactions_payload,
        "catalog": catalog_payload,
        "activeEntitlements": active_entitlements_payload,
        "recentRedemptions": recent_redemptions_payload,
        "productOptions": product_options_payload,
    }


async def _reserve_claim_attempt(
    session: Session,
    *,
    product_id: int,
    user_id: int,
    method: ProductClaimMethod,
    email: str | None = None,
    otp_hash: str | None = None,
    expires_at: datetime | None = None,
) -> tuple[ProductClaimAttempt | None, str | None]:
    now = _utc_now()
    active_stmt = (
        select(ProductClaimAttempt)
        .where(
            ProductClaimAttempt.product_id == product_id,
            ProductClaimAttempt.status == ProductClaimStatus.PENDING,
            ProductClaimAttempt.otp_expires_at.is_not(None),
            ProductClaimAttempt.otp_expires_at > now,
        )
        .order_by(ProductClaimAttempt.updated_at.desc())
        .limit(1)
    )
    active_attempt = (await session.exec(active_stmt)).first()
    if active_attempt and active_attempt.user_id != user_id:
        return (
            None,
            "Another claim attempt is already running for this product. Try again shortly.",
        )

    if active_attempt:
        active_attempt.method = method
        active_attempt.email = email if email is not None else active_attempt.email
        active_attempt.otp_hash = otp_hash if otp_hash is not None else active_attempt.otp_hash
        active_attempt.otp_expires_at = (
            expires_at if expires_at is not None else active_attempt.otp_expires_at
        )
        active_attempt.status = ProductClaimStatus.PENDING
        session.add(active_attempt)
        await session.commit()
        await session.refresh(active_attempt)
        return active_attempt, None

    attempt = ProductClaimAttempt(
        product_id=product_id,
        user_id=user_id,
        method=method,
        email=email,
        otp_hash=otp_hash,
        otp_expires_at=expires_at,
        status=ProductClaimStatus.PENDING,
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)
    return attempt, None


async def _get_claim_product(
    session: Session,
    *,
    product_id: str,
) -> Product:
    try:
        numeric_product_id = int(product_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid product identifier.") from exc

    stmt = (
        select(Product)
        .where(Product.id == numeric_product_id)
        .options(selectinload(Product.verification))
        .limit(1)
    )
    product = (await session.exec(stmt)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


@router.get("/claims/products")
async def list_claimable_products(
    current_user: CurrentUser,
    q: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)

    filters = [
        Product.user_id != current_user.id,
        Product.verification.has(ProductVerification.is_verified.is_(False)),
    ]
    search_query = (q or "").strip()
    if search_query:
        like_query = f"%{search_query}%"
        filters.append(
            or_(
                Product.name.ilike(like_query),
                Product.slug.ilike(like_query),
                Product.website_url.ilike(like_query),
            )
        )

    stmt = (
        select(Product)
        .where(and_(*filters))
        .order_by(Product.created_at.desc())
        .options(selectinload(Product.verification))
    )
    products = (await session.exec(stmt)).all()
    payload = []
    for product in products:
        domain = _extract_root_domain(product.website_url)
        if not domain:
            continue
        expected_txt = (
            product.verification.verification_txt
            if product.verification and product.verification.verification_txt
            else _generate_verification_txt(product.website_url or domain)
        )
        payload.append(
            {
                "id": str(product.id),
                "name": product.name,
                "slug": product.slug,
                "websiteUrl": product.website_url,
                "domain": domain,
                "expectedTxt": expected_txt,
            }
        )
    return {"products": payload}


@router.get("/claims/{product_id}/target")
async def get_claim_target(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    return _resolve_claim_target_payload(product)


@router.post("/claims/{product_id}/dns/confirm")
async def confirm_claim_dns(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    _resolve_claim_target_payload(product)

    lock_expires_at = _utc_now() + DNS_LOCK_WINDOW
    _, reserve_error = await _reserve_claim_attempt(
        session,
        product_id=product.id,
        user_id=current_user.id,
        method=ProductClaimMethod.DNS,
        expires_at=lock_expires_at,
    )
    if reserve_error:
        raise HTTPException(status_code=409, detail=reserve_error)

    return {"success": True, "lockExpiresAt": _iso_or_none(lock_expires_at)}


@router.post("/claims/{product_id}/otp/request")
async def request_claim_otp(
    product_id: str,
    payload: dict[str, Any],
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    email = _normalize_optional(str(payload.get("email") or ""))
    otp_hash = _normalize_optional(str(payload.get("otpHash") or ""))
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email.")
    if not otp_hash:
        raise HTTPException(status_code=400, detail="Missing verification code hash.")

    expires_at = _parse_iso_datetime(
        payload.get("otpExpiresAt") if isinstance(payload.get("otpExpiresAt"), str) else None
    ) or (_utc_now() + CLAIM_PENDING_WINDOW)

    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    target = _resolve_claim_target_payload(product)
    if not _email_matches_domain(email.lower(), target["domain"]):
        raise HTTPException(
            status_code=400,
            detail=f"Email must use {target['domain']}.",
        )

    lock_stmt = (
        select(ProductClaimAttempt)
        .where(
            ProductClaimAttempt.product_id == product.id,
            ProductClaimAttempt.user_id == current_user.id,
            ProductClaimAttempt.method == ProductClaimMethod.DNS,
            ProductClaimAttempt.status == ProductClaimStatus.PENDING,
            ProductClaimAttempt.otp_expires_at.is_not(None),
            ProductClaimAttempt.otp_expires_at > _utc_now(),
        )
        .order_by(ProductClaimAttempt.updated_at.desc())
        .limit(1)
    )
    lock_attempt = (await session.exec(lock_stmt)).first()
    if not lock_attempt:
        raise HTTPException(
            status_code=400,
            detail="Verify DNS first to lock this domain before emailing.",
        )

    _, reserve_error = await _reserve_claim_attempt(
        session,
        product_id=product.id,
        user_id=current_user.id,
        method=ProductClaimMethod.EMAIL_OTP,
        email=email.lower(),
        otp_hash=otp_hash,
        expires_at=expires_at,
    )
    if reserve_error:
        raise HTTPException(status_code=409, detail=reserve_error)

    return {
        "success": True,
        "expiresAt": _iso_or_none(expires_at),
        "domain": target["domain"],
        "productName": target["name"],
    }


@router.post("/claims/{product_id}/otp/verify")
async def verify_claim_otp(
    product_id: str,
    payload: dict[str, Any],
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    _ensure_active_user(current_user)
    otp_hash = _normalize_optional(str(payload.get("otpHash") or ""))
    if not otp_hash:
        raise HTTPException(
            status_code=400,
            detail="Enter the 6-digit code from your email.",
        )

    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    target = _resolve_claim_target_payload(product)

    attempt_stmt = (
        select(ProductClaimAttempt)
        .where(
            ProductClaimAttempt.product_id == product.id,
            ProductClaimAttempt.user_id == current_user.id,
            ProductClaimAttempt.method == ProductClaimMethod.EMAIL_OTP,
            ProductClaimAttempt.status == ProductClaimStatus.PENDING,
        )
        .order_by(ProductClaimAttempt.updated_at.desc())
        .limit(1)
    )
    attempt = (await session.exec(attempt_stmt)).first()
    if not attempt:
        raise HTTPException(
            status_code=400,
            detail="No active email verification found. Send a new code.",
        )

    now = _utc_now()
    if attempt.otp_expires_at and attempt.otp_expires_at < now:
        attempt.status = ProductClaimStatus.EXPIRED
        session.add(attempt)
        await session.commit()
        raise HTTPException(
            status_code=400,
            detail="That code has expired. Send a new code.",
        )

    if attempt.otp_hash != otp_hash:
        raise HTTPException(
            status_code=400,
            detail="Invalid code. Double-check and try again.",
        )

    previous_owner_id = product.user_id
    product.user_id = current_user.id
    session.add(product)

    if product.verification:
        product.verification.verification_txt = target["expectedTxt"]
        product.verification.is_verified = True
        product.verification.verified_at = now
        session.add(product.verification)
    else:
        verification = ProductVerification(
            product_id=product.id,
            verification_txt=target["expectedTxt"],
            is_verified=True,
            verified_at=now,
        )
        session.add(verification)

    pending_attempts_stmt = select(ProductClaimAttempt).where(
        ProductClaimAttempt.product_id == product.id,
        ProductClaimAttempt.status == ProductClaimStatus.PENDING,
    )
    pending_attempts = (await session.exec(pending_attempts_stmt)).all()
    for pending_attempt in pending_attempts:
        pending_attempt.status = ProductClaimStatus.FULFILLED
        pending_attempt.otp_hash = None
        session.add(pending_attempt)

    await session.commit()

    return {
        "success": True,
        "slug": product.slug,
        "previousOwnerId": str(previous_owner_id) if previous_owner_id else None,
    }
