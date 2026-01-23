from __future__ import annotations

from typing import Iterable

import models
from models import SQLModel
from routers.base import api_prefix
from routers.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from services.schemas.crud import build_schema


def _iter_models() -> Iterable[type[SQLModel]]:
    for obj in vars(models).values():
        if not isinstance(obj, type):
            continue
        if not issubclass(obj, SQLModel):
            continue
        if getattr(obj, "__table__", None) is None:
            continue
        if "id" not in obj.model_fields:
            continue
        yield obj


def _sorted_models() -> list[type[SQLModel]]:
    return sorted(_iter_models(), key=lambda model: model.__tablename__)


def _build_crud_views(model: type[SQLModel]) -> list:
    table = model.__tablename__
    route_name = table.replace("_", "-")
    prefix = api_prefix(route_name)
    tags = [route_name]
    read_schema = build_schema(model, mode="read")
    create_schema = build_schema(model, mode="create")
    update_schema = build_schema(model, mode="update")

    list_view = type(
        f"{model.__name__}ListCreateView",
        (ListCreateAPIView,),
        {
            "model": model,
            "serializer_class": read_schema,
            "create_schema": create_schema,
            "update_schema": update_schema,
        },
    )
    detail_view = type(
        f"{model.__name__}DetailView",
        (RetrieveUpdateDestroyAPIView,),
        {
            "model": model,
            "serializer_class": read_schema,
            "create_schema": create_schema,
            "update_schema": update_schema,
        },
    )
    return [
        list_view(prefix=prefix, tags=tags).router,
        detail_view(prefix=prefix, tags=tags).router,
    ]


def build_crud_routers():
    routers = []
    for model in _sorted_models():
        routers.extend(_build_crud_views(model))
    return routers


crud_routers = build_crud_routers()
