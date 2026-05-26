from django.db import models

from catalog.category_icons import CATEGORY_ICON_CHOICES
from core.models import NestedGroupModel


class Category(NestedGroupModel):
    icon = models.CharField(max_length=32, choices=CATEGORY_ICON_CHOICES, default="tool")

    class Meta(NestedGroupModel.Meta):
        verbose_name_plural = "categories"
        indexes = [
            models.Index(fields=("parent", "is_active", "name")),
            models.Index(fields=("slug", "is_active")),
        ]
