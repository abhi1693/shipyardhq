from accounts import member_urls as accounts_member_urls
from catalog import member_urls as catalog_member_urls
from rewards import member_urls as rewards_member_urls

app_name = "member"

urlpatterns = [
    *accounts_member_urls.urlpatterns,
    *catalog_member_urls.urlpatterns,
    *rewards_member_urls.urlpatterns,
]
