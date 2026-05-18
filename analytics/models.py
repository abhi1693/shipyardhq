from django.conf import settings
from django.db import models
from django.db.models import F, Q

from core.models import ChangeLoggedModel


class LeaderboardRun(ChangeLoggedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    class Cadence(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    period_label = models.CharField(max_length=80)
    cadence = models.CharField(max_length=20, choices=Cadence.choices, default=Cadence.MONTHLY)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    period_start = models.DateField()
    period_end = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-period_end",)
        constraints = [
            models.CheckConstraint(
                condition=Q(period_end__gte=F("period_start")),
                name="leaderboard_run_period_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return self.period_label


class ProductLeaderboardScore(ChangeLoggedModel):
    leaderboard_run = models.ForeignKey(
        LeaderboardRun,
        on_delete=models.CASCADE,
        related_name="scores",
    )
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="leaderboard_scores"
    )
    rank = models.PositiveIntegerField(default=0)
    score = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    visitors = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("rank", "product__name")
        constraints = [
            models.UniqueConstraint(
                fields=("leaderboard_run", "product"),
                name="unique_score_per_run_product",
            ),
            models.UniqueConstraint(
                fields=("leaderboard_run", "rank"),
                name="unique_score_rank_per_run",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.leaderboard_run} · {self.product}"


class MonthlyLeaderboardNotification(ChangeLoggedModel):
    leaderboard_run = models.ForeignKey(
        LeaderboardRun,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="leaderboard_notifications"
    )
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("leaderboard_run", "user"),
                name="unique_leaderboard_notification_per_user",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} · {self.leaderboard_run}"


class AnalyticsIngestionRun(ChangeLoggedModel):
    class Source(models.TextChoices):
        POSTHOG = "posthog", "PostHog"
        PLAUSIBLE = "plausible", "Plausible"
        MANUAL = "manual", "Manual"

    class Job(models.TextChoices):
        PRODUCT_SYNC = "product-sync", "Product sync"
        SITE_SYNC = "site-sync", "Site sync"
        LEADERBOARD = "leaderboard", "Leaderboard"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETE = "complete", "Complete"
        FAILED = "failed", "Failed"

    product = models.ForeignKey(
        "catalog.Product",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="analytics_ingestions",
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    job = models.CharField(max_length=30, choices=Job.choices, default=Job.PRODUCT_SYNC)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    summary = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.CheckConstraint(
                condition=Q(finished_at__isnull=True) | Q(finished_at__gte=F("started_at")),
                name="analytics_ingestion_run_date_range_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_job_display()} · {self.get_source_display()}"


class ProductTrafficDaily(ChangeLoggedModel):
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, related_name="traffic_daily"
    )
    day = models.DateField()
    visitors = models.PositiveIntegerField(default=0)
    signups = models.PositiveIntegerField(default=0)
    pageviews = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-day",)
        constraints = [
            models.UniqueConstraint(fields=("product", "day"), name="unique_product_daily_traffic"),
        ]

    def __str__(self) -> str:
        return f"{self.product} · {self.day}"


class SiteTrafficDaily(ChangeLoggedModel):
    day = models.DateField(unique=True)
    visitors = models.PositiveIntegerField(default=0)
    signups = models.PositiveIntegerField(default=0)
    pageviews = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-day",)

    def __str__(self) -> str:
        return str(self.day)
