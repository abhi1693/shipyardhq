from __future__ import annotations

from collections.abc import Iterable

from django.contrib import messages
from django.forms import modelform_factory
from django.urls import reverse
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    TemplateView,
    UpdateView,
)


def _titleize(label: str) -> str:
    return str(label).replace("_", " ").title()


class ShellTemplateMixin:
    base_template = "base/private.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["base_template"] = self.base_template
        return context


class SectionPageMixin(ShellTemplateMixin):
    page_title: str | None = None
    page_description: str | None = None
    section_eyebrow: str | None = None

    def get_page_title(self) -> str:
        return self.page_title or "Shipyard HQ"

    def get_page_description(self) -> str:
        return self.page_description or ""

    def get_section_eyebrow(self) -> str | None:
        return self.section_eyebrow

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["page_title"] = self.get_page_title()
        context["page_description"] = self.get_page_description()
        context["section_eyebrow"] = self.get_section_eyebrow()
        return context


class DashboardView(SectionPageMixin, TemplateView):
    template_name = "generic/dashboard.html"
    metrics: Iterable[dict] = ()
    cards: Iterable[dict] = ()

    def get_metrics(self):
        return self.metrics

    def get_cards(self):
        return self.cards

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["metrics"] = list(self.get_metrics())
        context["cards"] = list(self.get_cards())
        return context


class ModelObjectListView(SectionPageMixin, ListView):
    template_name = "generic/object_list.html"
    context_object_name = "objects"
    fields: tuple[str, ...] | None = None

    def get_page_title(self) -> str:
        return self.page_title or _titleize(self.model._meta.verbose_name_plural)

    def get_fields(self) -> list:
        if self.fields:
            return [self.model._meta.get_field(name) for name in self.fields]
        return [
            field
            for field in self.model._meta.concrete_fields
            if getattr(field, "editable", True) and field.name not in {"created_at", "updated_at"}
        ][:6]

    def get_row_value(self, obj, field_name: str):
        value = getattr(obj, field_name)
        if callable(value):
            value = value()
        return value

    def get_table_rows(self):
        rows = []
        fields = self.get_fields()
        for obj in self.get_queryset():
            rows.append(
                {
                    "object": obj,
                    "detail_url": self.get_detail_url(obj),
                    "cells": [self.get_row_value(obj, field.name) for field in fields],
                }
            )
        return rows

    def get_detail_url(self, obj):
        if hasattr(obj, "get_absolute_url"):
            return obj.get_absolute_url()
        return None

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["table_fields"] = [field.verbose_name for field in self.get_fields()]
        context["table_rows"] = self.get_table_rows()
        return context


class ModelObjectDetailView(SectionPageMixin, DetailView):
    template_name = "generic/object_detail.html"
    fields: tuple[str, ...] | None = None

    def get_page_title(self) -> str:
        return self.page_title or str(self.object)

    def get_display_fields(self):
        if self.fields:
            return [self.object._meta.get_field(name) for name in self.fields]
        return [
            field
            for field in self.object._meta.concrete_fields
            if field.name not in {"created_at", "updated_at"}
        ]

    def get_field_rows(self):
        rows = []
        for field in self.get_display_fields():
            rows.append(
                {
                    "label": field.verbose_name,
                    "value": getattr(self.object, field.name),
                }
            )
        return rows

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["field_rows"] = self.get_field_rows()
        return context


class ModelFormViewMixin(SectionPageMixin):
    template_name = "generic/object_form.html"
    fields = "__all__"
    success_message: str | None = None

    def get_form_class(self):
        if self.form_class:
            return self.form_class
        return modelform_factory(self.model, fields=self.fields)

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        for field in form.fields.values():
            widget = field.widget
            existing_classes = widget.attrs.get("class", "")
            widget.attrs["class"] = f"{existing_classes} input".strip()
        return form

    def get_success_url(self):
        if self.object and hasattr(self.object, "get_absolute_url"):
            return self.object.get_absolute_url()
        return reverse("admin:overview")

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.success_message:
            messages.success(self.request, self.success_message)
        return response


class ModelObjectCreateView(ModelFormViewMixin, CreateView):
    def get_page_title(self) -> str:
        return self.page_title or f"Add {_titleize(self.model._meta.verbose_name)}"


class ModelObjectUpdateView(ModelFormViewMixin, UpdateView):
    def get_page_title(self) -> str:
        return self.page_title or f"Edit {_titleize(self.model._meta.verbose_name)}"


class ModelObjectDeleteView(SectionPageMixin, DeleteView):
    template_name = "generic/object_delete.html"
    success_url = None
    success_message: str | None = None

    def get_page_title(self) -> str:
        return self.page_title or f"Delete {self.object}"

    def delete(self, request, *args, **kwargs):
        response = super().delete(request, *args, **kwargs)
        if self.success_message:
            messages.success(request, self.success_message)
        return response

    def form_valid(self, form):
        response = super().form_valid(form)
        if self.success_message:
            messages.success(self.request, self.success_message)
        return response

    def get_success_url(self):
        if self.success_url:
            return self.success_url
        return reverse("admin:overview")
