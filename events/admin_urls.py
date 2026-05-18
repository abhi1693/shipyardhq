from django.urls import path

from events.views_admin import (
    AdminEventDeleteView,
    AdminEventDetailView,
    AdminEventListView,
    AdminNotificationsView,
)

app_name = "admin"

urlpatterns = [
    path("notifications", AdminNotificationsView.as_view(), name="notifications"),
    path("operations/events", AdminEventListView.as_view(), name="events"),
    path("operations/events/<int:pk>", AdminEventDetailView.as_view(), name="event-detail"),
    path("operations/events/<int:pk>/delete", AdminEventDeleteView.as_view(), name="event-delete"),
]
