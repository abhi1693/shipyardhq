from django.urls import path

from rewards.views_admin import (
    AdminRewardCatalogCreateView,
    AdminRewardCatalogDeleteView,
    AdminRewardCatalogDetailView,
    AdminRewardCatalogListView,
    AdminRewardCatalogUpdateView,
    AdminRewardRuleCreateView,
    AdminRewardRuleDeleteView,
    AdminRewardRuleDetailView,
    AdminRewardRuleListView,
    AdminRewardRuleUpdateView,
    AdminRewardsAdjustView,
    AdminRewardsRefundsView,
    AdminRewardTransactionListView,
)

app_name = "admin"

urlpatterns = [
    path("rewards/adjust", AdminRewardsAdjustView.as_view(), name="rewards-adjust"),
    path("rewards/refunds", AdminRewardsRefundsView.as_view(), name="rewards-refunds"),
    path("rewards/catalog", AdminRewardCatalogListView.as_view(), name="reward-catalog"),
    path("rewards/catalog/add", AdminRewardCatalogCreateView.as_view(), name="reward-catalog-add"),
    path(
        "rewards/catalog/<int:pk>",
        AdminRewardCatalogDetailView.as_view(),
        name="reward-catalog-detail",
    ),
    path(
        "rewards/catalog/<int:pk>/edit",
        AdminRewardCatalogUpdateView.as_view(),
        name="reward-catalog-edit",
    ),
    path(
        "rewards/catalog/<int:pk>/delete",
        AdminRewardCatalogDeleteView.as_view(),
        name="reward-catalog-delete",
    ),
    path("rewards/rules", AdminRewardRuleListView.as_view(), name="reward-rules"),
    path("rewards/rules/add", AdminRewardRuleCreateView.as_view(), name="reward-rule-add"),
    path("rewards/rules/<int:pk>", AdminRewardRuleDetailView.as_view(), name="reward-rule-detail"),
    path(
        "rewards/rules/<int:pk>/edit", AdminRewardRuleUpdateView.as_view(), name="reward-rule-edit"
    ),
    path(
        "rewards/rules/<int:pk>/delete",
        AdminRewardRuleDeleteView.as_view(),
        name="reward-rule-delete",
    ),
    path(
        "rewards/transactions", AdminRewardTransactionListView.as_view(), name="reward-transactions"
    ),
]
