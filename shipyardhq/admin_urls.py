from accounts import admin_urls as accounts_admin_urls
from analytics import admin_urls as analytics_admin_urls
from catalog import admin_urls as catalog_admin_urls
from events import admin_urls as events_admin_urls
from rewards import admin_urls as rewards_admin_urls

app_name = "admin"

urlpatterns = [
    *analytics_admin_urls.urlpatterns,
    *accounts_admin_urls.urlpatterns,
    *catalog_admin_urls.urlpatterns,
    *rewards_admin_urls.urlpatterns,
    *events_admin_urls.urlpatterns,
]
