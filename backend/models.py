from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional, Self
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlmodel import Field, Relationship, SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession as Session


class PaymentConnectorProvider(str, Enum):
    DODO = "dodo"
    ABACATEPAY = "abacatepay"
    POLAR = "polar"
    STRIPE = "stripe"
    LEMONSQUEEZY = "lemonsqueezy"
    PADDLE = "paddle"
    PAYSTACK = "paystack"
    REVENUECAT = "revenuecat"
    CREEM = "creem"


class PaymentConnectorStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"


class PaymentCredentialStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class LeaderboardRunStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    FINALIZED = "finalized"


class ProductType(str, Enum):
    SAAS = "saas"
    BROWSER_EXTENSION = "browser_extension"
    MOBILE_APP = "mobile_app"
    DESKTOP_APP = "desktop_app"
    API = "api"
    OPEN_SOURCE = "open_source"
    OTHER = "other"


class PricingModel(str, Enum):
    FREE = "free"
    FREEMIUM = "freemium"
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"
    CUSTOM = "custom"


class ProductStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class Platform(str, Enum):
    WEB = "web"
    IOS = "ios"
    ANDROID = "android"
    MAC = "mac"
    WINDOWS = "windows"
    LINUX = "linux"
    CHROME_EXTENSION = "chrome_extension"
    FIREFOX_EXTENSION = "firefox_extension"


class ProductClaimMethod(str, Enum):
    DNS = "dns"
    EMAIL_OTP = "email_otp"


class ProductClaimStatus(str, Enum):
    PENDING = "pending"
    FULFILLED = "fulfilled"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    FAILED = "failed"


class AnalyticsDataSource(str, Enum):
    GA4 = "ga4"


class AnalyticsIngestionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalyticsIngestionJob(str, Enum):
    PRODUCT_TRAFFIC_DAILY = "product_traffic_daily"
    PRODUCT_TRAFFIC_BREAKDOWNS = "product_traffic_breakdowns"
    SITE_TRAFFIC_DAILY = "site_traffic_daily"
    SITE_TRAFFIC_BREAKDOWNS = "site_traffic_breakdowns"


class UserRole(str, Enum):
    MEMBER = "member"
    ADMIN = "admin"


class UserStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"


class FeedbackStatus(str, Enum):
    RECEIVED = "received"
    IN_REVIEW = "in_review"
    CLOSED = "closed"


class RewardTransactionType(str, Enum):
    EARN = "earn"
    SPEND = "spend"
    ADJUSTMENT = "adjustment"
    REFUND = "refund"


class RedemptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"
    FAILED = "failed"
    REFUNDED = "refunded"


class PlacementStatus(str, Enum):
    PENDING = "pending"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELED = "canceled"
    FAILED = "failed"


class RewardRuleCategory(str, Enum):
    ENGAGEMENT = "engagement"
    STREAK = "streak"
    ADMIN = "admin"
    SYSTEM = "system"
    BONUS = "bonus"


class RewardFeatureCategory(str, Enum):
    PLACEMENT = "placement"
    ANALYTICS = "analytics"
    INSIGHTS = "insights"
    ACCESS = "access"
    EXPOSURE = "exposure"
    UTILITY = "utility"


class FeatureSubjectType(str, Enum):
    USER = "user"
    PRODUCT = "product"
    GLOBAL = "global"


class FeatureEntitlementStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CANCELED = "canceled"
    FAILED = "failed"


class PlanType(str, Enum):
    ONE_TIME_PRICE = "one_time_price"
    RECURRING_PRICE = "recurring_price"


class TimeInterval(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


class EventEnvelopeStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    RETRYING = "retrying"
    COMPLETED = "completed"
    DEAD_LETTER = "dead_letter"


class EventAttemptStatus(str, Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    TIMED_OUT = "timed_out"


PAYMENT_CONNECTOR_PROVIDER_ENUM = SAEnum(
    PaymentConnectorProvider,
    name="payment_connector_provider_enum",
)
PAYMENT_CONNECTOR_STATUS_ENUM = SAEnum(
    PaymentConnectorStatus,
    name="payment_connector_status_enum",
)
PAYMENT_CREDENTIAL_STATUS_ENUM = SAEnum(
    PaymentCredentialStatus,
    name="payment_credential_status_enum",
)
LEADERBOARD_RUN_STATUS_ENUM = SAEnum(
    LeaderboardRunStatus,
    name="leaderboard_run_status_enum",
)
PRODUCT_TYPE_ENUM = SAEnum(ProductType, name="product_type_enum")
PRICING_MODEL_ENUM = SAEnum(PricingModel, name="pricing_model_enum")
PRODUCT_STATUS_ENUM = SAEnum(ProductStatus, name="product_status_enum")
PLATFORM_ENUM = SAEnum(Platform, name="platform_enum")
PRODUCT_CLAIM_METHOD_ENUM = SAEnum(
    ProductClaimMethod,
    name="product_claim_method_enum",
)
PRODUCT_CLAIM_STATUS_ENUM = SAEnum(
    ProductClaimStatus,
    name="product_claim_status_enum",
)
ANALYTICS_DATA_SOURCE_ENUM = SAEnum(
    AnalyticsDataSource,
    name="analytics_data_source_enum",
)
ANALYTICS_INGESTION_STATUS_ENUM = SAEnum(
    AnalyticsIngestionStatus,
    name="analytics_ingestion_status_enum",
)
ANALYTICS_INGESTION_JOB_ENUM = SAEnum(
    AnalyticsIngestionJob,
    name="analytics_ingestion_job_enum",
)
USER_ROLE_ENUM = SAEnum(UserRole, name="user_role_enum")
USER_STATUS_ENUM = SAEnum(UserStatus, name="user_status_enum")
FEEDBACK_STATUS_ENUM = SAEnum(FeedbackStatus, name="feedback_status_enum")
REWARD_TRANSACTION_TYPE_ENUM = SAEnum(
    RewardTransactionType,
    name="reward_transaction_type_enum",
)
REDEMPTION_STATUS_ENUM = SAEnum(
    RedemptionStatus,
    name="redemption_status_enum",
)
PLACEMENT_STATUS_ENUM = SAEnum(
    PlacementStatus,
    name="placement_status_enum",
)
REWARD_RULE_CATEGORY_ENUM = SAEnum(
    RewardRuleCategory,
    name="reward_rule_category_enum",
)
REWARD_FEATURE_CATEGORY_ENUM = SAEnum(
    RewardFeatureCategory,
    name="reward_feature_category_enum",
)
FEATURE_SUBJECT_TYPE_ENUM = SAEnum(
    FeatureSubjectType,
    name="feature_subject_type_enum",
)
FEATURE_ENTITLEMENT_STATUS_ENUM = SAEnum(
    FeatureEntitlementStatus,
    name="feature_entitlement_status_enum",
)
PLAN_TYPE_ENUM = SAEnum(PlanType, name="plan_type_enum")
TIME_INTERVAL_ENUM = SAEnum(TimeInterval, name="time_interval_enum")
EVENT_ENVELOPE_STATUS_ENUM = SAEnum(
    EventEnvelopeStatus,
    name="event_envelope_status_enum",
)
EVENT_ATTEMPT_STATUS_ENUM = SAEnum(
    EventAttemptStatus,
    name="event_attempt_status_enum",
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)



class BaseModel(SQLModel):
    __abstract__ = True

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
            "nullable": False,
        },
    )

    def clean(self) -> None:
        return None

    def full_clean(self) -> None:
        self.clean()

    async def save(
        self,
        session: Session,
        *,
        commit: bool = True,
        refresh: bool = True,
    ) -> Self:
        self.full_clean()
        session.add(self)
        if commit:
            await session.commit()
            if refresh:
                await session.refresh(self)
        elif refresh:
            await session.flush()
            await session.refresh(self)
        return self

    async def delete(self, session: Session, *, commit: bool = True) -> None:
        await session.delete(self)
        if commit:
            await session.commit()

    async def update(
        self,
        session: Session,
        *,
        commit: bool = True,
        refresh: bool = True,
        **kwargs: Any,
    ) -> Self:
        for key, value in kwargs.items():
            setattr(self, key, value)
        return await self.save(session, commit=commit, refresh=refresh)

    def __str__(self) -> str:
        return str(self.id)


