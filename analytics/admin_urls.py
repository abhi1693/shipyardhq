from django.urls import path

from analytics.views_admin import (
    AdminAnalyticsConversionsView,
    AdminAnalyticsEventsView,
    AdminAnalyticsGrowthView,
    AdminAnalyticsIndexView,
    AdminAnalyticsLeaderboardView,
    AdminAnalyticsProductUpdatesView,
    AdminAnalyticsRevenueView,
    AdminAnalyticsRewardsView,
    AdminAnalyticsTrafficView,
    AdminOverviewView,
)

app_name = "admin"

urlpatterns = [
    path("", AdminOverviewView.as_view(), name="overview"),
    path("overview", AdminOverviewView.as_view(), name="overview-explicit"),
    path("analytics", AdminAnalyticsIndexView.as_view(), name="analytics-index"),
    path("analytics/events", AdminAnalyticsEventsView.as_view(), name="analytics-events"),
    path("analytics/growth", AdminAnalyticsGrowthView.as_view(), name="analytics-growth"),
    path("analytics/revenue", AdminAnalyticsRevenueView.as_view(), name="analytics-revenue"),
    path("analytics/rewards", AdminAnalyticsRewardsView.as_view(), name="analytics-rewards"),
    path("analytics/traffic", AdminAnalyticsTrafficView.as_view(), name="analytics-traffic"),
    path(
        "analytics/conversions",
        AdminAnalyticsConversionsView.as_view(),
        name="analytics-conversions",
    ),
    path(
        "analytics/leaderboard",
        AdminAnalyticsLeaderboardView.as_view(),
        name="analytics-leaderboard",
    ),
    path(
        "analytics/product-updates",
        AdminAnalyticsProductUpdatesView.as_view(),
        name="analytics-product-updates",
    ),
]
