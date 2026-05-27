from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import ChangeLoggedModel

DEFAULT_CURRENCY_CODE = "USD"


class Plan(ChangeLoggedModel):
    class Type(models.TextChoices):
        ONE_TIME = "one_time_price", "One-time"
        RECURRING = "recurring_price", "Recurring"

    class TimeInterval(models.TextChoices):
        DAY = "day", "Day"
        WEEK = "week", "Week"
        MONTH = "month", "Month"
        YEAR = "year", "Year"

    external_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=32, choices=Type.choices, default=Type.ONE_TIME)
    price_cents = models.PositiveIntegerField(default=0)
    discount_percent = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    boost_for_days = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(30)],
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    payment_frequency_count = models.PositiveSmallIntegerField(null=True, blank=True)
    payment_frequency_interval = models.CharField(
        max_length=16,
        choices=TimeInterval.choices,
        blank=True,
    )
    subscription_period_count = models.PositiveSmallIntegerField(null=True, blank=True)
    subscription_period_interval = models.CharField(
        max_length=16,
        choices=TimeInterval.choices,
        blank=True,
    )

    class Meta:
        ordering = ("price_cents", "name")
        indexes = [
            models.Index(fields=("type", "price_cents")),
            models.Index(fields=("is_active", "price_cents")),
            models.Index(fields=("external_id",)),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=("is_default",),
                condition=models.Q(is_default=True),
                name="%(app_label)s_%(class)s_single_default_plan",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def price_amount(self):
        return Decimal(self.price_cents) / Decimal("100")

    @property
    def price_display(self):
        return f"{DEFAULT_CURRENCY_CODE} {self.price_amount:.2f}"

    @property
    def is_recurring(self):
        return self.type == self.Type.RECURRING

    @property
    def billing_display(self):
        if not self.is_recurring:
            return "One-time"
        count = self.payment_frequency_count or 1
        interval = self.payment_frequency_interval or self.TimeInterval.MONTH
        suffix = "s" if count > 1 else ""
        return f"Every {count} {interval}{suffix}"