class CreatedAtModel(SQLModel):
    __abstract__ = True

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )

    def __str__(self) -> str:
        return str(self.id)


class TimestampedModel(SQLModel):
    __abstract__ = True

    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
            "nullable": False,
        },
    )


class ProductAlternativeProductLink(SQLModel, table=True):
    __tablename__ = "product_alternative_product"

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    alternative_product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("alternative_product.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )


class AlternativeProductCategoryLink(SQLModel, table=True):
    __tablename__ = "alternative_product_category"

    alternative_product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("alternative_product.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    category_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("category.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )


class User(BaseModel, table=True):
    __tablename__ = "user"
    __table_args__ = (
        Index("ix_user_status", "status"),
        Index("ix_user_role_intent", "role_intent"),
        Index("ix_user_heard_from", "heard_from"),
        Index("ix_user_onboarded_at", "onboarded_at"),
        Index("ix_user_created_at", "created_at"),
        Index("ix_user_updated_at", "updated_at"),
    )

    clerk_id: str = Field(sa_column=Column(String, unique=True, nullable=False))
    email: str | None = Field(default=None, sa_column=Column(String, unique=True))
    first_name: str | None = Field(default=None, sa_column=Column(String))
    last_name: str | None = Field(default=None, sa_column=Column(String))
    role: UserRole = Field(
        default=UserRole.MEMBER,
        sa_column=Column(USER_ROLE_ENUM, nullable=False),
    )
    role_intent: str | None = Field(default=None, sa_column=Column(String))
    heard_from: str | None = Field(default=None, sa_column=Column(String))
    status: UserStatus = Field(
        default=UserStatus.ACTIVE,
        sa_column=Column(USER_STATUS_ENUM, nullable=False),
    )
    onboarded_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    suspended_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    terminated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    products: list["Product"] = Relationship(back_populates="user")
    product_upvotes: list["ProductUpvote"] = Relationship(back_populates="user")
    feedback: list["MemberFeedback"] = Relationship(back_populates="user")
    purchases: list["UserPlanPurchase"] = Relationship(back_populates="user")
    reward_balance: Optional["RewardBalance"] = Relationship(back_populates="user")
    reward_transactions: list["RewardTransaction"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[RewardTransaction.user_id]"},
    )
    reward_transactions_acted: list["RewardTransaction"] = Relationship(
        back_populates="acted_by",
        sa_relationship_kwargs={"foreign_keys": "[RewardTransaction.acted_by_user_id]"},
    )
    redemptions: list["Redemption"] = Relationship(back_populates="user")
    feature_entitlements: list["FeatureEntitlement"] = Relationship(
        back_populates="user"
    )
    product_claim_attempts: list["ProductClaimAttempt"] = Relationship(
        back_populates="user"
    )

    def __str__(self) -> str:
        return self.email or self.clerk_id or str(self.id)


class Category(BaseModel, table=True):
    __tablename__ = "category"
    __table_args__ = (
        Index("ix_category_created_at", "created_at"),
        Index("ix_category_updated_at", "updated_at"),
    )

    name: str = Field(sa_column=Column(String, unique=True, nullable=False))
    slug: str = Field(sa_column=Column(String, unique=True, nullable=False))
    icon: str = Field(sa_column=Column(String, nullable=False))
    description: str = Field(sa_column=Column(String, nullable=False))

    products: list["Product"] = Relationship(back_populates="category")
    use_case_categories: list["UseCaseCategory"] = Relationship(
        back_populates="category"
    )
    alternative_products: list["AlternativeProduct"] = Relationship(
        back_populates="categories",
        link_model=AlternativeProductCategoryLink,
    )


class Plan(BaseModel, table=True):
    __tablename__ = "plan"
    __table_args__ = (
        Index("ix_plan_type", "type"),
        Index("ix_plan_created_at", "created_at"),
        Index("ix_plan_updated_at", "updated_at"),
    )

    external_id: str | None = Field(default=None, sa_column=Column(String, unique=True))
    name: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, unique=True, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(String))
    type: PlanType = Field(sa_column=Column(PLAN_TYPE_ENUM, nullable=False))
    price: int = Field(sa_column=Column(Integer, nullable=False))
    discount: float | None = Field(default=None, sa_column=Column(Float))
    boost_for_days: int = Field(default=1, sa_column=Column(Integer, nullable=False))
    is_default: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False)
    )
    payment_frequency_count: int | None = Field(default=None, sa_column=Column(Integer))
    payment_frequency_interval: TimeInterval | None = Field(
        default=None, sa_column=Column(TIME_INTERVAL_ENUM)
    )
    subscription_period_count: int | None = Field(default=None, sa_column=Column(Integer))
    subscription_period_interval: TimeInterval | None = Field(
        default=None, sa_column=Column(TIME_INTERVAL_ENUM)
    )

    products: list["Product"] = Relationship(back_populates="plan")
    assignments: list["PlanFeatureAssignment"] = Relationship(back_populates="plan")
    purchases: list["UserPlanPurchase"] = Relationship(back_populates="plan")


class PlanFeature(BaseModel, table=True):
    __tablename__ = "plan_feature"
    __table_args__ = (
        Index("ix_plan_feature_created_at", "created_at"),
        Index("ix_plan_feature_updated_at", "updated_at"),
    )

    name: str = Field(sa_column=Column(String, nullable=False))
    key: str = Field(sa_column=Column(String, unique=True, nullable=False))
    description: str = Field(sa_column=Column(String, nullable=False))

    assignments: list["PlanFeatureAssignment"] = Relationship(back_populates="feature")
    reward_catalog_items: list["RewardCatalogItem"] = Relationship(
        back_populates="plan_feature"
    )


