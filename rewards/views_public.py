from core.generic_views import ModelObjectListView
from rewards.models import RewardCatalogItem


class PublicRewardsListView(ModelObjectListView):
    base_template = "base/public.html"
    section_eyebrow = "Public"
    model = RewardCatalogItem
    fields = ("name", "points_cost", "inventory", "active")
    page_title = "Rewards"
    page_description = "Browse reward catalog items and featured placements."

    def get_queryset(self):
        return RewardCatalogItem.objects.filter(active=True).order_by("name")
