from django.urls import path

from analytics.views_public import (
    CategoryTrendView,
    LeaderboardAboutView,
    LeaderboardMonthlyArchiveView,
    LeaderboardMonthlyView,
    LeaderboardRewardsView,
    LeaderboardView,
    LeaderboardWeeklyArchiveView,
    PublicAnalyticsOverviewView,
    VerifiedRevenueView,
)

app_name = "public"

urlpatterns = [
    path("analytics", PublicAnalyticsOverviewView.as_view(), name="analytics"),
    path("verified-revenue", VerifiedRevenueView.as_view(), name="verified-revenue"),
    path("leaderboard", LeaderboardView.as_view(), name="leaderboard"),
    path("leaderboard/about", LeaderboardAboutView.as_view(), name="leaderboard-about"),
    path("leaderboard/monthly", LeaderboardMonthlyView.as_view(), name="leaderboard-monthly"),
    path(
        "leaderboard/monthly/<int:year>/<int:month>",
        LeaderboardMonthlyArchiveView.as_view(),
        name="leaderboard-monthly-archive",
    ),
    path(
        "leaderboard/weekly/<int:year>/<int:week>",
        LeaderboardWeeklyArchiveView.as_view(),
        name="leaderboard-weekly-archive",
    ),
    path("leaderboard/rewards", LeaderboardRewardsView.as_view(), name="leaderboard-rewards"),
    path("trends/categories/<slug:slug>", CategoryTrendView.as_view(), name="category-trends"),
]