class PlanFeatureAssignment(BaseModel, table=True):
    __tablename__ = "plan_feature_assignment"
    __table_args__ = (
        UniqueConstraint("plan_id", "feature_id", name="uq_plan_feature_assignment"),
        Index("ix_plan_feature_assignment_enabled", "enabled"),
        Index("ix_plan_feature_assignment_created_at", "created_at"),
        Index("ix_plan_feature_assignment_updated_at", "updated_at"),
    )

    plan_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("plan.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    feature_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("plan_feature.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    enabled: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))
    is_experimental: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False)
    )
    config: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    plan: "Plan" = Relationship(back_populates="assignments")
    feature: "PlanFeature" = Relationship(back_populates="assignments")


class UserPlanPurchase(BaseModel, table=True):
    __tablename__ = "user_plan_purchase"
    __table_args__ = (
        UniqueConstraint("user_id", "plan_id", name="uq_user_plan_purchase"),
        Index("ix_user_plan_purchase_created_at", "created_at"),
        Index("ix_user_plan_purchase_updated_at", "updated_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    plan_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("plan.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    external_id: str | None = Field(default=None, sa_column=Column(String, unique=True))

    user: "User" = Relationship(back_populates="purchases")
    plan: "Plan" = Relationship(back_populates="purchases")


class Product(BaseModel, table=True):
    __tablename__ = "product"
    __table_args__ = (
        Index("ix_product_category_id_created_at", "category_id", "created_at"),
        Index("ix_product_status_published_at", "status", "published_at"),
        Index("ix_product_created_at", "created_at"),
        Index("ix_product_updated_at", "updated_at"),
    )

    name: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, unique=True, nullable=False))
    tagline: str = Field(sa_column=Column(String, nullable=False))
    description: str = Field(sa_column=Column(String, nullable=False))
    website_url: str = Field(sa_column=Column(String, nullable=False))
    logo: str = Field(sa_column=Column(String, nullable=False))
    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    category_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("category.id", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    plan_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("plan.id", ondelete="SET NULL")),
    )
    subscription_id: str | None = Field(default=None, sa_column=Column(String, unique=True))
    plan_assigned_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    type: ProductType = Field(sa_column=Column(PRODUCT_TYPE_ENUM, nullable=False))
    pricing_model: PricingModel = Field(
        sa_column=Column(PRICING_MODEL_ENUM, nullable=False)
    )
    status: ProductStatus = Field(
        default=ProductStatus.PUBLISHED,
        sa_column=Column(PRODUCT_STATUS_ENUM, nullable=False),
    )
    published_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    starting_price_cents: int | None = Field(default=None, sa_column=Column(Integer))
    currency_code: str | None = Field(default=None, sa_column=Column(String))
    banner_image: str | None = Field(default=None, sa_column=Column(String))
    keywords: list[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String), nullable=False)
    )
    platforms: list[Platform] = Field(
        default_factory=list,
        sa_column=Column(ARRAY(PLATFORM_ENUM), nullable=False),
    )

    user: "User" = Relationship(back_populates="products")
    category: "Category" = Relationship(back_populates="products")
    plan: Optional["Plan"] = Relationship(back_populates="products")
    metadata_record: Optional["ProductMetadata"] = Relationship(back_populates="product")
    analytics: Optional["ProductAnalytics"] = Relationship(back_populates="product")
    traffic_daily: list["ProductTrafficDaily"] = Relationship(
        back_populates="product"
    )
    traffic_referrers: list["ProductTrafficReferrerDaily"] = Relationship(
        back_populates="product"
    )
    traffic_channels: list["ProductTrafficChannelDaily"] = Relationship(
        back_populates="product"
    )
    traffic_browsers: list["ProductTrafficBrowserDaily"] = Relationship(
        back_populates="product"
    )
    traffic_operating_systems: list[
        "ProductTrafficOperatingSystemDaily"
    ] = Relationship(back_populates="product")
    traffic_devices: list["ProductTrafficDeviceDaily"] = Relationship(
        back_populates="product"
    )
    traffic_countries: list["ProductTrafficCountryDaily"] = Relationship(
        back_populates="product"
    )
    traffic_cities: list["ProductTrafficCityDaily"] = Relationship(
        back_populates="product"
    )
    verification: Optional["ProductVerification"] = Relationship(back_populates="product")
    product_badges: list["ProductBadge"] = Relationship(back_populates="product")
    product_media: list["ProductMedia"] = Relationship(back_populates="product")
    product_upvotes: list["ProductUpvote"] = Relationship(back_populates="product")
    placement_schedules: list["PlacementSchedule"] = Relationship(
        back_populates="product"
    )
    leaderboard_scores: list["ProductLeaderboardScore"] = Relationship(
        back_populates="product"
    )
    reward_transactions: list["RewardTransaction"] = Relationship(
        back_populates="product"
    )
    redemptions: list["Redemption"] = Relationship(back_populates="product")
    feature_entitlements: list["FeatureEntitlement"] = Relationship(
        back_populates="product"
    )
    alternatives: list["AlternativeProduct"] = Relationship(
        back_populates="products",
        link_model=ProductAlternativeProductLink,
    )
    payment_connector: Optional["PaymentConnector"] = Relationship(
        back_populates="product"
    )
    claim_attempts: list["ProductClaimAttempt"] = Relationship(
        back_populates="product"
    )


