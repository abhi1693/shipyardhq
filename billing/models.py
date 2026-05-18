from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q

from core.models import ChangeLoggedModel


class PaymentConnector(ChangeLoggedModel):
    class Provider(models.TextChoices):
        STRIPE = "stripe", "Stripe"
        PADDLE = "paddle", "Paddle"
        DODO = "dodo", "Dodo"
        MANUAL = "manual", "Manual"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        ERROR = "error", "Error"
        DISCONNECTED = "disconnected", "Disconnected"

    product = models.OneToOneField(
        "catalog.Product", on_delete=models.CASCADE, related_name="payment_connector"
    )
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.MANUAL)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    display_name = models.CharField(max_length=120, blank=True)
    provider_account_id = models.CharField(max_length=160, blank=True)
    external_reference = models.CharField(max_length=160, blank=True)
    dashboard_url = models.URLField(blank=True)
    currency = models.CharField(max_length=10, default="USD")
    connected_at = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_sync_error = models.TextField(blank=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("product__name",)

    def __str__(self) -> str:
        return f"{self.product} · {self.get_provider_display()}"


class PaymentConnectorCredential(ChangeLoggedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ROTATING = "rotating", "Rotating"
        REVOKED = "revoked", "Revoked"

    connector = models.ForeignKey(
        PaymentConnector,
        on_delete=models.CASCADE,
        related_name="credentials",
    )
    label = models.CharField(max_length=120)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    config = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("label",)

    def __str__(self) -> str:
        return f"{self.connector} · {self.label}"


class PaymentRevenueSnapshot(ChangeLoggedModel):
    connector = models.ForeignKey(
        PaymentConnector,
        on_delete=models.CASCADE,
        related_name="revenue_snapshots",
    )
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="revenue_snapshots"
    )
    captured_on = models.DateField()
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    recurring_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    all_time_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active_customers = models.PositiveIntegerField(default=0)
    new_customers = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=10, default="USD")

    class Meta:
        ordering = ("-captured_on",)
        constraints = [
            models.UniqueConstraint(
                fields=("connector", "captured_on"),
                name="unique_revenue_snapshot_per_connector_day",
            ),
            models.CheckConstraint(
                condition=Q(period_start__isnull=True)
                | Q(period_end__isnull=True)
                | Q(period_end__gte=F("period_start")),
                name="payment_snapshot_period_range_valid",
            ),
        ]

    def clean(self):
        super().clean()
        if self.connector_id and self.product_id and self.connector.product_id != self.product_id:
            raise ValidationError({"product": "Snapshot product must match the connector product."})

    def __str__(self) -> str:
        return f"{self.product} · {self.captured_on}"


class UserPlanPurchase(ChangeLoggedModel):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        CANCELED = "canceled", "Canceled"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="plan_purchases"
    )
    plan = models.ForeignKey("catalog.Plan", on_delete=models.CASCADE, related_name="purchases")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    external_reference = models.CharField(max_length=160, blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    auto_renew = models.BooleanField(default=False)

    class Meta:
        ordering = ("-starts_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True) | Q(ends_at__gte=F("starts_at")),
                name="user_plan_purchase_date_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} · {self.plan}"
