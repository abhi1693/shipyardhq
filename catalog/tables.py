import django_tables2 as tables
from django.utils.html import format_html

from core.tables import PrimaryModelTable

from .models import Product


class ProductTable(PrimaryModelTable):
    name = tables.Column(verbose_name="Product")
    status = tables.Column(verbose_name="Status")
    category = tables.Column(verbose_name="Category")
    product_type = tables.Column(verbose_name="Type")
    pricing_model = tables.Column(verbose_name="Pricing")
    last_updated = tables.DateTimeColumn(format="M j, Y", verbose_name="Updated")

    class Meta(PrimaryModelTable.Meta):
        model = Product
        fields = (
            "name",
            "tagline",
            "status",
            "category",
            "product_type",
            "pricing_model",
            "last_updated",
        )
        sequence = fields
        empty_text = "No products found."

    def render_name(self, record):
        return format_html("<strong>{}</strong>", record.name)

    def render_status(self, value):
        return format_html('<span class="ship-table-badge ship-table-badge-{}">{}</span>', value, value.title())