class PaymentConnector(BaseModel, table=True):
    __tablename__ = "payment_connector"
    __table_args__ = (
        UniqueConstraint("product_id", name="uq_payment_connector_product_id"),
        Index(
            "ix_payment_connector_product_id_updated_at", "product_id", "updated_at"
        ),
        Index("ix_payment_connector_status_updated_at", "status", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    provider: PaymentConnectorProvider = Field(
        sa_column=Column(PAYMENT_CONNECTOR_PROVIDER_ENUM, nullable=False)
    )
    status: PaymentConnectorStatus = Field(
        default=PaymentConnectorStatus.ACTIVE,
        sa_column=Column(PAYMENT_CONNECTOR_STATUS_ENUM, nullable=False),
    )
    config: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    last_synced_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    last_sync_error: str | None = Field(default=None, sa_column=Column(String))
    verified_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    latest_all_time_revenue_cents: int | None = Field(
        default=None, sa_column=Column(Integer)
    )
    latest_currency_code: str | None = Field(default=None, sa_column=Column(String))
    latest_period_start: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    product: "Product" = Relationship(back_populates="payment_connector")
    credentials: list["PaymentConnectorCredential"] = Relationship(
        back_populates="connector"
    )
    revenue_history: list["PaymentRevenueSnapshot"] = Relationship(
        back_populates="connector"
    )


class PaymentConnectorCredential(BaseModel, table=True):
    __tablename__ = "payment_connector_credential"
    __table_args__ = (
        Index("ix_payment_connector_credential_connector_id_status", "connector_id", "status"),
        Index("ix_payment_connector_credential_created_at", "created_at"),
    )

    connector_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("payment_connector.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    status: PaymentCredentialStatus = Field(
        default=PaymentCredentialStatus.ACTIVE,
        sa_column=Column(PAYMENT_CREDENTIAL_STATUS_ENUM, nullable=False),
    )
    encryption_version: int = Field(default=1, sa_column=Column(Integer, nullable=False))
    encrypted_key: str = Field(sa_column=Column(String, nullable=False))
    key_hint: str | None = Field(default=None, sa_column=Column(String))

    connector: "PaymentConnector" = Relationship(back_populates="credentials")


class PaymentRevenueSnapshot(BaseModel, table=True):
    __tablename__ = "payment_revenue_snapshot"
    __table_args__ = (
        UniqueConstraint(
            "connector_id",
            "period_start",
            "currency_code",
            name="uq_payment_revenue_snapshot",
        ),
        Index(
            "ix_payment_revenue_snapshot_connector_id_period_start",
            "connector_id",
            "period_start",
        ),
        Index("ix_payment_revenue_snapshot_created_at", "created_at"),
    )

    connector_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("payment_connector.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    currency_code: str = Field(sa_column=Column(String, nullable=False))
    period_start: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    period_revenue_cents: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    all_time_revenue_cents: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    data: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))

    connector: "PaymentConnector" = Relationship(back_populates="revenue_history")


class AlternativeProduct(BaseModel, table=True):
    __tablename__ = "alternative_product"
    __table_args__ = (
        Index("ix_alternative_product_created_at", "created_at"),
        Index("ix_alternative_product_updated_at", "updated_at"),
    )

    name: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, unique=True, nullable=False))
    description: str = Field(sa_column=Column(String, nullable=False))
    website_url: str = Field(sa_column=Column(String, unique=True, nullable=False))
    logo_url: str = Field(sa_column=Column(String, nullable=False))

    products: list["Product"] = Relationship(
        back_populates="alternatives",
        link_model=ProductAlternativeProductLink,
    )
    categories: list["Category"] = Relationship(
        back_populates="alternative_products",
        link_model=AlternativeProductCategoryLink,
    )


class LeaderboardRun(BaseModel, table=True):
    __tablename__ = "leaderboard_run"
    __table_args__ = (
        UniqueConstraint("period_start", "period_end", name="uq_leaderboard_run"),
        Index("ix_leaderboard_run_status", "status"),
        Index("ix_leaderboard_run_created_at", "created_at"),
        Index("ix_leaderboard_run_updated_at", "updated_at"),
    )

    period_start: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    period_end: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    status: LeaderboardRunStatus = Field(
        default=LeaderboardRunStatus.PENDING,
        sa_column=Column(LEADERBOARD_RUN_STATUS_ENUM, nullable=False),
    )

    scores: list["ProductLeaderboardScore"] = Relationship(back_populates="run")


