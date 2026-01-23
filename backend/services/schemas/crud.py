from __future__ import annotations

from typing import Any, Optional, Union, get_args, get_origin
import types

from pydantic import BaseModel, ConfigDict, Field, create_model
from sqlmodel import SQLModel


class AutoSchemaBase(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        populate_by_name=True,
        from_attributes=True,
    )


class AutoInputBase(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        populate_by_name=True,
    )


def _is_optional(annotation: Any) -> bool:
    origin = get_origin(annotation)
    if origin is None:
        return False
    if origin in {Optional, Union, types.UnionType}:
        return type(None) in get_args(annotation)
    return type(None) in get_args(annotation)


def _ensure_optional(annotation: Any) -> Any:
    if annotation is Any or annotation is None:
        return Optional[Any]
    if _is_optional(annotation):
        return annotation
    return Optional[annotation]


def _resolve_alias(model: type[SQLModel], field_name: str) -> str | None:
    if not field_name.endswith("_"):
        return None
    trimmed = field_name.rstrip("_")
    table = getattr(model, "__table__", None)
    if table is None:
        return None
    if trimmed in table.columns:
        return trimmed
    return None


def _resolve_default(field_info, *, for_update: bool) -> tuple[str, Any | None]:
    if for_update:
        return "default", None
    default_factory = getattr(field_info, "default_factory", None)
    if default_factory is not None:
        return "factory", default_factory
    if field_info.is_required():
        return "required", None
    return "default", field_info.default


def _build_fields(
    model: type[SQLModel],
    *,
    for_update: bool,
    exclude_fields: set[str],
) -> dict[str, tuple[Any, Any]]:
    fields: dict[str, tuple[Any, Any]] = {}
    for name, field_info in model.model_fields.items():
        if name in exclude_fields:
            continue
        annotation = field_info.annotation or Any
        if for_update:
            annotation = _ensure_optional(annotation)
        default_kind, default_value = _resolve_default(field_info, for_update=for_update)
        alias = _resolve_alias(model, name)
        if alias:
            if default_kind == "factory":
                default = Field(
                    default_factory=default_value,
                    validation_alias=alias,
                    serialization_alias=alias,
                )
            elif default_kind == "required":
                default = Field(
                    ...,
                    validation_alias=alias,
                    serialization_alias=alias,
                )
            else:
                default = Field(
                    default_value,
                    validation_alias=alias,
                    serialization_alias=alias,
                )
        else:
            if default_kind == "factory":
                default = Field(default_factory=default_value)
            elif default_kind == "required":
                default = ...
            else:
                default = default_value
        fields[name] = (annotation, default)
    return fields


def build_schema(
    model: type[SQLModel],
    *,
    mode: str,
) -> type[BaseModel]:
    if mode not in {"read", "create", "update"}:
        raise ValueError(f"Unknown schema mode: {mode}")
    exclude_fields: set[str] = set()
    if mode in {"create", "update"}:
        exclude_fields.update({"id", "created_at", "updated_at"})
    fields = _build_fields(
        model,
        for_update=mode == "update",
        exclude_fields=exclude_fields,
    )
    base = AutoSchemaBase if mode == "read" else AutoInputBase
    name = f"{model.__name__}{mode.title()}Schema"
    return create_model(name, __base__=base, **fields)
