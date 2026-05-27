import django_tables2 as tables
from django.urls import reverse
from django.utils.html import format_html

from core.tables import PrimaryModelTable

from .models import Plan


class PlanTable(PrimaryModelTable):
    name = tables.Column(verbose_name="Plan")
    type = tables.Column(verbose_name="Type")
    price_cents = tables.Column(verbose_name="Price")
    external_id = tables.Column(verbose_name="Dodo product")
    is_active = tables.Column(verbose_name="Status")
    last_updated = tables.DateTimeColumn(format="M j, Y", verbose_name="Updated")

    class Meta(PrimaryModelTable.Meta):
        model = Plan
        fields = ("name", "type", "price_cents", "external_id", "is_active", "last_updated")
        sequence = fields
        empty_text = "No plans found."
        row_attrs = {
            "class": "ship-table-row-clickable",
            "data-href": lambda record: reverse("member_plan", kwargs={"pk": record.pk}),
        }

    def render_name(self, record):
        return format_html("<strong>{}</strong>", record.name)

    def render_type(self, value, record):
        return record.get_type_display()

    def render_price_cents(self, record):
        return record.price_display

    def render_external_id(self, value):
        if value:
            return format_html("<code>{}</code>", value)
        return format_html('<span class="ship-table-muted">Not linked</span>')

    def render_is_active(self, value):
        if value:
            return format_html('<span class="ship-table-badge ship-table-badge-active">Active</span>')
        return format_html('<span class="ship-table-badge ship-table-badge-inactive">Inactive</span>')
