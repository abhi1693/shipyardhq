from django import forms

from .models import Category


class CategoryEditForm(forms.ModelForm):
    class Meta:
        model = Category
        fields = ("name", "slug", "icon", "parent", "description", "is_active")
        labels = {
            "is_active": "Active",
        }
        widgets = {
            "name": forms.TextInput(attrs={"class": "member-form-control", "data-slug-source": "id_slug"}),
            "slug": forms.TextInput(attrs={"class": "member-form-control", "data-slug-target": "id_name"}),
            "icon": forms.Select(attrs={"class": "member-form-control member-form-select", "autocomplete": "off"}),
            "parent": forms.Select(attrs={"class": "member-form-control member-form-select", "autocomplete": "off"}),
            "description": forms.Textarea(attrs={"class": "member-form-control member-form-textarea", "rows": 5}),
            "is_active": forms.CheckboxInput(attrs={"class": "member-form-checkbox"}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        parent_queryset = Category.objects.order_by("name")
        if self.instance.pk:
            parent_queryset = parent_queryset.exclude(pk=self.instance.pk)
        self.fields["parent"].queryset = parent_queryset
        self.fields["parent"].empty_label = "None"