class ProductLeaderboardScore(BaseModel, table=True):
    __tablename__ = "product_leaderboard_score"
    __table_args__ = (
        UniqueConstraint("run_id", "product_id", name="uq_product_leaderboard_score"),
        Index("ix_product_leaderboard_score_run_id_rank", "run_id", "rank"),
        Index("ix_product_leaderboard_score_run_id_score", "run_id", "score"),
        Index("ix_product_leaderboard_score_created_at", "created_at"),
        Index("ix_product_leaderboard_score_updated_at", "updated_at"),
    )

    run_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("leaderboard_run.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    unique_visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    upvotes: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    score: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    score_components: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    rank: int | None = Field(default=None, sa_column=Column(Integer))

    run: "LeaderboardRun" = Relationship(back_populates="scores")
    product: "Product" = Relationship(back_populates="leaderboard_scores")


class MonthlyLeaderboardNotification(BaseModel, table=True):
    __tablename__ = "monthly_leaderboard_notification"
    __table_args__ = (
        Index("ix_monthly_leaderboard_notification_created_at", "created_at"),
        Index("ix_monthly_leaderboard_notification_updated_at", "updated_at"),
    )

    month: datetime = Field(
        sa_column=Column(DateTime(timezone=True), unique=True, nullable=False)
    )


class ProductMedia(BaseModel, table=True):
    __tablename__ = "product_media"
    __table_args__ = (
        Index("ix_product_media_created_at", "created_at"),
        Index("ix_product_media_updated_at", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    image_url: str = Field(sa_column=Column(String, nullable=False))
    alt_text: str | None = Field(default=None, sa_column=Column(String))

    product: "Product" = Relationship(back_populates="product_media")


class ProductVerification(BaseModel, table=True):
    __tablename__ = "product_verification"
    __table_args__ = (
        Index("ix_product_verification_created_at", "created_at"),
        Index("ix_product_verification_updated_at", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        )
    )
    verification_txt: str = Field(sa_column=Column(String, nullable=False))
    is_verified: bool = Field(default=False, sa_column=Column(Boolean, nullable=False))
    verified_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    backlink_is_verified: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False)
    )
    backlink_verified_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    backlink_last_checked_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    backlink_found_url: str | None = Field(default=None, sa_column=Column(String))
    backlink_last_error: str | None = Field(default=None, sa_column=Column(String))

    product: "Product" = Relationship(back_populates="verification")


class ProductClaimAttempt(BaseModel, table=True):
    __tablename__ = "product_claim_attempt"
    __table_args__ = (
        Index("ix_product_claim_attempt_product_id_status", "product_id", "status"),
        Index("ix_product_claim_attempt_user_id_status", "user_id", "status"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    method: ProductClaimMethod = Field(
        sa_column=Column(PRODUCT_CLAIM_METHOD_ENUM, nullable=False)
    )
    status: ProductClaimStatus = Field(
        default=ProductClaimStatus.PENDING,
        sa_column=Column(PRODUCT_CLAIM_STATUS_ENUM, nullable=False),
    )
    email: str | None = Field(default=None, sa_column=Column(String))
    otp_hash: str | None = Field(default=None, sa_column=Column(String))
    otp_expires_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    product: "Product" = Relationship(back_populates="claim_attempts")
    user: "User" = Relationship(back_populates="product_claim_attempts")


class ProductMetadata(BaseModel, table=True):
    __tablename__ = "product_metadata"
    __table_args__ = (
        Index("ix_product_metadata_created_at", "created_at"),
        Index("ix_product_metadata_updated_at", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        )
    )
    github_url: str | None = Field(default=None, sa_column=Column(String))
    twitter_url: str | None = Field(default=None, sa_column=Column(String))
    demo_url: str | None = Field(default=None, sa_column=Column(String))
    contact_email: str | None = Field(default=None, sa_column=Column(String))
    utm_campaign: str | None = Field(default=None, sa_column=Column(String))

    product: "Product" = Relationship(back_populates="metadata_record")


class ProductAnalytics(BaseModel, table=True):
    __tablename__ = "product_analytics"
    __table_args__ = (
        Index("ix_product_analytics_upvotes", "upvotes"),
        Index("ix_product_analytics_created_at", "created_at"),
        Index("ix_product_analytics_updated_at", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        )
    )
    upvotes: int = Field(default=0, sa_column=Column(Integer, nullable=False))

    product: "Product" = Relationship(back_populates="analytics")


class AnalyticsIngestionRun(BaseModel, table=True):
    __tablename__ = "analytics_ingestion_run"
    __table_args__ = (
        UniqueConstraint(
            "source",
            "job",
            "window_start",
            "window_end",
            name="uq_analytics_ingestion_run",
        ),
        Index("ix_analytics_ingestion_run_status_created_at", "status", "created_at"),
        Index("ix_analytics_ingestion_run_job_source_window_start", "job", "source", "window_start"),
        Index("ix_analytics_ingestion_run_window_start_end", "window_start", "window_end"),
    )

    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    job: AnalyticsIngestionJob = Field(
        sa_column=Column(ANALYTICS_INGESTION_JOB_ENUM, nullable=False)
    )
    status: AnalyticsIngestionStatus = Field(
        default=AnalyticsIngestionStatus.PENDING,
        sa_column=Column(ANALYTICS_INGESTION_STATUS_ENUM, nullable=False),
    )
    window_start: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    window_end: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    started_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    finished_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    stats: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    error: str | None = Field(default=None, sa_column=Column(String))

    product_traffic_daily: list["ProductTrafficDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_referrers: list["ProductTrafficReferrerDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_channels: list["ProductTrafficChannelDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_browsers: list["ProductTrafficBrowserDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_operating_systems: list[
        "ProductTrafficOperatingSystemDaily"
    ] = Relationship(back_populates="ingestion_run")
    product_traffic_devices: list["ProductTrafficDeviceDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_countries: list["ProductTrafficCountryDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    product_traffic_cities: list["ProductTrafficCityDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_daily: list["SiteTrafficDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_referrers: list["SiteTrafficReferrerDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_browsers: list["SiteTrafficBrowserDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_operating_systems: list[
        "SiteTrafficOperatingSystemDaily"
    ] = Relationship(back_populates="ingestion_run")
    site_traffic_devices: list["SiteTrafficDeviceDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_countries: list["SiteTrafficCountryDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_regions: list["SiteTrafficRegionDaily"] = Relationship(
        back_populates="ingestion_run"
    )
    site_traffic_cities: list["SiteTrafficCityDaily"] = Relationship(
        back_populates="ingestion_run"
    )


class ProductTrafficDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_daily"
    __table_args__ = (
        UniqueConstraint("product_id", "date", "source", name="uq_product_traffic_daily"),
        Index("ix_product_traffic_daily_product_id_date", "product_id", "date"),
        Index("ix_product_traffic_daily_date", "date"),
        Index("ix_product_traffic_daily_source_date", "source", "date"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    page_views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    unique_visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    sessions: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    bounce_rate: float = Field(default=0, sa_column=Column(Float, nullable=False))
    average_session_duration: float = Field(
        default=0, sa_column=Column(Float, nullable=False)
    )
    new_users: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    returning_visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    engagement_rate: float = Field(default=0, sa_column=Column(Float, nullable=False))
    pages_per_session: float = Field(default=0, sa_column=Column(Float, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_daily")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_daily"
    )


class ProductTrafficReferrerDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_referrer_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "referrer",
            name="uq_product_traffic_referrer_daily",
        ),
        Index(
            "ix_product_traffic_referrer_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index("ix_product_traffic_referrer_daily_referrer", "referrer"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    referrer: str = Field(sa_column=Column(String, nullable=False))
    page_views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_referrers")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_referrers"
    )


class ProductTrafficChannelDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_channel_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "channel",
            name="uq_product_traffic_channel_daily",
        ),
        Index(
            "ix_product_traffic_channel_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index("ix_product_traffic_channel_daily_channel", "channel"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    channel: str = Field(sa_column=Column(String, nullable=False))
    page_views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_channels")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_channels"
    )


class ProductTrafficBrowserDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_browser_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "browser",
            name="uq_product_traffic_browser_daily",
        ),
        Index(
            "ix_product_traffic_browser_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index("ix_product_traffic_browser_daily_browser", "browser"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    browser: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_browsers")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_browsers"
    )


class ProductTrafficOperatingSystemDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_operating_system_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "operating_system",
            name="uq_product_traffic_operating_system_daily",
        ),
        Index(
            "ix_product_traffic_operating_system_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index(
            "ix_product_traffic_operating_system_daily_operating_system",
            "operating_system",
        ),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    operating_system: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_operating_systems")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_operating_systems"
    )


class ProductTrafficDeviceDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_device_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "device_category",
            name="uq_product_traffic_device_daily",
        ),
        Index(
            "ix_product_traffic_device_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index(
            "ix_product_traffic_device_daily_device_category",
            "device_category",
        ),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    device_category: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_devices")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_devices"
    )


class ProductTrafficCountryDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_country_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "country",
            "country_code",
            name="uq_product_traffic_country_daily",
        ),
        Index(
            "ix_product_traffic_country_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index("ix_product_traffic_country_daily_country", "country"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    country: str = Field(default="Unknown", sa_column=Column(String, nullable=False))
    country_code: str = Field(default="", sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_countries")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_countries"
    )


class ProductTrafficCityDaily(BaseModel, table=True):
    __tablename__ = "product_traffic_city_daily"
    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "date",
            "source",
            "city",
            "region",
            "country",
            "country_code",
            name="uq_product_traffic_city_daily",
        ),
        Index(
            "ix_product_traffic_city_daily_product_id_date",
            "product_id",
            "date",
        ),
        Index("ix_product_traffic_city_daily_city", "city"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    city: str = Field(default="Unknown", sa_column=Column(String, nullable=False))
    region: str = Field(default="Unknown", sa_column=Column(String, nullable=False))
    country: str = Field(default="Unknown", sa_column=Column(String, nullable=False))
    country_code: str = Field(default="", sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    product: "Product" = Relationship(back_populates="traffic_cities")
    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="product_traffic_cities"
    )


class SiteTrafficDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_daily"
    __table_args__ = (
        UniqueConstraint("date", "source", name="uq_site_traffic_daily"),
        Index("ix_site_traffic_daily_date", "date"),
        Index("ix_site_traffic_daily_source_date", "source", "date"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    page_views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    unique_visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    sessions: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    bounce_rate: float = Field(default=0, sa_column=Column(Float, nullable=False))
    average_session_duration: float = Field(
        default=0, sa_column=Column(Float, nullable=False)
    )
    new_users: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    returning_visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    engagement_rate: float = Field(default=0, sa_column=Column(Float, nullable=False))
    pages_per_session: float = Field(default=0, sa_column=Column(Float, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_daily"
    )


class SiteTrafficReferrerDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_referrer_daily"
    __table_args__ = (
        UniqueConstraint(
            "date", "source", "referrer", name="uq_site_traffic_referrer_daily"
        ),
        Index("ix_site_traffic_referrer_daily_date", "date"),
        Index("ix_site_traffic_referrer_daily_referrer", "referrer"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    referrer: str = Field(sa_column=Column(String, nullable=False))
    page_views: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_referrers"
    )


class SiteTrafficBrowserDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_browser_daily"
    __table_args__ = (
        UniqueConstraint(
            "date", "source", "browser", name="uq_site_traffic_browser_daily"
        ),
        Index("ix_site_traffic_browser_daily_date", "date"),
        Index("ix_site_traffic_browser_daily_browser", "browser"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    browser: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_browsers"
    )


class SiteTrafficOperatingSystemDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_operating_system_daily"
    __table_args__ = (
        UniqueConstraint(
            "date",
            "source",
            "operating_system",
            name="uq_site_traffic_operating_system_daily",
        ),
        Index("ix_site_traffic_operating_system_daily_date", "date"),
        Index(
            "ix_site_traffic_operating_system_daily_operating_system",
            "operating_system",
        ),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    operating_system: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_operating_systems"
    )


class SiteTrafficDeviceDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_device_daily"
    __table_args__ = (
        UniqueConstraint(
            "date",
            "source",
            "device_category",
            name="uq_site_traffic_device_daily",
        ),
        Index("ix_site_traffic_device_daily_date", "date"),
        Index("ix_site_traffic_device_daily_device_category", "device_category"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    device_category: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_devices"
    )


class SiteTrafficCountryDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_country_daily"
    __table_args__ = (
        UniqueConstraint(
            "date",
            "source",
            "country",
            "country_code",
            name="uq_site_traffic_country_daily",
        ),
        Index("ix_site_traffic_country_daily_date", "date"),
        Index("ix_site_traffic_country_daily_country", "country"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    country: str = Field(sa_column=Column(String, nullable=False))
    country_code: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_countries"
    )


class SiteTrafficRegionDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_region_daily"
    __table_args__ = (
        UniqueConstraint(
            "date",
            "source",
            "region",
            "country",
            "country_code",
            name="uq_site_traffic_region_daily",
        ),
        Index("ix_site_traffic_region_daily_date", "date"),
        Index("ix_site_traffic_region_daily_region", "region"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    region: str = Field(sa_column=Column(String, nullable=False))
    country: str = Field(sa_column=Column(String, nullable=False))
    country_code: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_regions"
    )


class SiteTrafficCityDaily(BaseModel, table=True):
    __tablename__ = "site_traffic_city_daily"
    __table_args__ = (
        UniqueConstraint(
            "date",
            "source",
            "city",
            "region",
            "country",
            "country_code",
            name="uq_site_traffic_city_daily",
        ),
        Index("ix_site_traffic_city_daily_date", "date"),
        Index("ix_site_traffic_city_daily_city", "city"),
    )

    date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    source: AnalyticsDataSource = Field(
        default=AnalyticsDataSource.GA4,
        sa_column=Column(ANALYTICS_DATA_SOURCE_ENUM, nullable=False),
    )
    city: str = Field(sa_column=Column(String, nullable=False))
    region: str = Field(sa_column=Column(String, nullable=False))
    country: str = Field(sa_column=Column(String, nullable=False))
    country_code: str = Field(sa_column=Column(String, nullable=False))
    visitors: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    ingestion_run_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("analytics_ingestion_run.id", ondelete="SET NULL"),
        ),
    )

    ingestion_run: Optional["AnalyticsIngestionRun"] = Relationship(
        back_populates="site_traffic_cities"
    )


class ProductUpvote(CreatedAtModel, table=True):
    __tablename__ = "product_upvote"
    __table_args__ = (
        UniqueConstraint("product_id", "user_id", name="uq_product_upvote"),
        Index("ix_product_upvote_user_id", "user_id"),
        Index("ix_product_upvote_created_at", "created_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )

    product: "Product" = Relationship(back_populates="product_upvotes")
    user: "User" = Relationship(back_populates="product_upvotes")


class MemberFeedback(BaseModel, table=True):
    __tablename__ = "member_feedback"
    __table_args__ = (
        Index("ix_member_feedback_user_id_created_at", "user_id", "created_at"),
        Index("ix_member_feedback_created_at", "created_at"),
        Index("ix_member_feedback_updated_at", "updated_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    subject: str | None = Field(default=None, sa_column=Column(String))
    message: str = Field(sa_column=Column(String, nullable=False))
    rating: int | None = Field(default=None, sa_column=Column(Integer))
    status: FeedbackStatus = Field(
        default=FeedbackStatus.RECEIVED,
        sa_column=Column(FEEDBACK_STATUS_ENUM, nullable=False),
    )
    admin_note: str | None = Field(default=None, sa_column=Column(String))
    reward_eligible: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False)
    )
    reward_granted_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    user: "User" = Relationship(back_populates="feedback")


class ProductBadge(BaseModel, table=True):
    __tablename__ = "product_badge"
    __table_args__ = (
        Index("ix_product_badge_badge", "badge"),
        Index("ix_product_badge_created_at", "created_at"),
        Index("ix_product_badge_updated_at", "updated_at"),
    )

    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    badge: str = Field(sa_column=Column(String, nullable=False))
    expires_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    product: "Product" = Relationship(back_populates="product_badges")


class UseCase(BaseModel, table=True):
    __tablename__ = "use_case"
    __table_args__ = (
        Index("ix_use_case_created_at", "created_at"),
        Index("ix_use_case_updated_at", "updated_at"),
    )

    label: str = Field(sa_column=Column(String, nullable=False))
    slug: str = Field(sa_column=Column(String, unique=True, nullable=False))

    categories: list["UseCaseCategory"] = Relationship(back_populates="use_case")


class UseCaseCategory(SQLModel, table=True):
    __tablename__ = "use_case_category"

    use_case_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("use_case.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    category_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("category.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )

    use_case: "UseCase" = Relationship(back_populates="categories")
    category: "Category" = Relationship(back_populates="use_case_categories")


class RewardBalance(TimestampedModel, table=True):
    __tablename__ = "reward_balance"
    __table_args__ = (
        Index("ix_reward_balance_balance", "balance"),
        Index("ix_reward_balance_updated_at", "updated_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            primary_key=True,
        )
    )
    balance: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    lifetime_earned: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    lifetime_spent: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    lifetime_adjusted: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    lifetime_refunded: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    current_streak_count: int = Field(
        default=0, sa_column=Column(Integer, nullable=False)
    )
    longest_streak_count: int = Field(
        default=0, sa_column=Column(Integer, nullable=False)
    )
    current_streak_tier: str | None = Field(default=None, sa_column=Column(String))
    streak_active_through: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    last_earned_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    last_redeemed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    last_adjustment_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    last_evaluated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    user: "User" = Relationship(back_populates="reward_balance")


class RewardRule(BaseModel, table=True):
    __tablename__ = "reward_rule"
    __table_args__ = (
        Index("ix_reward_rule_category", "category"),
        Index("ix_reward_rule_is_active", "is_active"),
        Index("ix_reward_rule_updated_at", "updated_at"),
    )

    key: str = Field(sa_column=Column(String, unique=True, nullable=False))
    name: str = Field(sa_column=Column(String, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(String))
    category: RewardRuleCategory = Field(
        sa_column=Column(REWARD_RULE_CATEGORY_ENUM, nullable=False)
    )
    base_reward_amount: int = Field(
        sa_column=Column(Integer, nullable=False)
    )
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False))
    daily_cap: int | None = Field(default=None, sa_column=Column(Integer))
    lifetime_cap: int | None = Field(default=None, sa_column=Column(Integer))
    global_cooldown_seconds: int | None = Field(
        default=None, sa_column=Column(Integer)
    )
    per_target_cooldown_seconds: int | None = Field(
        default=None, sa_column=Column(Integer)
    )
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))
    tier_config: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    admin_notes: str | None = Field(default=None, sa_column=Column(String))

    transactions: list["RewardTransaction"] = Relationship(back_populates="rule")


class RewardCatalogItem(BaseModel, table=True):
    __tablename__ = "reward_catalog_item"
    __table_args__ = (
        Index("ix_reward_catalog_item_category", "category"),
        Index("ix_reward_catalog_item_is_active", "is_active"),
        Index("ix_reward_catalog_item_updated_at", "updated_at"),
    )

    feature_key: str = Field(sa_column=Column(String, unique=True, nullable=False))
    plan_feature_key: str | None = Field(
        default=None,
        sa_column=Column(
            String,
            ForeignKey("plan_feature.key", ondelete="SET NULL"),
        ),
    )
    name: str = Field(sa_column=Column(String, nullable=False))
    description: str | None = Field(default=None, sa_column=Column(String))
    category: RewardFeatureCategory = Field(
        sa_column=Column(REWARD_FEATURE_CATEGORY_ENUM, nullable=False)
    )
    base_cost: int = Field(sa_column=Column(Integer, nullable=False))
    duration_seconds: int | None = Field(default=None, sa_column=Column(Integer))
    is_active: bool = Field(default=True, sa_column=Column(Boolean, nullable=False))
    max_active_per_user: int | None = Field(default=None, sa_column=Column(Integer))
    max_pending_per_user: int | None = Field(default=None, sa_column=Column(Integer))
    requires_product: bool = Field(
        default=False, sa_column=Column(Boolean, nullable=False)
    )
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))

    plan_feature: Optional["PlanFeature"] = Relationship(
        back_populates="reward_catalog_items"
    )
    redemptions: list["Redemption"] = Relationship(back_populates="catalog_item")
    entitlements: list["FeatureEntitlement"] = Relationship(
        back_populates="catalog_item"
    )
    transactions: list["RewardTransaction"] = Relationship(
        back_populates="catalog_item"
    )
    placement_schedules: list["PlacementSchedule"] = Relationship(
        back_populates="catalog_item"
    )


class RewardTransaction(BaseModel, table=True):
    __tablename__ = "reward_transaction"
    __table_args__ = (
        UniqueConstraint("event_hash", name="uq_reward_transaction_event_hash"),
        Index("ix_reward_transaction_user_id_created_at", "user_id", "created_at"),
        Index("ix_reward_transaction_type", "type"),
        Index("ix_reward_transaction_rule_key", "rule_key"),
        Index(
            "ix_reward_transaction_user_rule_type_created_at",
            "user_id",
            "rule_key",
            "type",
            "created_at",
        ),
        Index(
            "ix_reward_transaction_user_rule_target_type_created_at",
            "user_id",
            "rule_key",
            "target_id",
            "type",
            "created_at",
        ),
        Index("ix_reward_transaction_reward_key", "reward_key"),
        Index("ix_reward_transaction_product_id", "product_id"),
        Index("ix_reward_transaction_event_id", "event_id"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    type: RewardTransactionType = Field(
        sa_column=Column(REWARD_TRANSACTION_TYPE_ENUM, nullable=False)
    )
    reward_amount: int = Field(sa_column=Column(Integer, nullable=False))
    balance_after: int = Field(sa_column=Column(Integer, nullable=False))
    rule_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("reward_rule.id", ondelete="SET NULL"),
        ),
    )
    rule_key: str | None = Field(default=None, sa_column=Column(String))
    reward_key: str | None = Field(
        default=None,
        sa_column=Column(
            String,
            ForeignKey("reward_catalog_item.feature_key", ondelete="SET NULL"),
        ),
    )
    redemption_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("redemption.id", ondelete="SET NULL"),
        ),
    )
    product_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("product.id", ondelete="SET NULL")),
    )
    event_id: str | None = Field(default=None, sa_column=Column(String))
    event_hash: str | None = Field(default=None, sa_column=Column(String))
    source_type: str | None = Field(default=None, sa_column=Column(String))
    source_id: str | None = Field(default=None, sa_column=Column(String))
    target_type: str | None = Field(default=None, sa_column=Column(String))
    target_id: str | None = Field(default=None, sa_column=Column(String))
    notes: str | None = Field(default=None, sa_column=Column(String))
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))
    acted_by_user_id: int | None = Field(
        default=None,
        sa_column=Column(Integer, ForeignKey("user.id", ondelete="SET NULL")),
    )

    user: "User" = Relationship(
        back_populates="reward_transactions",
        sa_relationship_kwargs={"foreign_keys": "[RewardTransaction.user_id]"},
    )
    rule: Optional["RewardRule"] = Relationship(back_populates="transactions")
    catalog_item: Optional["RewardCatalogItem"] = Relationship(
        back_populates="transactions"
    )
    redemption: Optional["Redemption"] = Relationship(back_populates="transactions")
    acted_by: Optional["User"] = Relationship(
        back_populates="reward_transactions_acted",
        sa_relationship_kwargs={"foreign_keys": "[RewardTransaction.acted_by_user_id]"},
    )
    product: Optional["Product"] = Relationship(back_populates="reward_transactions")


class Redemption(BaseModel, table=True):
    __tablename__ = "redemption"
    __table_args__ = (
        Index("ix_redemption_user_id_status", "user_id", "status"),
        Index("ix_redemption_feature_key", "feature_key"),
        Index("ix_redemption_product_id", "product_id"),
        Index("ix_redemption_created_at", "created_at"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    feature_key: str = Field(
        sa_column=Column(
            String,
            ForeignKey("reward_catalog_item.feature_key", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    product_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="SET NULL"),
        ),
    )
    status: RedemptionStatus = Field(
        default=RedemptionStatus.PENDING,
        sa_column=Column(REDEMPTION_STATUS_ENUM, nullable=False),
    )
    cost: int = Field(sa_column=Column(Integer, nullable=False))
    original_cost: int = Field(sa_column=Column(Integer, nullable=False))
    refunded_rewards: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    starts_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    activated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    expires_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    completed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    canceled_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    failure_reason: str | None = Field(default=None, sa_column=Column(String))
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))

    user: "User" = Relationship(back_populates="redemptions")
    catalog_item: "RewardCatalogItem" = Relationship(back_populates="redemptions")
    product: Optional["Product"] = Relationship(back_populates="redemptions")
    transactions: list["RewardTransaction"] = Relationship(back_populates="redemption")
    entitlements: list["FeatureEntitlement"] = Relationship(
        back_populates="redemption"
    )
    placement_schedules: list["PlacementSchedule"] = Relationship(
        back_populates="redemption"
    )


class FeatureEntitlement(BaseModel, table=True):
    __tablename__ = "feature_entitlement"
    __table_args__ = (
        Index("ix_feature_entitlement_user_feature_status", "user_id", "feature_key", "status"),
        Index("ix_feature_entitlement_feature_status", "feature_key", "status"),
        Index("ix_feature_entitlement_product_status", "product_id", "status"),
        Index("ix_feature_entitlement_subject", "subject_type", "subject_id"),
    )

    user_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("user.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    feature_key: str = Field(
        sa_column=Column(
            String,
            ForeignKey("reward_catalog_item.feature_key", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    redemption_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("redemption.id", ondelete="SET NULL"),
        ),
    )
    product_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="SET NULL"),
        ),
    )
    subject_type: FeatureSubjectType = Field(
        default=FeatureSubjectType.USER,
        sa_column=Column(FEATURE_SUBJECT_TYPE_ENUM, nullable=False),
    )
    subject_id: str | None = Field(default=None, sa_column=Column(String))
    status: FeatureEntitlementStatus = Field(
        default=FeatureEntitlementStatus.PENDING,
        sa_column=Column(FEATURE_ENTITLEMENT_STATUS_ENUM, nullable=False),
    )
    starts_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    activated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    expires_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    deactivated_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))

    user: "User" = Relationship(back_populates="feature_entitlements")
    catalog_item: "RewardCatalogItem" = Relationship(back_populates="entitlements")
    redemption: Optional["Redemption"] = Relationship(back_populates="entitlements")
    product: Optional["Product"] = Relationship(back_populates="feature_entitlements")
    placement_schedules: list["PlacementSchedule"] = Relationship(
        back_populates="entitlement"
    )


