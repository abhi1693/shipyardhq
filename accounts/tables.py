import django_tables2 as tables
from django.urls import reverse
from django.utils.html import format_html

from core.tables import BaseTable

from .models import User


class UserTable(BaseTable):
    email = tables.Column(attrs={"td": {"class": "ship-table-mono"}}, verbose_name="Email")
    name = tables.Column(empty_values=(), orderable=False, verbose_name="Name")
    status = tables.Column(empty_values=(), orderable=False, verbose_name="Status")
    products = tables.Column(empty_values=(), orderable=False, verbose_name="Products")
    date_joined = tables.DateTimeColumn(format="M j, Y", verbose_name="Joined")
    last_login = tables.DateTimeColumn(default="Never", format="M j, Y", verbose_name="Last login")

    class Meta(BaseTable.Meta):
        model = User
        fields = ("email", "name", "status", "products", "date_joined", "last_login")
        sequence = fields
        empty_text = "No users found."
        row_attrs = {
            "class": "ship-table-row-clickable",
            "data-href": lambda record: reverse("member_user", kwargs={"pk": record.pk}),
        }

    def render_email(self, value):
        return format_html("<strong>{}</strong>", value)

    def render_name(self, record):
        return record.get_full_name() or "Not set"

    def render_status(self, record):
        if record.is_active:
            return format_html('<span class="ship-table-badge ship-table-badge-active">Active</span>')
        return format_html('<span class="ship-table-badge ship-table-badge-inactive">Inactive</span>')

    def render_products(self, record):
        return record.product_count
