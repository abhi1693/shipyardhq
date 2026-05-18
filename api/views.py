from django.http import JsonResponse
from django.views import View

from analytics.models import LeaderboardRun
from catalog.models import Category, Product
from rewards.models import RewardCatalogItem


class ApiIndexView(View):
    def get(self, request, *args, **kwargs):
        return JsonResponse(
            {
                "ok": True,
                "service": "shipyardhq",
                "api_version": "v1",
                "resources": {
                    "products": Product.objects.count(),
                    "categories": Category.objects.count(),
                    "leaderboard_runs": LeaderboardRun.objects.count(),
                    "reward_catalog_items": RewardCatalogItem.objects.count(),
                },
                "endpoints": {
                    "index": request.build_absolute_uri("/api/"),
                },
            }
        )
