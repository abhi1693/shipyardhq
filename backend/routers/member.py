from __future__ import annotations

import os
import re
import secrets
from datetime import datetime, time, timedelta, timezone
from hashlib import sha256
from typing import Any
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser
from database import get_session
from models import (
    FeatureSubjectType,
    FeatureEntitlement,
    FeatureEntitlementStatus,
    MemberFeedback,
    PaymentConnector,
    PaymentCredentialStatus,
    PlacementSchedule,
    PlacementStatus,
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
    ProductTrafficDaily,
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
    MemberActiveEntitlementPayload,
    MemberClaimableProductPayload,
    MemberClaimableProductsPayload,
    MemberClaimDnsConfirmPayload,
    MemberClaimOtpRequestInput,
    MemberClaimOtpRequestPayload,
    MemberClaimOtpVerifyInput,
    MemberClaimOtpVerifyPayload,
    MemberFeatureAccessPayload,
    MemberFeedbackCreateInput,
    MemberFeedbackListItem,
    MemberManageablePlanSummary,
    MemberManageableProductPayload,
    MemberManageableProductSummary,
    MemberOnboardingCompleteInput,
    MemberOnboardingCompletePayload,
    MemberRewardsRedeemInput,
    MemberRewardsRedeemPayload,
    MemberRewardsSnapshotPayload,
    MemberOverviewContextPayload,
    MemberOverviewSummaryPayload,
    MemberOverviewSummaryPoint,
    MemberOverviewProduct,
    MemberOwnedProductPayload,
    MemberOwnedProductSummary,
    MemberProductAnalyticsSummary,
    MemberProductCategorySummary,
    MemberProductConnectorPayload,
    MemberProductListItem,
    MemberProductPlanSummary,
    MemberProductVerificationSummary,
    MemberProductsListPayload,
    MemberRecentRedemptionPayload,
    MemberRewardCatalogItemPayload,
    MemberRewardProductOptionPayload,
    MemberRewardTransactionPayload,
    MemberRewardsBalancePayload,
    MemberSetProductPlanInput,
    MemberSuccessPayload,
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
CLAIM_OTP_PATTERN = re.compile(r"^[0-9]{6}$")


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


def _generate_claim_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_claim_otp_code(code: str) -> str:
    otp_salt = os.getenv("OTP_SALT", "")
    return sha256(f"{code}:{otp_salt}".encode("utf-8")).hexdigest()


def _decode_dns_txt_answer(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return ""
    if '"' not in normalized:
        return normalized
    matches = re.findall(r'"([^"]*)"', normalized)
    if matches:
        return "".join(matches)
    return normalized.replace('"', "")


async def _lookup_dns_txt_values(domain: str) -> list[str]:
    endpoints = [
        f"https://cloudflare-dns.com/dns-query?name={domain}&type=TXT",
        f"https://dns.google/resolve?name={domain}&type=TXT",
    ]
    headers = {"accept": "application/dns-json"}
    values: list[str] = []

    async with httpx.AsyncClient(timeout=6.0) as client:
        for endpoint in endpoints:
            try:
                response = await client.get(endpoint, headers=headers)
                if response.status_code != 200:
                    continue
                payload = response.json()
                answers = payload.get("Answer") if isinstance(payload, dict) else None
                if not isinstance(answers, list):
                    continue
                for answer in answers:
                    if not isinstance(answer, dict):
                        continue
                    if answer.get("type") != 16:
                        continue
                    raw_value = answer.get("data")
                    if not isinstance(raw_value, str):
                        continue
                    decoded = _decode_dns_txt_answer(raw_value)
                    if decoded:
                        values.append(decoded)
            except Exception:
                continue

    deduped: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


async def _verify_claim_dns_txt_record(
    website_url: str,
    expected_txt: str,
) -> tuple[bool, str | None]:
    root_domain = _extract_root_domain(website_url)
    if not root_domain:
        return False, "Invalid domain."

    records = await _lookup_dns_txt_values(root_domain)
    expected = expected_txt.strip()
    if any(record.strip() == expected for record in records):
        return True, None
    return False, "Verification TXT record not found in DNS."


async def _send_claim_otp_notification(
    *,
    subscriber_id: str,
    email: str,
    first_name: str | None,
    last_name: str | None,
    code: str,
    domain: str,
    product_name: str,
    expires_at: datetime,
) -> None:
    novu_secret_key = (
        os.getenv("NOVU_SECRET_KEY")
        or os.getenv("NOVU_API_KEY")
        or ""
    ).strip()
    workflow_id = (
        os.getenv("NOVU_WORKFLOW_PRODUCT_CLAIM_OTP")
        or "product-claim-otp"
    ).strip()
    if not novu_secret_key or not workflow_id:
        return

    trimmed_subscriber_id = subscriber_id.strip()
    if not trimmed_subscriber_id:
        return

    base_url = (os.getenv("NOVU_API_URL") or "https://api.novu.co").rstrip("/")
    headers = {
        "Authorization": f"ApiKey {novu_secret_key}",
        "Content-Type": "application/json",
    }
    subscriber_payload: dict[str, Any] = {
        "subscriberId": trimmed_subscriber_id,
        "email": email,
    }
    if first_name:
        subscriber_payload["firstName"] = first_name
    if last_name:
        subscriber_payload["lastName"] = last_name

    trigger_payload: dict[str, Any] = {
        "workflowId": workflow_id,
        "to": trimmed_subscriber_id,
        "payload": {
            "notification": {
                "kind": "product_claim_otp",
                "code": code,
                "method": "email_otp",
                "domain": domain,
                "productName": product_name,
                "expiresAt": expires_at.isoformat(),
                "timestamp": _utc_now().isoformat(),
            }
        },
        "transactionId": (
            f"product_claim_otp:{trimmed_subscriber_id}:{domain}:"
            f"{int(expires_at.timestamp())}"
        ),
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(
                f"{base_url}/v1/subscribers",
                headers=headers,
                json=subscriber_payload,
            )
            await client.post(
                f"{base_url}/v1/events/trigger",
                headers=headers,
                json=trigger_payload,
            )
    except Exception as exc:
        print(
            "[novu] failed to send product claim OTP",
            {
                "error": str(exc),
                "subscriberId": trimmed_subscriber_id,
            },
        )


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


@router.get("/overview/summary", response_model=MemberOverviewSummaryPayload)
async def get_member_overview_summary(
    current_user: CurrentUser,
    days: int = Query(default=7, ge=1, le=365),
    session: Session = Depends(get_session),
) -> MemberOverviewSummaryPayload:
    _ensure_active_user(current_user)

    products_stmt = select(Product.id).where(Product.user_id == current_user.id)
    product_rows = (await session.exec(products_stmt)).all()
    product_ids = [int(product_id) for product_id in product_rows]

    now = _utc_now()
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    range_start = today_start - timedelta(days=days - 1)
    range_end = today_start + timedelta(days=1)

    daily_totals: dict[str, dict[str, int]] = {}

    if product_ids:
        traffic_stmt = (
            select(ProductTrafficDaily)
            .where(
                ProductTrafficDaily.product_id.in_(product_ids),
                ProductTrafficDaily.date >= range_start,
                ProductTrafficDaily.date < range_end,
            )
            .order_by(ProductTrafficDaily.date.asc())
        )
        traffic_rows = (await session.exec(traffic_stmt)).all()

        for row in traffic_rows:
            day_key = row.date.date().isoformat()
            entry = daily_totals.setdefault(
                day_key,
                {"views": 0, "uniqueVisitors": 0},
            )
            entry["views"] += int(row.page_views or 0)
            entry["uniqueVisitors"] += int(row.unique_visitors or 0)

    upvotes_in_range = 0
    if product_ids:
        upvotes_stmt = (
            select(func.count(ProductUpvote.id))
            .where(
                ProductUpvote.product_id.in_(product_ids),
                ProductUpvote.created_at >= range_start,
                ProductUpvote.created_at < range_end,
            )
        )
        upvotes_in_range = int((await session.exec(upvotes_stmt)).one() or 0)

    views_over_time: list[MemberOverviewSummaryPoint] = []
    total_views = 0
    total_unique_visitors = 0

    for index in range(days):
        cursor = range_start + timedelta(days=index)
        key = cursor.date().isoformat()
        totals = daily_totals.get(key, {"views": 0, "uniqueVisitors": 0})
        day_views = int(totals.get("views", 0))
        day_unique = int(totals.get("uniqueVisitors", 0))
        total_views += day_views
        total_unique_visitors += day_unique
        views_over_time.append(
            MemberOverviewSummaryPoint(
                date=key,
                label=cursor.strftime("%b %d").replace(" 0", " "),
                views=day_views,
                uniqueVisitors=day_unique,
            )
        )

    return MemberOverviewSummaryPayload(
        rangeDays=days,
        totalViews=total_views,
        uniqueVisitors=total_unique_visitors,
        upvotesInRange=upvotes_in_range,
        viewsOverTime=views_over_time,
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


@router.get("/products", response_model=MemberProductsListPayload)
async def list_member_products(
    current_user: CurrentUser,
    verification: str | None = Query(default=None),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    sort: str = Query(default="new"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
) -> MemberProductsListPayload:
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

    payload_products: list[MemberProductListItem] = []
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
        payload_products.append(
            MemberProductListItem(
                id=str(product.id),
                name=product.name,
                slug=product.slug,
                logo=product.logo,
                userId=str(product.user_id),
                status=product.status.value
                if product.status
                else ProductStatus.PUBLISHED.value,
                createdAt=_iso_or_none(product.created_at),
                updatedAt=_iso_or_none(product.updated_at),
                category=(
                    MemberProductCategorySummary(
                        id=str(product.category.id),
                        name=product.category.name,
                        slug=product.category.slug,
                    )
                    if product.category
                    else None
                ),
                plan=(
                    MemberProductPlanSummary(
                        id=str(plan_for_display.id),
                        name=plan_for_display.name,
                    )
                    if plan_for_display
                    else None
                ),
                verification=(
                    MemberProductVerificationSummary(
                        isVerified=bool(product.verification.is_verified)
                    )
                    if product.verification
                    else None
                ),
                analytics=MemberProductAnalyticsSummary(
                    upvotes=int(product.analytics.upvotes) if product.analytics else 0
                ),
                canDelete=product.user_id == current_user.id,
                canViewAnalytics=can_view_analytics,
            )
        )

    return MemberProductsListPayload(
        products=payload_products,
        total=total,
        page=page,
        limit=limit,
    )


@router.get(
    "/products/{product_id}/ownership",
    response_model=MemberOwnedProductPayload,
)
async def get_owned_product_context(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberOwnedProductPayload:
    _ensure_active_user(current_user)
    product = await _get_owned_product_by_id(
        session,
        product_id=product_id,
        user_id=current_user.id,
        include_plan_assignments=False,
    )
    current_plan = _map_manageable_plan(product)
    return MemberOwnedProductPayload(
        product=MemberOwnedProductSummary(
            id=str(product.id),
            name=product.name,
            slug=product.slug,
            userId=str(product.user_id),
            status=product.status.value
            if product.status
            else ProductStatus.PUBLISHED.value,
            planAssignedAt=_iso_or_none(product.plan_assigned_at),
            currentPlan=current_plan,
        )
    )


@router.post(
    "/products/{product_id}/plan",
    response_model=MemberSuccessPayload,
)
async def set_owned_product_plan(
    product_id: str,
    payload: MemberSetProductPlanInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberSuccessPayload:
    _ensure_active_user(current_user)
    product = await _get_owned_product_by_id(
        session,
        product_id=product_id,
        user_id=current_user.id,
        include_plan_assignments=False,
    )

    plan_id = _normalize_optional(payload.planId)
    subscription_id = _normalize_optional(payload.subscriptionId)
    subscription_id_provided = "subscriptionId" in payload.model_fields_set

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

    return MemberSuccessPayload(success=True)


@router.get(
    "/products/{product_id}/connector",
    response_model=MemberProductConnectorPayload | None,
)
async def get_member_product_connector(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberProductConnectorPayload | None:
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

    return MemberProductConnectorPayload(
        id=str(connector.id),
        provider=connector.provider.value if connector.provider else None,
        status=connector.status.value if connector.status else None,
        lastSyncedAt=_iso_or_none(connector.last_synced_at),
        lastSyncError=connector.last_sync_error,
        latestAllTimeRevenueCents=connector.latest_all_time_revenue_cents,
        latestCurrencyCode=connector.latest_currency_code,
        latestPeriodStart=_iso_or_none(connector.latest_period_start),
        config=config,
        keyHint=key_hint,
        accountId=account_id if isinstance(account_id, str) else None,
        brandId=brand_id if isinstance(brand_id, str) else None,
    )


@router.get("/rewards/snapshot", response_model=MemberRewardsSnapshotPayload)
async def get_member_rewards_snapshot(
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberRewardsSnapshotPayload:
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

    balance_payload = MemberRewardsBalancePayload(
        balance=int(balance.balance) if balance else 0,
        lifetimeEarned=int(balance.lifetime_earned) if balance else 0,
        lifetimeSpent=int(balance.lifetime_spent) if balance else 0,
        lifetimeAdjusted=int(balance.lifetime_adjusted) if balance else 0,
        currentStreakCount=int(balance.current_streak_count) if balance else 0,
        longestStreakCount=int(balance.longest_streak_count) if balance else 0,
        currentStreakTier=balance.current_streak_tier if balance else None,
        streakActiveThrough=_iso_or_none(balance.streak_active_through)
        if balance
        else None,
        lastEarnedAt=_iso_or_none(balance.last_earned_at) if balance else None,
        lastRedeemedAt=_iso_or_none(balance.last_redeemed_at) if balance else None,
    )

    catalog_payload: list[MemberRewardCatalogItemPayload] = []
    for item in catalog_items:
        feature_key = item.feature_key
        active_count = active_count_map.get(feature_key, 0)
        pending_count = pending_count_map.get(feature_key, 0)
        reasons: list[str] = []
        if balance_payload.balance < item.base_cost:
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
            MemberRewardCatalogItemPayload(
                id=str(item.id),
                featureKey=feature_key,
                planFeatureKey=item.plan_feature_key,
                name=item.name,
                description=item.description,
                category=item.category.value
                if item.category
                else RewardFeatureCategory.UTILITY.value,
                baseCost=item.base_cost,
                durationSeconds=item.duration_seconds,
                isActive=bool(item.is_active),
                maxActivePerUser=item.max_active_per_user,
                maxPendingPerUser=item.max_pending_per_user,
                requiresProduct=bool(item.requires_product),
                metadata=item.metadata_ if item.metadata_ is not None else None,
                canAfford=balance_payload.balance >= item.base_cost,
                canRedeem=len(reasons) == 0,
                reasons=reasons,
                activeCount=active_count,
                pendingCount=pending_count,
                requiresSchedule=item.category == RewardFeatureCategory.PLACEMENT,
            )
        )

    transactions_payload: list[MemberRewardTransactionPayload] = []
    for transaction in transactions:
        adjustment_amount = (
            _extract_adjustment_amount(transaction.metadata_)
            if transaction.type == RewardTransactionType.ADJUSTMENT
            else None
        )
        transactions_payload.append(
            MemberRewardTransactionPayload(
                id=str(transaction.id),
                type=transaction.type.value
                if transaction.type
                else RewardTransactionType.EARN.value,
                rewardAmount=transaction.reward_amount,
                balanceAfter=transaction.balance_after,
                createdAt=_iso_or_none(transaction.created_at),
                ruleKey=transaction.rule.key if transaction.rule else transaction.rule_key,
                ruleName=transaction.rule.name if transaction.rule else None,
                rewardKey=transaction.catalog_item.feature_key
                if transaction.catalog_item
                else transaction.reward_key,
                rewardName=transaction.catalog_item.name
                if transaction.catalog_item
                else None,
                productId=str(transaction.product.id) if transaction.product else None,
                productName=transaction.product.name if transaction.product else None,
                metadata=transaction.metadata_ if transaction.metadata_ is not None else None,
                notes=transaction.notes,
                adjustmentAmount=adjustment_amount,
            )
        )

    active_entitlements_payload = [
        MemberActiveEntitlementPayload(
            id=str(entitlement.id),
            featureKey=entitlement.catalog_item.feature_key
            if entitlement.catalog_item
            else entitlement.feature_key,
            name=entitlement.catalog_item.name
            if entitlement.catalog_item
            else entitlement.feature_key,
            status=entitlement.status.value
            if entitlement.status
            else FeatureEntitlementStatus.PENDING.value,
            startsAt=_iso_or_none(entitlement.starts_at),
            expiresAt=_iso_or_none(entitlement.expires_at),
            productId=str(entitlement.product.id) if entitlement.product else None,
            productName=entitlement.product.name if entitlement.product else None,
            productSlug=entitlement.product.slug if entitlement.product else None,
        )
        for entitlement in entitlements
    ]

    recent_redemptions_payload: list[MemberRecentRedemptionPayload] = []
    for redemption in redemptions:
        latest_schedule = None
        if redemption.placement_schedules:
            latest_schedule = sorted(
                redemption.placement_schedules,
                key=lambda schedule: schedule.created_at,
                reverse=True,
            )[0]
        recent_redemptions_payload.append(
            MemberRecentRedemptionPayload(
                id=str(redemption.id),
                featureKey=redemption.catalog_item.feature_key
                if redemption.catalog_item
                else redemption.feature_key,
                name=redemption.catalog_item.name
                if redemption.catalog_item
                else redemption.feature_key,
                status=redemption.status.value
                if redemption.status
                else RedemptionStatus.PENDING.value,
                cost=redemption.cost,
                createdAt=_iso_or_none(redemption.created_at),
                startsAt=_iso_or_none(redemption.starts_at),
                activatedAt=_iso_or_none(redemption.activated_at),
                expiresAt=_iso_or_none(redemption.expires_at),
                productId=str(redemption.product.id) if redemption.product else None,
                productName=redemption.product.name if redemption.product else None,
                productSlug=redemption.product.slug if redemption.product else None,
                placementStatus=latest_schedule.status.value
                if latest_schedule and latest_schedule.status
                else None,
            )
        )

    product_options_payload = [
        MemberRewardProductOptionPayload(
            id=str(product.id),
            name=product.name,
            slug=product.slug,
            status=product.status.value
            if product.status
            else ProductStatus.DRAFT.value,
        )
        for product in product_options
    ]

    return MemberRewardsSnapshotPayload(
        balance=balance_payload,
        transactions=transactions_payload,
        catalog=catalog_payload,
        activeEntitlements=active_entitlements_payload,
        recentRedemptions=recent_redemptions_payload,
        productOptions=product_options_payload,
    )


@router.post("/rewards/redeem", response_model=MemberRewardsRedeemPayload)
async def redeem_member_reward(
    payload: MemberRewardsRedeemInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberRewardsRedeemPayload:
    _ensure_active_user(current_user)

    feature_key = _normalize_optional(payload.featureKey)
    if not feature_key:
        raise HTTPException(status_code=400, detail="Missing reward selection.")

    catalog_stmt = (
        select(RewardCatalogItem)
        .where(
            RewardCatalogItem.feature_key == feature_key,
            RewardCatalogItem.is_active.is_(True),
        )
        .limit(1)
    )
    catalog_item = (await session.exec(catalog_stmt)).first()
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Reward is unavailable.")

    if catalog_item.requires_product and not payload.productId:
        raise HTTPException(
            status_code=400,
            detail=f"Reward '{feature_key}' requires a product context.",
        )

    owned_product: Product | None = None
    if payload.productId:
        owned_product = await _get_owned_product_by_id(
            session,
            product_id=payload.productId,
            user_id=current_user.id,
            include_plan_assignments=False,
        )

    active_count_stmt = (
        select(func.count(FeatureEntitlement.id))
        .where(
            FeatureEntitlement.user_id == current_user.id,
            FeatureEntitlement.feature_key == feature_key,
            FeatureEntitlement.status.in_(ACTIVE_REWARD_ENTITLEMENT_STATUSES),
        )
        .limit(1)
    )
    active_count = int((await session.exec(active_count_stmt)).one_or_none() or 0)
    if (
        catalog_item.max_active_per_user is not None
        and active_count >= catalog_item.max_active_per_user
    ):
        raise HTTPException(status_code=400, detail="Active limit reached.")

    pending_count_stmt = (
        select(func.count(Redemption.id))
        .where(
            Redemption.user_id == current_user.id,
            Redemption.feature_key == feature_key,
            Redemption.status == RedemptionStatus.PENDING,
        )
        .limit(1)
    )
    pending_count = int((await session.exec(pending_count_stmt)).one_or_none() or 0)
    if (
        catalog_item.max_pending_per_user is not None
        and pending_count >= catalog_item.max_pending_per_user
    ):
        raise HTTPException(status_code=400, detail="Pending limit reached.")

    balance_stmt = select(RewardBalance).where(RewardBalance.user_id == current_user.id).limit(1)
    balance = (await session.exec(balance_stmt)).first()
    if not balance:
        balance = RewardBalance(user_id=current_user.id)
        session.add(balance)
        await session.flush()

    if balance.balance < catalog_item.base_cost:
        raise HTTPException(status_code=400, detail="Insufficient rewards.")

    now = _utc_now()
    requires_schedule = catalog_item.category == RewardFeatureCategory.PLACEMENT
    auto_activate = not requires_schedule
    starts_at = now
    duration_seconds = catalog_item.duration_seconds if catalog_item.duration_seconds and catalog_item.duration_seconds > 0 else None
    expires_at = (
        starts_at + timedelta(seconds=duration_seconds)
        if duration_seconds
        else None
    )

    redemption = Redemption(
        user_id=current_user.id,
        feature_key=feature_key,
        product_id=owned_product.id if owned_product else None,
        status=RedemptionStatus.ACTIVE if auto_activate else RedemptionStatus.PENDING,
        cost=catalog_item.base_cost,
        original_cost=catalog_item.base_cost,
        refunded_rewards=0,
        starts_at=starts_at,
        activated_at=starts_at if auto_activate else None,
        expires_at=expires_at,
        metadata_={"notes": payload.notes} if payload.notes else None,
    )
    session.add(redemption)
    await session.flush()

    entitlement = FeatureEntitlement(
        user_id=current_user.id,
        feature_key=feature_key,
        redemption_id=redemption.id,
        product_id=owned_product.id if owned_product else None,
        subject_type=FeatureSubjectType.PRODUCT if owned_product else FeatureSubjectType.USER,
        subject_id=str(owned_product.id) if owned_product else str(current_user.id),
        status=(
            FeatureEntitlementStatus.ACTIVE
            if auto_activate
            else FeatureEntitlementStatus.PENDING
        ),
        starts_at=starts_at,
        activated_at=starts_at if auto_activate else None,
        expires_at=expires_at,
        metadata_={"notes": payload.notes} if payload.notes else None,
    )
    session.add(entitlement)
    await session.flush()

    slot_key: str | None = None
    if requires_schedule:
        if not owned_product:
            raise HTTPException(
                status_code=400,
                detail="Placement rewards must target a product.",
            )
        slot_key = _normalize_optional(payload.slotKey) or f"{feature_key}:default"
        schedule_ends_at = expires_at or (starts_at + timedelta(days=1))
        schedule = PlacementSchedule(
            entitlement_id=entitlement.id,
            redemption_id=redemption.id,
            feature_key=feature_key,
            product_id=owned_product.id,
            slot_key=slot_key,
            status=PlacementStatus.PENDING,
            starts_at=starts_at,
            ends_at=schedule_ends_at,
            metadata_={"notes": payload.notes} if payload.notes else None,
        )
        session.add(schedule)

    balance.balance -= catalog_item.base_cost
    balance.lifetime_spent += catalog_item.base_cost
    balance.last_redeemed_at = now
    session.add(balance)

    transaction_metadata: dict[str, Any] | None = None
    if slot_key:
        transaction_metadata = {"slotKey": slot_key}
    if payload.notes:
        transaction_metadata = transaction_metadata or {}
        transaction_metadata["notes"] = payload.notes

    transaction = RewardTransaction(
        user_id=current_user.id,
        type=RewardTransactionType.SPEND,
        reward_amount=catalog_item.base_cost,
        balance_after=balance.balance,
        rule_id=None,
        rule_key=None,
        reward_key=feature_key,
        redemption_id=redemption.id,
        product_id=owned_product.id if owned_product else None,
        notes=_normalize_optional(payload.notes),
        metadata_=transaction_metadata,
    )
    session.add(transaction)

    await session.commit()
    await session.refresh(balance)
    await session.refresh(redemption)

    return MemberRewardsRedeemPayload(
        success=True,
        redemptionId=str(redemption.id),
        balanceAfter=balance.balance,
        message=f"Redeemed {catalog_item.name}",
    )


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


@router.get("/claims/products", response_model=MemberClaimableProductsPayload)
async def list_claimable_products(
    current_user: CurrentUser,
    q: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> MemberClaimableProductsPayload:
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
    payload: list[MemberClaimableProductPayload] = []
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
            MemberClaimableProductPayload(
                id=str(product.id),
                name=product.name,
                slug=product.slug,
                websiteUrl=product.website_url,
                domain=domain,
                expectedTxt=expected_txt,
            )
        )
    return MemberClaimableProductsPayload(products=payload)


@router.get(
    "/claims/{product_id}/target",
    response_model=MemberClaimableProductPayload,
)
async def get_claim_target(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberClaimableProductPayload:
    _ensure_active_user(current_user)
    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    return MemberClaimableProductPayload.model_validate(
        _resolve_claim_target_payload(product)
    )


@router.post(
    "/claims/{product_id}/dns/confirm",
    response_model=MemberClaimDnsConfirmPayload,
)
async def confirm_claim_dns(
    product_id: str,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberClaimDnsConfirmPayload:
    _ensure_active_user(current_user)
    product = await _get_claim_product(session, product_id=product_id)
    if product.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You already own this product.")
    target = _resolve_claim_target_payload(product)

    dns_ok, dns_error = await _verify_claim_dns_txt_record(
        target["websiteUrl"],
        target["expectedTxt"],
    )
    if not dns_ok:
        raise HTTPException(
            status_code=400,
            detail=dns_error or "Verification TXT record not found in DNS.",
        )

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

    return MemberClaimDnsConfirmPayload(
        success=True,
        lockExpiresAt=_iso_or_none(lock_expires_at),
    )


@router.post(
    "/claims/{product_id}/otp/request",
    response_model=MemberClaimOtpRequestPayload,
)
async def request_claim_otp(
    product_id: str,
    payload: MemberClaimOtpRequestInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberClaimOtpRequestPayload:
    _ensure_active_user(current_user)
    email = _normalize_optional(payload.email)
    otp_hash = _normalize_optional(payload.otpHash)
    code = _normalize_optional(payload.code)
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email.")

    if code and not CLAIM_OTP_PATTERN.match(code):
        raise HTTPException(
            status_code=400,
            detail="Enter the 6-digit code from your email.",
        )

    if code:
        otp_hash = _hash_claim_otp_code(code)
    elif not otp_hash:
        code = _generate_claim_otp_code()
        otp_hash = _hash_claim_otp_code(code)

    expires_at = _parse_iso_datetime(
        payload.otpExpiresAt
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

    if code:
        await _send_claim_otp_notification(
            subscriber_id=current_user.clerk_id or str(current_user.id),
            email=email.lower(),
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            code=code,
            domain=target["domain"],
            product_name=target["name"],
            expires_at=expires_at,
        )

    return MemberClaimOtpRequestPayload(
        success=True,
        expiresAt=_iso_or_none(expires_at),
        domain=target["domain"],
        productName=target["name"],
    )


@router.post(
    "/claims/{product_id}/otp/verify",
    response_model=MemberClaimOtpVerifyPayload,
)
async def verify_claim_otp(
    product_id: str,
    payload: MemberClaimOtpVerifyInput,
    current_user: CurrentUser,
    session: Session = Depends(get_session),
) -> MemberClaimOtpVerifyPayload:
    _ensure_active_user(current_user)
    otp_hash = _normalize_optional(payload.otpHash)
    code = _normalize_optional(payload.code)
    if code:
        if not CLAIM_OTP_PATTERN.match(code):
            raise HTTPException(
                status_code=400,
                detail="Enter the 6-digit code from your email.",
            )
        otp_hash = _hash_claim_otp_code(code)
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

    return MemberClaimOtpVerifyPayload(
        success=True,
        slug=product.slug,
        previousOwnerId=str(previous_owner_id) if previous_owner_id else None,
    )
