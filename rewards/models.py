from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.urls import reverse
from django.utils.text import slugify

from core.models import ChangeLoggedModel, PrimaryModel


class RewardNamedModel(PrimaryModel):
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160, unique=True, blank=True)

    class Meta:
        abstract = True
        ordering = ("name",)

    def save(self, *args, **kwargs):
        if not self.slug and self.name:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class RewardBalance(ChangeLoggedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reward_balance"
    )
    balance = models.IntegerField(default=0)
    lifetime_earned = models.IntegerField(default=0)
    lifetime_spent = models.IntegerField(default=0)
    lifetime_adjusted = models.IntegerField(default=0)
    lifetime_refunded = models.IntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    last_earned_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.user} · {self.balance}"


class RewardRule(RewardNamedModel):
    class Category(models.TextChoices):
        CONTENT = "content", "Content"
        TRACTION = "traction", "Traction"
        COMMUNITY = "community", "Community"
        REFERRAL = "referral", "Referral"

    category = models.CharField(max_length=20, choices=Category.choices, default=Category.CONTENT)
    points = models.IntegerField(default=0)
    per_user_cap = models.PositiveIntegerField(null=True, blank=True)
    cooldown_hours = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    admin_notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)


class RewardCatalogItem(RewardNamedModel):
    class Category(models.TextChoices):
        FEATURE = "feature", "Feature"
        CREDIT = "credit", "Credit"
        PLACEMENT = "placement", "Placement"
        MERCH = "merch", "Merch"

    category = models.CharField(max_length=20, choices=Category.choices, default=Category.FEATURE)
    feature_key = models.CharField(max_length=100, blank=True)
    plan_feature_key = models.CharField(max_length=100, blank=True)
    points_cost = models.PositiveIntegerField(default=0)
    inventory = models.PositiveIntegerField(default=0)
    duration_days = models.PositiveIntegerField(null=True, blank=True)
    requires_product = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=True)

    def get_absolute_url(self):
        return reverse("public:rewards")


class RewardTransaction(ChangeLoggedModel):
    class TransactionType(models.TextChoices):
        CREDIT = "credit", "Credit"
        DEBIT = "debit", "Debit"
        REFUND = "refund", "Refund"
        ADJUSTMENT = "adjustment", "Adjustment"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reward_transactions"
    )
    rule = models.ForeignKey(
        RewardRule, on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    catalog_item = models.ForeignKey(
        RewardCatalogItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    redemption = models.ForeignKey(
        "Redemption",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reward_transactions",
    )
    acted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reward_actions",
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        default=TransactionType.CREDIT,
    )
    amount = models.IntegerField(default=0)
    balance_after = models.IntegerField(default=0)
    note = models.CharField(max_length=220, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.user} · {self.amount}"


class Redemption(ChangeLoggedModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELED = "canceled", "Canceled"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="redemptions"
    )
    catalog_item = models.ForeignKey(
        RewardCatalogItem, on_delete=models.PROTECT, related_name="redemptions"
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="redemptions",
    )
    feature_key = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    points_spent = models.PositiveIntegerField(default=0)
    original_points_cost = models.PositiveIntegerField(default=0)
    refunded_points = models.PositiveIntegerField(default=0)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.user} · {self.catalog_item}"


class FeatureEntitlement(ChangeLoggedModel):
    class SubjectType(models.TextChoices):
        USER = "user", "User"
        PRODUCT = "product", "Product"
        GLOBAL = "global", "Global"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"
        CANCELED = "canceled", "Canceled"

    subject_type = models.CharField(
        max_length=20, choices=SubjectType.choices, default=SubjectType.USER
    )
    subject_key = models.CharField(max_length=100, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="feature_entitlements",
    )
    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="feature_entitlements",
    )
    feature_key = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("feature_key",)
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gte=F("starts_at")),
                name="feature_entitlement_date_range_valid",
            ),
        ]

    def clean(self):
        super().clean()
        if self.subject_type == self.SubjectType.USER and not self.user_id:
            raise ValidationError({"user": "User entitlements require a user."})
        if self.subject_type == self.SubjectType.PRODUCT and not self.product_id:
            raise ValidationError({"product": "Product entitlements require a product."})
        if self.subject_type == self.SubjectType.GLOBAL and (self.user_id or self.product_id):
            raise ValidationError(
                "Global entitlements must not be attached to a user or product."
            )

    def __str__(self) -> str:
        return self.feature_key


class PlacementSchedule(ChangeLoggedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        LIVE = "live", "Live"
        COMPLETE = "complete", "Complete"
        CANCELED = "canceled", "Canceled"

    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="placements"
    )
    entitlement = models.ForeignKey(
        FeatureEntitlement,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placements",
    )
    redemption = models.ForeignKey(
        Redemption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placements",
    )
    catalog_item = models.ForeignKey(
        RewardCatalogItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="placements",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    slot = models.CharField(max_length=80)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    job_reference = models.CharField(max_length=160, blank=True)
    note = models.CharField(max_length=220, blank=True)

    class Meta:
        ordering = ("-starts_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gte=F("starts_at")),
                name="placement_schedule_date_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.product} · {self.slot}"
