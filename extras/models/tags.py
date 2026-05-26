from django.db import models
from django.utils.text import slugify
from taggit.models import GenericTaggedItemBase, TagBase

from core.models import ChangeLoggedModel


class Tag(ChangeLoggedModel, TagBase):
    id = models.BigAutoField(primary_key=True)
    color = models.CharField(max_length=6, default="9e9e9e")
    description = models.CharField(max_length=200, blank=True)
    object_types = models.ManyToManyField(
        to="contenttypes.ContentType",
        related_name="+",
        blank=True,
    )

    class Meta:
        ordering = ("name",)
        indexes = [
            models.Index(fields=("name",)),
        ]

    def slugify(self, tag, i=None):
        slug = slugify(tag, allow_unicode=True)
        if i is not None:
            slug += f"_{i}"
        return slug


class TaggedItem(GenericTaggedItemBase):
    tag = models.ForeignKey(
        to=Tag,
        related_name="%(app_label)s_%(class)s_items",
        on_delete=models.CASCADE,
    )

    class Meta:
        indexes = [
            models.Index(fields=("content_type", "object_id")),
        ]
