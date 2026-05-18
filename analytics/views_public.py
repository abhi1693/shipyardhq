from django.db.models import Max, Sum

from analytics.models import (
    LeaderboardRun,
    ProductLeaderboardScore,
    ProductTrafficDaily,
    SiteTrafficDaily,
)
from billing.models import PaymentRevenueSnapshot
from core.generic_views import DashboardView, ModelObjectListView
from rewards.models import PlacementSchedule, Redemption, RewardTransaction


class PublicAnalyticsOverviewView(DashboardView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    page_title = "Analytics"
    page_description = "Public metrics, product traction, and leaderboard data."

    def get_metrics(self):
        site_totals = SiteTrafficDaily.objects.aggregate(
            visitors=Sum("visitors"),
            signups=Sum("signups"),
            pageviews=Sum("pageviews"),
        )
        return [
            {
                "label": "Visitors",
                "value": site_totals["visitors"] or 0,
                "help_text": "Total site visitors recorded.",
            },
            {
                "label": "Signups",
                "value": site_totals["signups"] or 0,
                "help_text": "Total signups recorded.",
            },
            {
                "label": "Pageviews",
                "value": site_totals["pageviews"] or 0,
                "help_text": "Total public pageviews.",
            },
        ]


class VerifiedRevenueView(ModelObjectListView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    model = PaymentRevenueSnapshot
    fields = ("product", "captured_on", "recurring_revenue", "active_customers", "currency")
    page_title = "Verified revenue"


class LeaderboardView(ModelObjectListView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    model = ProductLeaderboardScore
    fields = ("rank", "product", "score", "revenue", "visitors")
    page_title = "Leaderboard"

    def get_queryset(self):
        latest = ProductLeaderboardScore.objects.aggregate(
            latest=Max("leaderboard_run__period_end")
        )["latest"]
        queryset = ProductLeaderboardScore.objects.select_related("product", "leaderboard_run")
        if latest:
            queryset = queryset.filter(leaderboard_run__period_end=latest)
        return queryset.order_by("rank")

    def get_detail_url(self, obj):
        return obj.product.get_absolute_url()


class LeaderboardAboutView(DashboardView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    page_title = "About the leaderboard"
    page_description = (
        "Leaderboard runs rank products from imported score, "
        "revenue, and visitor data."
    )
    cards = [
        {
            "label": "Runs",
            "title": "Rankings are stored per time window",
            "body": (
                "Each leaderboard run records a start date, end date, "
                "cadence, and the scored products for that period."
            ),
        },
        {
            "label": "Inputs",
            "title": "Traffic and revenue stay visible",
            "body": (
                "Every ranked score keeps the associated revenue and "
                "visitor figures so operator review stays traceable."
            ),
        },
        {
            "label": "Archive",
            "title": "Weekly and monthly views use the same source",
            "body": (
                "Archive pages and current rankings are read from the "
                "same leaderboard score records."
            ),
        },
    ]

    def get_metrics(self):
        return [
            {
                "label": "Runs",
                "value": LeaderboardRun.objects.count(),
                "help_text": "Stored leaderboard windows.",
            },
            {
                "label": "Scored products",
                "value": ProductLeaderboardScore.objects.count(),
                "help_text": "Rank entries across all runs.",
            },
        ]


class LeaderboardMonthlyView(LeaderboardView):
    page_title = "Monthly leaderboard"


class LeaderboardMonthlyArchiveView(LeaderboardView):
    page_title = "Monthly leaderboard archive"


class LeaderboardWeeklyArchiveView(LeaderboardView):
    page_title = "Weekly leaderboard archive"


class LeaderboardRewardsView(DashboardView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    page_title = "Leaderboard rewards"
    page_description = (
        "Reward redemptions, placement schedules, and transaction "
        "history tied to leaderboard incentives."
    )

    def get_metrics(self):
        return [
            {
                "label": "Reward transactions",
                "value": RewardTransaction.objects.count(),
                "help_text": "Credits, debits, refunds, and adjustments.",
            },
            {
                "label": "Redemptions",
                "value": Redemption.objects.count(),
                "help_text": "Catalog claims created by members.",
            },
            {
                "label": "Placements",
                "value": PlacementSchedule.objects.count(),
                "help_text": "Scheduled product placements.",
            },
        ]


class CategoryTrendView(ModelObjectListView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    model = ProductTrafficDaily
    fields = ("product", "day", "visitors", "signups", "pageviews")
    page_title = "Category trends"

    def get_queryset(self):
        return ProductTrafficDaily.objects.filter(
            product__categories__slug=self.kwargs["slug"]
        ).select_related("product")
