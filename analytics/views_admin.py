from django.db.models import Sum

from analytics.models import (
    AnalyticsIngestionRun,
    LeaderboardRun,
    ProductTrafficDaily,
    SiteTrafficDaily,
)
from billing.models import PaymentRevenueSnapshot
from catalog.models import Product, ProductClaimAttempt
from core.generic_views import DashboardView, ModelObjectListView
from core.mixins import AdminRequiredMixin
from rewards.models import RewardTransaction


class AdminAnalyticsMixin(AdminRequiredMixin):
    base_template = "base/private.html"
    section_eyebrow = "Admin · Analytics"


class AdminOverviewView(AdminAnalyticsMixin, DashboardView):
    page_title = "Overview"
    page_description = (
        "High-level operational metrics across products, traffic, rewards, and revenue."
    )

    def get_metrics(self):
        site_totals = SiteTrafficDaily.objects.aggregate(
            visitors=Sum("visitors"),
            signups=Sum("signups"),
            pageviews=Sum("pageviews"),
        )
        revenue_total = (
            PaymentRevenueSnapshot.objects.aggregate(total=Sum("recurring_revenue"))["total"] or 0
        )
        return [
            {
                "label": "Visitors",
                "value": site_totals["visitors"] or 0,
                "help_text": "Aggregated public site traffic.",
            },
            {
                "label": "Revenue",
                "value": revenue_total,
                "help_text": "Tracked recurring revenue snapshots.",
            },
            {
                "label": "Reward transactions",
                "value": RewardTransaction.objects.count(),
                "help_text": "Credits, debits, and adjustments.",
            },
        ]


class AdminAnalyticsIndexView(AdminOverviewView):
    page_title = "Analytics center"


class AdminAnalyticsEventsView(AdminAnalyticsMixin, ModelObjectListView):
    model = AnalyticsIngestionRun
    fields = ("job", "source", "status", "product", "created_at")
    page_title = "Analytics ingestion"

    def get_detail_url(self, obj):
        return None


class AdminAnalyticsGrowthView(AdminAnalyticsMixin, DashboardView):
    page_title = "Growth"
    page_description = "Traffic and signup growth based on imported product and site analytics."

    def get_metrics(self):
        totals = ProductTrafficDaily.objects.aggregate(
            visitors=Sum("visitors"),
            signups=Sum("signups"),
            pageviews=Sum("pageviews"),
        )
        return [
            {
                "label": "Product visitors",
                "value": totals["visitors"] or 0,
                "help_text": "Summed across product daily traffic records.",
            },
            {
                "label": "Product signups",
                "value": totals["signups"] or 0,
                "help_text": "Tracked signup volume from product analytics imports.",
            },
            {
                "label": "Product pageviews",
                "value": totals["pageviews"] or 0,
                "help_text": "Imported product pageview counts.",
            },
        ]


class AdminAnalyticsRevenueView(AdminAnalyticsMixin, ModelObjectListView):
    model = PaymentRevenueSnapshot
    fields = ("product", "captured_on", "recurring_revenue", "active_customers", "currency")
    page_title = "Revenue"

    def get_detail_url(self, obj):
        return obj.product.get_absolute_url()


class AdminAnalyticsRewardsView(AdminAnalyticsMixin, ModelObjectListView):
    model = RewardTransaction
    fields = ("user", "transaction_type", "amount", "note", "created_at")
    page_title = "Rewards analytics"

    def get_detail_url(self, obj):
        return None


class AdminAnalyticsTrafficView(AdminAnalyticsMixin, ModelObjectListView):
    model = ProductTrafficDaily
    fields = ("product", "day", "visitors", "signups", "pageviews")
    page_title = "Traffic"

    def get_detail_url(self, obj):
        return obj.product.get_absolute_url()


class AdminAnalyticsConversionsView(AdminAnalyticsMixin, DashboardView):
    page_title = "Conversions"
    page_description = (
        "Visitor-to-signup conversion ratios derived from the current "
        "analytics imports."
    )

    def get_metrics(self):
        totals = SiteTrafficDaily.objects.aggregate(
            visitors=Sum("visitors"),
            signups=Sum("signups"),
        )
        visitors = totals["visitors"] or 0
        signups = totals["signups"] or 0
        conversion_rate = f"{(signups / visitors):.2%}" if visitors else "0.00%"
        return [
            {"label": "Visitors", "value": visitors, "help_text": "Aggregated site visitors."},
            {"label": "Signups", "value": signups, "help_text": "Aggregated site signups."},
            {
                "label": "Conversion rate",
                "value": conversion_rate,
                "help_text": "Signups divided by visitors across imported site traffic.",
            },
        ]


class AdminAnalyticsLeaderboardView(AdminAnalyticsMixin, ModelObjectListView):
    model = LeaderboardRun
    fields = ("period_label", "period_start", "period_end", "status")
    page_title = "Leaderboard runs"

    def get_detail_url(self, obj):
        return None


class AdminAnalyticsProductUpdatesView(AdminAnalyticsMixin, DashboardView):
    page_title = "Product updates"
    page_description = "Publishing state, listing review load, and claim activity across products."

    def get_metrics(self):
        return [
            {
                "label": "Published products",
                "value": Product.objects.filter(status=Product.ProductStatus.PUBLISHED).count(),
                "help_text": "Listings currently visible on the public site.",
            },
            {
                "label": "Products in review",
                "value": Product.objects.filter(status=Product.ProductStatus.REVIEW).count(),
                "help_text": "Listings waiting for operator review.",
            },
            {
                "label": "Pending claims",
                "value": ProductClaimAttempt.objects.filter(
                    status=ProductClaimAttempt.Status.PENDING
                ).count(),
                "help_text": "Ownership claims still awaiting decision.",
            },
        ]
