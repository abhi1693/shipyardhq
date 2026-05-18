import json

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

__all__ = (
    "BaseModel",
    "TimeStampedModel",
    "ChangeLoggedModel",
    "PrimaryModel",
    "OrganizationalModel",
    "ObjectChange",
)


class BaseModel(models.Model):
    class Meta:
        abstract = True


class TimeStampedModel(BaseModel):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    @property
    def created(self):
        return self.created_at

    @property
    def last_updated(self):
        return self.updated_at


class ChangeLoggedModel(TimeStampedModel):
    changelog_exclude_fields = ()
    audit_exclude_fields = ()

    class Meta:
        abstract = True

    def get_changelog_exclude_fields(self) -> set[str]:
        return {
            "created_at",
            "updated_at",
            "created",
            "last_updated",
            *self.changelog_exclude_fields,
            *self.audit_exclude_fields,
        }

    def get_audit_exclude_fields(self) -> set[str]:
        return self.get_changelog_exclude_fields()

    def get_changelog_related_object(self):
        return None

    def _serialize_value(self, value):
        return json.loads(json.dumps(value, cls=DjangoJSONEncoder))

    def serialize_object(self, exclude=None):
        excluded_fields = self.get_changelog_exclude_fields()
        if exclude:
            excluded_fields.update(exclude)

        data = {}
        for field in self._meta.concrete_fields:
            if field.name in excluded_fields:
                continue
            data[field.name] = self._serialize_value(field.value_from_object(self))

        for field in self._meta.local_many_to_many:
            if field.name in excluded_fields:
                continue
            if self.pk is None:
                data[field.name] = []
                continue
            values = list(getattr(self, field.name).order_by("pk").values_list("pk", flat=True))
            data[field.name] = self._serialize_value(values)

        return data

    def serialize_for_audit(self, exclude=None):
        return self.serialize_object(exclude=exclude)

    def snapshot(self):
        self._prechange_snapshot = self.serialize_object()

    snapshot.alters_data = True

    def to_objectchange(self, action):
        related_object = self.get_changelog_related_object()
        objectchange = ObjectChange(
            action=action,
            changed_object=self,
            related_object=related_object,
            object_label=str(self)[:200],
        )

        if hasattr(self, "_prechange_snapshot"):
            objectchange.before = self._prechange_snapshot

        if action in {ObjectChange.Action.CREATE, ObjectChange.Action.UPDATE}:
            objectchange.after = self.serialize_object()

        return objectchange


class PrimaryModel(ChangeLoggedModel):
    description = models.TextField(blank=True)

    class Meta:
        abstract = True


class OrganizationalModel(ChangeLoggedModel):
    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        abstract = True
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class ObjectChange(models.Model):
    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"

    action_badge_classes = {
        Action.CREATE: "text-bg-success",
        Action.UPDATE: "text-bg-primary",
        Action.DELETE: "text-bg-danger",
    }

    happened_at = models.DateTimeField(auto_now_add=True, db_index=True)
    action = models.CharField(max_length=20, choices=Action.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="object_changes",
    )
    user_label = models.CharField(max_length=150, blank=True)
    request_id = models.UUIDField(null=True, blank=True, db_index=True)
    changed_object_type = models.ForeignKey(
        "contenttypes.ContentType",
        on_delete=models.PROTECT,
        related_name="+",
    )
    changed_object_id = models.PositiveBigIntegerField()
    changed_object = GenericForeignKey("changed_object_type", "changed_object_id")
    related_object_type = models.ForeignKey(
        "contenttypes.ContentType",
        on_delete=models.PROTECT,
        related_name="+",
        null=True,
        blank=True,
    )
    related_object_id = models.PositiveBigIntegerField(null=True, blank=True)
    related_object = GenericForeignKey("related_object_type", "related_object_id")
    object_label = models.CharField(max_length=200)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ("-happened_at",)
        indexes = [
            models.Index(fields=("changed_object_type", "changed_object_id")),
            models.Index(fields=("related_object_type", "related_object_id")),
        ]

    def __str__(self) -> str:
        return f"{self.object_label} {self.get_action_display().lower()}"

    def save(self, *args, **kwargs):
        if not self.user_label and self.user is not None:
            self.user_label = self.user.get_username()
        if not self.object_label and self.changed_object is not None:
            self.object_label = str(self.changed_object)[:200]
        return super().save(*args, **kwargs)

    @property
    def has_changes(self) -> bool:
        return self.before != self.after

    @property
    def badge_class(self) -> str:
        return self.action_badge_classes.get(self.action, "text-bg-secondary")

    @property
    def diff_items(self):
        before = self.before or {}
        after = self.after or {}

        if self.action == self.Action.CREATE:
            changed_keys = sorted(after)
        elif self.action == self.Action.DELETE:
            changed_keys = sorted(before)
        else:
            changed_keys = sorted(
                key for key in {*before, *after} if before.get(key) != after.get(key)
            )

        return [
            {
                "field": key,
                "before": before.get(key),
                "after": after.get(key),
            }
            for key in changed_keys
        ]