class PlacementSchedule(BaseModel, table=True):
    __tablename__ = "placement_schedule"
    __table_args__ = (
        Index("ix_placement_schedule_slot_key_starts_at", "slot_key", "starts_at"),
        Index("ix_placement_schedule_status", "status"),
        Index("ix_placement_schedule_product_id_starts_at", "product_id", "starts_at"),
        Index("ix_placement_schedule_feature_key_status", "feature_key", "status"),
    )

    entitlement_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("feature_entitlement.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    redemption_id: int | None = Field(
        default=None,
        sa_column=Column(
            Integer,
            ForeignKey("redemption.id", ondelete="SET NULL"),
        ),
    )
    feature_key: str = Field(
        sa_column=Column(
            String,
            ForeignKey("reward_catalog_item.feature_key", ondelete="RESTRICT"),
            nullable=False,
        )
    )
    product_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("product.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    slot_key: str = Field(sa_column=Column(String, nullable=False))
    status: PlacementStatus = Field(
        default=PlacementStatus.PENDING,
        sa_column=Column(PLACEMENT_STATUS_ENUM, nullable=False),
    )
    starts_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    ends_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    activation_job_id: str | None = Field(default=None, sa_column=Column(String))
    deactivation_job_id: str | None = Field(default=None, sa_column=Column(String))
    inventory_token: str | None = Field(default=None, sa_column=Column(String))
    metadata_: dict[str, Any] | None = Field(default=None, sa_column=Column("metadata", JSON))

    entitlement: "FeatureEntitlement" = Relationship(back_populates="placement_schedules")
    redemption: Optional["Redemption"] = Relationship(back_populates="placement_schedules")
    catalog_item: "RewardCatalogItem" = Relationship(
        back_populates="placement_schedules"
    )
    product: "Product" = Relationship(back_populates="placement_schedules")


class EventEnvelope(BaseModel, table=True):
    __tablename__ = "event_envelope"
    __table_args__ = (
        Index("ix_event_envelope_status_next_run_at", "status", "next_run_at"),
        Index("ix_event_envelope_queue_status_next_run_at", "queue", "status", "next_run_at"),
        Index("ix_event_envelope_created_at", "created_at"),
        Index("ix_event_envelope_updated_at", "updated_at"),
    )

    event: str = Field(sa_column=Column(String, nullable=False))
    payload: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    async_handlers: list[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String), nullable=False)
    )
    pending_handlers: list[str] = Field(
        default_factory=list, sa_column=Column(ARRAY(String), nullable=False)
    )
    status: EventEnvelopeStatus = Field(
        default=EventEnvelopeStatus.PENDING,
        sa_column=Column(EVENT_ENVELOPE_STATUS_ENUM, nullable=False),
    )
    attempts: int = Field(default=0, sa_column=Column(Integer, nullable=False))
    last_error: str | None = Field(default=None, sa_column=Column(String))
    enqueued_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    processing_started: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    processed_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )
    queue: str = Field(default="default", sa_column=Column(String, nullable=False))
    next_run_at: datetime | None = Field(
        default=None, sa_column=Column(DateTime(timezone=True))
    )

    attempts_log: list["EventAttempt"] = Relationship(back_populates="envelope")


class EventAttempt(CreatedAtModel, table=True):
    __tablename__ = "event_attempt"
    __table_args__ = (
        Index("ix_event_attempt_envelope_id_created_at", "envelope_id", "created_at"),
    )

    envelope_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey("event_envelope.id", ondelete="CASCADE"),
            nullable=False,
        )
    )
    handler: str = Field(sa_column=Column(String, nullable=False))
    status: EventAttemptStatus = Field(
        sa_column=Column(EVENT_ATTEMPT_STATUS_ENUM, nullable=False)
    )
    duration_ms: int | None = Field(default=None, sa_column=Column(Integer))
    error: str | None = Field(default=None, sa_column=Column(String))
    attempt: int = Field(sa_column=Column(Integer, nullable=False))

    envelope: "EventEnvelope" = Relationship(back_populates="attempts_log")
