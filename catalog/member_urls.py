from django.urls import path

from catalog.views_member import (
    MemberFeedbackView,
    MemberOverviewView,
    MemberProductAnalyticsView,
    MemberProductClaimView,
    MemberProductCreateView,
    MemberProductDeleteView,
    MemberProductDetailView,
    MemberProductListView,
    MemberProductUpdateView,
    MemberProductUpgradeView,
)

app_name = "member"

urlpatterns = [
    path("overview", MemberOverviewView.as_view(), name="overview"),
    path("feedback", MemberFeedbackView.as_view(), name="feedback"),
    path("products", MemberProductListView.as_view(), name="products"),
    path("products/add", MemberProductCreateView.as_view(), name="product-add"),
    path("products/claim", MemberProductClaimView.as_view(), name="product-claim"),
    path("products/<slug:slug>", MemberProductDetailView.as_view(), name="product-detail"),
    path("products/<slug:slug>/edit", MemberProductUpdateView.as_view(), name="product-edit"),
    path(
        "products/<slug:slug>/analytics",
        MemberProductAnalyticsView.as_view(),
        name="product-analytics",
    ),
    path("products/<slug:slug>/delete", MemberProductDeleteView.as_view(), name="product-delete"),
    path(
        "products/<slug:slug>/upgrade", MemberProductUpgradeView.as_view(), name="product-upgrade"
    ),
]
