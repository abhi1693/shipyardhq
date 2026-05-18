from django.urls import reverse, reverse_lazy

from core.generic_views import (
    DashboardView,
    ModelObjectCreateView,
    ModelObjectDeleteView,
    ModelObjectDetailView,
    ModelObjectListView,
    ModelObjectUpdateView,
)
from core.mixins import AdminRequiredMixin
from rewards.models import RewardCatalogItem, RewardRule, RewardTransaction


class RewardsAdminMixin(AdminRequiredMixin):
    base_template = "base/private.html"
    section_eyebrow = "Admin · Rewards"


class RewardsAdminListView(RewardsAdminMixin, ModelObjectListView):
    detail_route_name = ""

    def get_detail_url(self, obj):
        if not self.detail_route_name:
            return None
        return reverse(self.detail_route_name, args=[obj.pk])


class RewardsAdminDetailView(RewardsAdminMixin, ModelObjectDetailView):
    pass


class RewardsAdminCreateView(RewardsAdminMixin, ModelObjectCreateView):
    pass


class RewardsAdminUpdateView(RewardsAdminMixin, ModelObjectUpdateView):
    pass


class RewardsAdminDeleteView(RewardsAdminMixin, ModelObjectDeleteView):
    pass


class AdminRewardsAdjustView(RewardsAdminMixin, DashboardView):
    page_title = "Adjust rewards"
    page_description = "Manual balance corrections, operator-issued credits, and adjustment audits."

    def get_cards(self):
        return [
            {
                "label": "Adjustments",
                "title": "Manual balance updates",
                "body": "Use this area for one-off operator adjustments and audits.",
            },
        ]


class AdminRewardsRefundsView(RewardsAdminMixin, DashboardView):
    page_title = "Reward refunds"
    page_description = (
        "Refund and reversal activity for catalog redemptions and "
        "failed reward flows."
    )

    def get_cards(self):
        return [
            {
                "label": "Refunds",
                "title": "Refund queue",
                "body": (
                    "Review failed or canceled redemptions and "
                    "reconcile the related reward transactions."
                ),
            },
        ]


class AdminRewardCatalogListView(RewardsAdminListView):
    model = RewardCatalogItem
    detail_route_name = "admin:reward-catalog-detail"
    page_title = "Reward catalog"


class AdminRewardCatalogDetailView(RewardsAdminDetailView):
    model = RewardCatalogItem
    page_title = "Reward catalog item"


class AdminRewardCatalogCreateView(RewardsAdminCreateView):
    model = RewardCatalogItem
    page_title = "Add reward catalog item"
    success_message = "Reward catalog item created."

    def get_success_url(self):
        return reverse("admin:reward-catalog")


class AdminRewardCatalogUpdateView(RewardsAdminUpdateView):
    model = RewardCatalogItem
    page_title = "Edit reward catalog item"
    success_message = "Reward catalog item updated."

    def get_success_url(self):
        return reverse("admin:reward-catalog-detail", args=[self.object.pk])


class AdminRewardCatalogDeleteView(RewardsAdminDeleteView):
    model = RewardCatalogItem
    page_title = "Delete reward catalog item"
    success_message = "Reward catalog item deleted."
    success_url = reverse_lazy("admin:reward-catalog")


class AdminRewardRuleListView(RewardsAdminListView):
    model = RewardRule
    detail_route_name = "admin:reward-rule-detail"
    page_title = "Reward rules"


class AdminRewardRuleDetailView(RewardsAdminDetailView):
    model = RewardRule
    page_title = "Reward rule"


class AdminRewardRuleCreateView(RewardsAdminCreateView):
    model = RewardRule
    page_title = "Add reward rule"
    success_message = "Reward rule created."

    def get_success_url(self):
        return reverse("admin:reward-rules")


class AdminRewardRuleUpdateView(RewardsAdminUpdateView):
    model = RewardRule
    page_title = "Edit reward rule"
    success_message = "Reward rule updated."

    def get_success_url(self):
        return reverse("admin:reward-rule-detail", args=[self.object.pk])


class AdminRewardRuleDeleteView(RewardsAdminDeleteView):
    model = RewardRule
    page_title = "Delete reward rule"
    success_message = "Reward rule deleted."
    success_url = reverse_lazy("admin:reward-rules")


class AdminRewardTransactionListView(RewardsAdminListView):
    model = RewardTransaction
    page_title = "Reward transactions"
    fields = ("user", "transaction_type", "amount", "note", "created_at")

    def get_detail_url(self, obj):
        return None
