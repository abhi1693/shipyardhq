from django.urls import reverse, reverse_lazy

from core.generic_views import (
    DashboardView,
    ModelObjectDeleteView,
    ModelObjectDetailView,
    ModelObjectListView,
)
from core.mixins import AdminRequiredMixin
from events.models import EventEnvelope


class EventsAdminMixin(AdminRequiredMixin):
    base_template = "base/private.html"
    section_eyebrow = "Admin · Operations"


class AdminNotificationsView(EventsAdminMixin, DashboardView):
    page_title = "Notifications"
    page_description = "Notification center, previews, and dispatch state will be handled here."


class AdminEventListView(EventsAdminMixin, ModelObjectListView):
    model = EventEnvelope
    fields = ("topic", "status", "available_at", "processed_at", "created_at")
    page_title = "Event queue"

    def get_detail_url(self, obj):
        return reverse("admin:event-detail", args=[obj.pk])


class AdminEventDetailView(EventsAdminMixin, ModelObjectDetailView):
    model = EventEnvelope
    page_title = "Event envelope"


class AdminEventDeleteView(EventsAdminMixin, ModelObjectDeleteView):
    model = EventEnvelope
    page_title = "Delete event envelope"
    success_message = "Event envelope deleted."
    success_url = reverse_lazy("admin:events")
