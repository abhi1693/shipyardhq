from django.db import models

from core.models import NestedGroupModel


class Category(NestedGroupModel):
    class Meta(NestedGroupModel.Meta):
        verbose_name_plural = "categories"
        indexes = [
            models.Index(fields=("parent", "is_active", "name")),
            models.Index(fields=("slug", "is_active")),
        ]
