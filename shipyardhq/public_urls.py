from accounts import public_urls as accounts_public_urls
from analytics import public_urls as analytics_public_urls
from catalog import public_urls as catalog_public_urls
from rewards import public_urls as rewards_public_urls

app_name = "public"

urlpatterns = [
    *catalog_public_urls.urlpatterns,
    *analytics_public_urls.urlpatterns,
    *rewards_public_urls.urlpatterns,
    *accounts_public_urls.urlpatterns,
]
