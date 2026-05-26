import django_tables2 as tables
from django.urls import reverse
from django.utils.html import format_html, format_html_join

from catalog.category_icons import CATEGORY_ICON_LABELS, render_category_icon
from core.tables import PrimaryModelTable

from .models import Category, Product, UseCase


class CategoryTable(PrimaryModelTable):
    name = tables.Column(verbose_name="Category")
    icon = tables.Column(orderable=False, verbose_name="Icon")
    parent = tables.Column(empty_values=(), orderable=False, verbose_name="Parent")
    is_active = tables.Column(verbose_name="Active")
    products = tables.Column(empty_values=(), orderable=False, verbose_name="Products")
    children = tables.Column(empty_values=(), orderable=False, verbose_name="Children")
    last_updated = tables.DateTimeColumn(format="M j, Y", verbose_name="Updated")

    class Meta(PrimaryModelTable.Meta):
        model = Category
        fields = ("name", "icon", "slug", "parent", "is_active", "products", "children", "last_updated")
        sequence = fields
        empty_text = "No categories found."
        row_attrs = {
            "class": "ship-table-row-clickable",
            "data-href": lambda record: reverse("member_category", kwargs={"pk": record.pk}),
        }

    def render_name(self, record):
        return format_html("<strong>{}</strong>", record.name)

    def render_icon(self, value):
        return format_html(
            '<span class="category-icon-cell">{}<span>{}</span></span>',
            render_category_icon(value),
            CATEGORY_ICON_LABELS.get(value, value),
        )

    def render_parent(self, record):
        if record.parent:
            return record.parent
        return format_html('<span class="ship-table-muted">None</span>')

    def render_is_active(self, value):
        if value:
            return format_html('<span class="ship-table-badge ship-table-badge-active">Active</span>')
        return format_html('<span class="ship-table-badge ship-table-badge-inactive">Inactive</span>')

    def render_products(self, record):
        return record.product_count

    def render_children(self, record):
        return record.child_count


class UseCaseTable(PrimaryModelTable):
    name = tables.Column(verbose_name="Use case")
    categories = tables.Column(empty_values=(), orderable=False, verbose_name="Categories")
    products = tables.Column(empty_values=(), orderable=False, verbose_name="Products")
    is_active = tables.Column(verbose_name="Active")
    last_updated = tables.DateTimeColumn(format="M j, Y", verbose_name="Updated")

    class Meta(PrimaryModelTable.Meta):
        model = UseCase
        fields = ("name", "slug", "categories", "products", "is_active", "last_updated")
        sequence = fields
        empty_text = "No use cases found."
        row_attrs = {
            "class": "ship-table-row-clickable",
            "data-href": lambda record: reverse("member_use_case", kwargs={"pk": record.pk}),
        }

    def render_name(self, record):
        return format_html("<strong>{}</strong>", record.name)

    def render_categories(self, record):
        categories = list(record.categories.all())
        if not categories:
            return format_html('<span class="ship-table-muted">None</span>')
        return format_html(
            '<span class="ship-table-chip-list">{}</span>',
            format_html_join(
                "",
                '<span class="ship-table-chip">{}</span>',
                ((category.name,) for category in categories),
            ),
        )

    def render_products(self, record):
        return record.product_count

    def render_is_active(self, value):
        if value:
            return format_html('<span class="ship-table-badge ship-table-badge-active">Active</span>')
        return format_html('<span class="ship-table-badge ship-table-badge-inactive">Inactive</span>')


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
