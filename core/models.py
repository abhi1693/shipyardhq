from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import models
from taggit.managers import TaggableManager


class BaseModel(models.Model):
    class Meta:
        abstract = True

    def _coerce_nullable_unique_chars(self):
        for field in self._meta.concrete_fields:
            if (
                isinstance(field, models.CharField)
                and field.null
                and field.unique
                and getattr(self, field.attname, None) == ""
            ):
                setattr(self, field.attname, None)

    def clean(self):
        super().clean()
        self._coerce_nullable_unique_chars()
        self._validate_generic_foreign_keys()

    def _validate_generic_foreign_keys(self):
        for field in self._meta.get_fields():
            if not isinstance(field, GenericForeignKey):
                continue

            content_type = getattr(self, field.ct_field, None)
            object_id = getattr(self, field.fk_field, None)

            if content_type is None and object_id is not None:
                raise ValidationError({field.ct_field: "This field cannot be null."})
            if object_id is None and content_type is not None:
                raise ValidationError({field.fk_field: "This field cannot be null."})
            if not content_type or not object_id:
                continue

            model = content_type.model_class()
            try:
                related_object = model.objects.get(pk=object_id)
            except ObjectDoesNotExist as exc:
                raise ValidationError(
                    {field.fk_field: f"Related object not found using the provided value: {object_id}."}
                ) from exc
            setattr(self, field.name, related_object)

    def save(self, *args, **kwargs):
        self._coerce_nullable_unique_chars()
        super().save(*args, **kwargs)


class ChangeLoggedModel(BaseModel):
    created = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True, blank=True, null=True)

    class Meta:
        abstract = True


class TagsMixin(models.Model):
    tags = TaggableManager(through="extras.TaggedItem", ordering=("name",))

    class Meta:
        abstract = True


class PrimaryModel(TagsMixin, ChangeLoggedModel):
    class Meta:
        abstract = True


class OrganizationalModel(TagsMixin, ChangeLoggedModel):
    name = models.CharField(max_length=160)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ("name",)

    def __str__(self):
        return self.name


class NestedGroupModel(OrganizationalModel):
    parent = models.ForeignKey("self", related_name="children", on_delete=models.PROTECT, null=True, blank=True)

    class Meta(OrganizationalModel.Meta):
        abstract = True

    def clean(self):
        super().clean()
        if self.pk and self.parent_id:
            ancestor = self.parent
            while ancestor is not None:
                if ancestor.pk == self.pk:
                    raise ValidationError({"parent": "An object cannot be its own ancestor."})
                ancestor = ancestor.parent
