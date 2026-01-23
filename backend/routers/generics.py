from __future__ import annotations

from abc import ABC
import inspect
from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any, Generic, Iterable, Sequence, TypeVar

from fastapi import Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict, ValidationError
from sqlalchemy import String, cast, func, or_
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession as Session

from auth import CurrentUser
from database import get_session
from routers.base import BaseAPIView
from services.schemas.base import BaseModelSerializer, BaseSerializer

ModelT = TypeVar("ModelT", bound=SQLModel)
SerializerT = TypeVar("SerializerT", bound=BaseSerializer)
ResultT = TypeVar("ResultT")


class PaginatedResponse(BaseModel, Generic[ResultT]):
    model_config = ConfigDict(extra="ignore")

    count: int
    next: str | None = None
    previous: str | None = None
    results: list[ResultT]


class APIView(BaseAPIView, ABC):
    @dataclass(frozen=True)
    class Action:
        path: str
        methods: list[str]
        handler: str
        response_model: type[Any] | None = None
        status_code: int | None = None
        responses: dict[int, dict[str, Any]] | None = None
        operation_id: str | None = None

    actions: Sequence["APIView.Action"] = ()

    def __init__(self, *, prefix: str, tags: list[str]) -> None:
        super().__init__(prefix=prefix, tags=tags)

    def get_actions(self) -> Sequence["APIView.Action"]:
        return self.actions

    def register_routes(self) -> None:
        for action in self.get_actions():
            handler = getattr(self, action.handler)
            kwargs: dict[str, Any] = {
                "methods": action.methods,
            }
            if action.response_model is not None:
                kwargs["response_model"] = action.response_model
            if action.status_code is not None:
                kwargs["status_code"] = action.status_code
            if action.responses is not None:
                kwargs["responses"] = action.responses
            if action.operation_id is not None:
                kwargs["operation_id"] = action.operation_id
            self.router.add_api_route(action.path, handler, **kwargs)


class AssetAPIView(APIView, ABC):
    pass


class GenericAPIView(BaseAPIView, ABC):
    model: type[ModelT] | None = None
    serializer_class: type[SerializerT]
    create_schema: type[BaseModel] | None = None
    update_schema: type[BaseModel] | None = None
    lookup_field: str = "id"
    lookup_url_kwarg: str | None = None
    lookup_type: type[Any] = int
    list_path: str = ""
    page_size: int = 25
    max_page_size: int | None = 200
    page_query_param: str = "page"
    page_size_query_param: str = "page_size"
    filterset_fields: set[str] | None = None
    filterset_exclude: set[str] = set()
    search_fields: set[str] | None = None
    search_param: str = "q"
    requires_model: bool = True

    def __init__(self, *, prefix: str, tags: list[str]) -> None:
        if self.requires_model and not getattr(self, "model", None):
            raise RuntimeError("model is required for generic views.")
        if not getattr(self, "serializer_class", None):
            raise RuntimeError("serializer_class is required for generic views.")
        super().__init__(prefix=prefix, tags=tags)

    def get_queryset(self, session: Session, *, request: Request | None = None):
        return select(self.model)

    async def _resolve_queryset(self, session: Session, *, request: Request | None = None):
        queryset = self.get_queryset(session, request=request)
        if inspect.isawaitable(queryset):
            return await queryset
        return queryset

    def get_serializer_class(self) -> type[SerializerT]:
        return self.serializer_class

    def get_create_schema(self) -> type[BaseModel]:
        return self.create_schema or self.serializer_class

    def get_update_schema(self) -> type[BaseModel]:
        return self.update_schema or self.serializer_class

    def get_lookup_field(self) -> str:
        return self.lookup_field

    def get_lookup_url_kwarg(self) -> str:
        return self.lookup_url_kwarg or self.lookup_field

    def get_lookup_type(self) -> type[Any]:
        return self.lookup_type

    def get_list_path(self) -> str:
        return self.list_path

    def get_detail_path(self) -> str:
        lookup = self.get_lookup_url_kwarg()
        return f"/{{{lookup}}}"

    def get_list_response_model(self):
        serializer = self.get_serializer_class()
        return PaginatedResponse[serializer]

    def get_not_found_detail(self) -> str:
        if not self.model:
            return "Resource not found."
        return f"{self.model.__name__} not found."

    def _ensure_identifier(self, name: str) -> str:
        if not name.isidentifier():
            raise RuntimeError(f"Invalid lookup parameter: {name}")
        return name

    async def _execute_queryset(self, session: Session, queryset: Any) -> list[ModelT]:
        if hasattr(queryset, "where"):
            return (await session.exec(queryset)).all()
        return list(queryset)

    def get_filterset_fields(self) -> set[str]:
        if self.filterset_fields is not None:
            return set(self.filterset_fields)
        table = getattr(self.model, "__table__", None)
        if not table:
            return set()
        return {column.name for column in table.columns if column.name not in self.filterset_exclude}

    def get_reserved_query_params(self) -> set[str]:
        return {
            self.page_query_param,
            self.page_size_query_param,
            self.get_search_param(),
            "limit",
        }

    def get_search_param(self) -> str:
        return self.search_param

    def get_search_fields(self) -> set[str]:
        if self.search_fields is not None:
            return set(self.search_fields)
        table = getattr(self.model, "__table__", None)
        if not table:
            return set()
        fields: set[str] = set()
        for column in table.columns:
            python_type = self.get_column_python_type(column)
            if python_type is str:
                fields.add(column.name)
                continue
            if isinstance(python_type, type) and issubclass(python_type, Enum):
                fields.add(column.name)
        return fields

    def get_search_term(self, raw_query: str | None) -> str | None:
        if not raw_query:
            return None
        term = raw_query.strip()
        return term if term else None

    def get_model_column(self, field: str):
        table = getattr(self.model, "__table__", None)
        if not table:
            return None
        return table.columns.get(field)

    def get_column_python_type(self, column) -> type[Any] | None:
        try:
            return column.type.python_type
        except (AttributeError, NotImplementedError):
            return None

    def coerce_value(self, column, raw_value: str):
        python_type = self.get_column_python_type(column)
        if python_type is None:
            return raw_value
        if python_type is bool:
            normalized = raw_value.strip().lower()
            if normalized in {"true", "1", "yes"}:
                return True
            if normalized in {"false", "0", "no"}:
                return False
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid boolean value: {raw_value}",
            )
        if python_type is int:
            try:
                return int(raw_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid integer value: {raw_value}",
                ) from exc
        if python_type is float:
            try:
                return float(raw_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid float value: {raw_value}",
                ) from exc
        if python_type is datetime:
            try:
                return datetime.fromisoformat(raw_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid datetime value: {raw_value}",
                ) from exc
        if python_type is date:
            try:
                return date.fromisoformat(raw_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid date value: {raw_value}",
                ) from exc
        if isinstance(python_type, type) and issubclass(python_type, Enum):
            try:
                return python_type(raw_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid enum value: {raw_value}",
                ) from exc
        return raw_value

    def get_allowed_lookups(self, python_type: type[Any] | None) -> set[str]:
        if python_type is None:
            return {"exact", "in", "isnull"}
        if isinstance(python_type, type) and issubclass(python_type, Enum):
            return {"exact", "in"}
        if python_type is str:
            return {
                "exact",
                "in",
                "isnull",
                "contains",
                "icontains",
                "startswith",
                "istartswith",
                "endswith",
                "iendswith",
            }
        if python_type in {int, float, datetime, date, bool}:
            return {"exact", "in", "isnull", "gt", "gte", "lt", "lte"}
        return {"exact", "in", "isnull"}

    def build_filter_expression(self, column, lookup: str, raw_value: str):
        python_type = self.get_column_python_type(column)
        allowed = self.get_allowed_lookups(python_type)
        if lookup not in allowed:
            detail = f"Unsupported lookup '{lookup}' for field '{column.name}'"
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        if lookup == "isnull":
            value = self.coerce_value(column, raw_value)
            if not isinstance(value, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid isnull value: {raw_value}",
                )
            return column.is_(None) if value else column.is_not(None)
        if lookup == "in":
            values = [item.strip() for item in raw_value.split(",") if item.strip()]
            coerced = [self.coerce_value(column, value) for value in values]
            return column.in_(coerced)
        value = self.coerce_value(column, raw_value)
        if lookup == "exact":
            return column == value
        if lookup == "gt":
            return column > value
        if lookup == "gte":
            return column >= value
        if lookup == "lt":
            return column < value
        if lookup == "lte":
            return column <= value
        if lookup == "contains":
            return column.contains(value)
        if lookup == "icontains":
            return column.ilike(f"%{value}%")
        if lookup == "startswith":
            return column.startswith(value)
        if lookup == "istartswith":
            return column.ilike(f"{value}%")
        if lookup == "endswith":
            return column.endswith(value)
        if lookup == "iendswith":
            return column.ilike(f"%{value}")
        return column == value

    def apply_filters(self, request: Request, queryset: Any):
        filterset_fields = self.get_filterset_fields()
        if not filterset_fields:
            return queryset
        reserved = self.get_reserved_query_params()
        if not hasattr(queryset, "where"):
            items = list(queryset)
            for key, raw_value in request.query_params.multi_items():
                if key in reserved:
                    continue
                if "__" in key:
                    field, lookup = key.split("__", 1)
                else:
                    field, lookup = key, "exact"
                if field not in filterset_fields:
                    detail = f"Unknown filter field: {field}"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=detail,
                    )
                column = self.get_model_column(field)
                if column is None:
                    detail = f"Unknown filter field: {field}"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=detail,
                    )
                python_type = self.get_column_python_type(column)
                allowed = self.get_allowed_lookups(python_type)
                if lookup not in allowed:
                    detail = f"Unsupported lookup '{lookup}' for field '{field}'"
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=detail,
                    )
                items = [
                    item
                    for item in items
                    if self.matches_filter(item, field, lookup, raw_value, column)
                ]
            return items
        for key, raw_value in request.query_params.multi_items():
            if key in reserved:
                continue
            if "__" in key:
                field, lookup = key.split("__", 1)
            else:
                field, lookup = key, "exact"
            if field not in filterset_fields:
                detail = f"Unknown filter field: {field}"
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
            column = self.get_model_column(field)
            if column is None:
                detail = f"Unknown filter field: {field}"
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
            expression = self.build_filter_expression(column, lookup, raw_value)
            queryset = queryset.where(expression)
        return queryset

    def get_search_expression(self, column, term: str):
        return cast(column, String).ilike(f"%{term}%")

    def _coerce_search_value(self, value: Any) -> Any:
        if isinstance(value, Enum):
            return value.value
        return value

    def _iter_item_values(self, item: Any) -> Iterable[Any]:
        if isinstance(item, dict):
            return item.values()
        if hasattr(item, "__dict__"):
            return item.__dict__.values()
        return (item,)

    def _get_item_value(self, item: Any, field: str) -> Any:
        if isinstance(item, dict):
            return item.get(field)
        return getattr(item, field, None)

    def _matches_search_term(self, value: Any, term: str) -> bool:
        if value is None:
            return False
        normalized = self._coerce_search_value(value)
        return term.lower() in str(normalized).lower()

    def apply_search(self, request: Request, queryset: Any, *, q: str | None = None):
        term = self.get_search_term(q or request.query_params.get(self.get_search_param()))
        if not term:
            return queryset
        search_fields = self.get_search_fields()
        if hasattr(queryset, "where"):
            if not search_fields:
                return queryset
            expressions = []
            for field in search_fields:
                column = self.get_model_column(field)
                if column is None:
                    raise RuntimeError(f"Unknown search field: {field}")
                expressions.append(self.get_search_expression(column, term))
            if not expressions:
                return queryset
            return queryset.where(or_(*expressions))
        items = list(queryset)
        if not items:
            return items
        if not search_fields:
            if self.search_fields is not None:
                return items
            return [
                item
                for item in items
                if any(self._matches_search_term(value, term) for value in self._iter_item_values(item))
            ]
        return [
            item
            for item in items
            if any(
                self._matches_search_term(self._get_item_value(item, field), term)
                for field in search_fields
            )
        ]

    def matches_filter(
        self,
        item: Any,
        field: str,
        lookup: str,
        raw_value: str,
        column,
    ) -> bool:
        value = getattr(item, field, None)
        if lookup == "isnull":
            target = self.coerce_value(column, raw_value)
            if not isinstance(target, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid isnull value: {raw_value}",
                )
            return value is None if target else value is not None
        if lookup == "in":
            values = [item.strip() for item in raw_value.split(",") if item.strip()]
            coerced = [self.coerce_value(column, item) for item in values]
            return value in coerced
        target = self.coerce_value(column, raw_value)
        if lookup == "exact":
            return value == target
        if lookup == "gt":
            return value is not None and value > target
        if lookup == "gte":
            return value is not None and value >= target
        if lookup == "lt":
            return value is not None and value < target
        if lookup == "lte":
            return value is not None and value <= target
        if value is None:
            return False
        if lookup == "contains":
            return str(target) in str(value)
        if lookup == "icontains":
            return str(target).lower() in str(value).lower()
        if lookup == "startswith":
            return str(value).startswith(str(target))
        if lookup == "istartswith":
            return str(value).lower().startswith(str(target).lower())
        if lookup == "endswith":
            return str(value).endswith(str(target))
        if lookup == "iendswith":
            return str(value).lower().endswith(str(target).lower())
        return value == target

    def get_page_size(self, page_size: int | None) -> int:
        resolved = page_size or self.page_size
        if self.max_page_size is not None:
            return min(resolved, self.max_page_size)
        return resolved

    async def paginate_queryset(
        self,
        session: Session,
        queryset: Any,
        *,
        page: int,
        page_size: int,
    ) -> tuple[list[ModelT], int]:
        if hasattr(queryset, "limit"):
            count_statement = select(func.count()).select_from(queryset.subquery())
            count_value = (await session.exec(count_statement)).one()
            if isinstance(count_value, tuple):
                count_value = count_value[0]
            count = int(count_value or 0)
            offset = (page - 1) * page_size
            paginated = queryset.limit(page_size).offset(offset)
            items = (await session.exec(paginated)).all()
            return items, count
        items = list(queryset)
        count = len(items)
        offset = (page - 1) * page_size
        return items[offset : offset + page_size], count

    def get_paginated_response(
        self,
        *,
        request: Request,
        items: list[Any],
        count: int,
        page: int,
        page_size: int,
    ) -> dict[str, Any]:
        has_next = page * page_size < count
        has_previous = page > 1
        next_url = None
        previous_url = None
        if has_next:
            next_url = str(
                request.url.include_query_params(
                    **{
                        self.page_query_param: page + 1,
                        self.page_size_query_param: page_size,
                    }
                )
            )
        if has_previous:
            previous_url = str(
                request.url.include_query_params(
                    **{
                        self.page_query_param: page - 1,
                        self.page_size_query_param: page_size,
                    }
                )
            )
        return {
            "count": count,
            "next": next_url,
            "previous": previous_url,
            "results": items,
        }

    async def get_object_or_404(self, session: Session, queryset: Any) -> ModelT:
        obj = (await session.exec(queryset)).first()
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=self.get_not_found_detail(),
            )
        return obj

    async def get_object_from_queryset(
        self,
        session: Session,
        queryset: Any,
        lookup_value: Any,
    ) -> ModelT:
        if hasattr(queryset, "where"):
            field = getattr(self.model, self.get_lookup_field())
            queryset = queryset.where(field == lookup_value)
            return await self.get_object_or_404(session, queryset)
        for item in queryset:
            if getattr(item, self.get_lookup_field()) == lookup_value:
                return item
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=self.get_not_found_detail(),
        )

    async def get_object_by_lookup(self, session: Session, lookup_value: Any) -> ModelT:
        queryset = self.get_queryset(session)
        if hasattr(queryset, "where"):
            field = getattr(self.model, self.get_lookup_field())
            queryset = queryset.where(field == lookup_value)
            return await self.get_object_or_404(session, queryset)
        for item in queryset:
            if getattr(item, self.get_lookup_field()) == lookup_value:
                return item
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=self.get_not_found_detail(),
        )

    def validate_payload(self, payload: Any, schema: type[BaseModel]) -> BaseModel:
        if isinstance(payload, schema):
            return payload
        try:
            return schema.model_validate(payload)
        except ValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=exc.errors(),
            ) from exc

    def serialize(self, obj: Any, *, request: Request | None = None) -> BaseModel:
        serializer_class = self.get_serializer_class()
        if issubclass(serializer_class, BaseModelSerializer):
            return serializer_class.from_model(obj)
        return serializer_class.model_validate(obj)

    def serialize_many(
        self,
        items: Iterable[Any],
        *,
        request: Request | None = None,
    ) -> list[BaseModel]:
        return [self.serialize(item, request=request) for item in items]

    async def perform_create(self, session: Session, payload: BaseModel) -> ModelT:
        data = payload.model_dump(exclude_unset=True)
        obj = self.model(**data)
        save = getattr(obj, "save", None)
        if not callable(save):
            raise RuntimeError(f"{self.model.__name__} is missing save().")
        return await save(session, commit=True, refresh=True)

    async def perform_update(
        self,
        session: Session,
        obj: ModelT,
        payload: BaseModel,
        *,
        partial: bool,
    ) -> ModelT:
        data = payload.model_dump(exclude_unset=partial)
        update = getattr(obj, "update", None)
        if not callable(update):
            raise RuntimeError(f"{self.model.__name__} is missing update().")
        return await update(session, commit=True, refresh=True, **data)

    async def perform_delete(self, session: Session, obj: ModelT) -> None:
        delete = getattr(obj, "delete", None)
        if not callable(delete):
            raise RuntimeError(f"{self.model.__name__} is missing delete().")
        await delete(session, commit=True)

    def _build_create_endpoint(self):
        schema = self.get_create_schema()

        async def endpoint(
            payload: schema,  # type: ignore[valid-type]
            request: Request,
            session: Session = Depends(get_session),
        ):
            return await self.create(payload, request=request, session=session)

        endpoint.__name__ = f"{self.__class__.__name__}_create"
        return endpoint

    def _build_detail_endpoint(self, handler, *, payload_schema: type[BaseModel] | None = None):
        lookup = self._ensure_identifier(self.get_lookup_url_kwarg())
        lookup_type = self.get_lookup_type()
        namespace = {
            "Depends": Depends,
            "Session": Session,
            "get_session": get_session,
            "Request": Request,
            "handler": handler,
            "lookup_type": lookup_type,
        }
        if payload_schema:
            namespace["payload_schema"] = payload_schema
            code = (
                f"async def endpoint({lookup}: lookup_type, payload: payload_schema, request: Request,"
                " session: Session = Depends(get_session)):\n"
                f"    return await handler(lookup_value={lookup}, payload=payload, request=request, session=session)\n"
            )
        else:
            code = (
                f"async def endpoint({lookup}: lookup_type, request: Request,"
                " session: Session = Depends(get_session)):\n"
                f"    return await handler(lookup_value={lookup}, request=request, session=session)\n"
            )
        # Build a signature with a dynamic path parameter name.
        exec(code, namespace)
        endpoint = namespace["endpoint"]
        endpoint.__name__ = f"{self.__class__.__name__}_{handler.__name__}"
        return endpoint


class ListModelMixin:
    async def list(
        self,
        request: Request,
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        if limit is not None:
            page_size = limit
        queryset = self.apply_filters(
            request,
            await self._resolve_queryset(session, request=request),
        )
        queryset = self.apply_search(request, queryset, q=q)
        resolved_page_size = self.get_page_size(page_size)
        page_items, count = await self.paginate_queryset(
            session,
            queryset,
            page=page,
            page_size=resolved_page_size,
        )
        return self.get_paginated_response(
            request=request,
            items=self.serialize_many(page_items, request=request),
            count=count,
            page=page,
            page_size=resolved_page_size,
        )


class RetrieveModelMixin:
    async def retrieve(
        self,
        lookup_value: Any,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        obj = await self.get_object_by_lookup(session, lookup_value)
        return self.serialize(obj, request=request)


class CreateModelMixin:
    async def create(
        self,
        payload: Any,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        schema = self.get_create_schema()
        payload_model = self.validate_payload(payload, schema)
        obj = await self.perform_create(session, payload_model)
        return self.serialize(obj, request=request)


class UpdateModelMixin:
    async def update(
        self,
        lookup_value: Any,
        payload: Any,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        schema = self.get_update_schema()
        payload_model = self.validate_payload(payload, schema)
        obj = await self.get_object_by_lookup(session, lookup_value)
        obj = await self.perform_update(session, obj, payload_model, partial=False)
        return self.serialize(obj, request=request)

    async def partial_update(
        self,
        lookup_value: Any,
        payload: Any,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        schema = self.get_update_schema()
        payload_model = self.validate_payload(payload, schema)
        obj = await self.get_object_by_lookup(session, lookup_value)
        obj = await self.perform_update(session, obj, payload_model, partial=True)
        return self.serialize(obj, request=request)


class DestroyModelMixin:
    async def destroy(
        self,
        lookup_value: Any,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        obj = await self.get_object_by_lookup(session, lookup_value)
        await self.perform_delete(session, obj)
        return None


class UserScopedListRetrieveAPIView(GenericAPIView):
    user_field: str = "user_id"

    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_list_path(),
            self.list,
            methods=["GET"],
            response_model=self.get_list_response_model(),
        )
        self.router.add_api_route(
            self.get_detail_path(),
            self.retrieve,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )

    def get_user_field(self) -> str:
        return self.user_field

    def get_filterset_fields(self) -> set[str]:
        fields = super().get_filterset_fields()
        fields.discard(self.get_user_field())
        return fields

    async def get_scoped_queryset(self, session: Session, user_id: int):
        queryset = await self._resolve_queryset(session)
        if hasattr(queryset, "where"):
            field = getattr(self.model, self.get_user_field())
            return queryset.where(field == user_id)
        return [
            item
            for item in queryset
            if getattr(item, self.get_user_field()) == user_id
        ]

    async def build_list_response(
        self,
        *,
        request: Request,
        session: Session,
        queryset: Any,
        page: int,
        page_size: int | None,
    ):
        resolved_page_size = self.get_page_size(page_size)
        page_items, count = await self.paginate_queryset(
            session,
            queryset,
            page=page,
            page_size=resolved_page_size,
        )
        return self.get_paginated_response(
            request=request,
            items=self.serialize_many(page_items, request=request),
            count=count,
            page=page,
            page_size=resolved_page_size,
        )

    async def list(
        self,
        request: Request,
        current_user: CurrentUser,
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        if limit is not None:
            page_size = limit
        queryset = self.apply_filters(
            request,
            await self.get_scoped_queryset(session, current_user.id),
        )
        queryset = self.apply_search(request, queryset, q=q)
        return await self.build_list_response(
            request=request,
            session=session,
            queryset=queryset,
            page=page,
            page_size=page_size,
        )

    async def retrieve(
        self,
        id: int,
        current_user: CurrentUser,
        request: Request | None = None,
        session: Session = Depends(get_session),
    ):
        queryset = await self.get_scoped_queryset(session, current_user.id)
        obj = await self.get_object_from_queryset(session, queryset, id)
        return self.serialize(obj, request=request)


class UserProviderScopedListRetrieveAPIView(UserScopedListRetrieveAPIView):
    provider_field: str = "provider"

    def get_provider_field(self) -> str:
        return self.provider_field

    def get_filterset_fields(self) -> set[str]:
        fields = super().get_filterset_fields()
        fields.discard(self.get_provider_field())
        return fields

    def resolve_provider(self, provider: str):
        return provider

    async def get_scoped_queryset(self, session: Session, user_id: int, provider):
        queryset = await self._resolve_queryset(session)
        if hasattr(queryset, "where"):
            user_field = getattr(self.model, self.get_user_field())
            provider_field = getattr(self.model, self.get_provider_field())
            return queryset.where(user_field == user_id, provider_field == provider)
        user_field_name = self.get_user_field()
        provider_field_name = self.get_provider_field()
        return [
            item
            for item in queryset
            if getattr(item, user_field_name) == user_id
            and getattr(item, provider_field_name) == provider
        ]

    async def list(
        self,
        provider: str,
        request: Request,
        current_user: CurrentUser,
        q: str | None = Query(default=None),
        session: Session = Depends(get_session),
        page: int = Query(default=1, ge=1),
        limit: int | None = Query(default=None, ge=1),
        page_size: int | None = Query(default=None, ge=1),
    ):
        if limit is not None:
            page_size = limit
        provider_value = self.resolve_provider(provider)
        queryset = self.apply_filters(
            request,
            await self.get_scoped_queryset(session, current_user.id, provider_value),
        )
        queryset = self.apply_search(request, queryset, q=q)
        return await self.build_list_response(
            request=request,
            session=session,
            queryset=queryset,
            page=page,
            page_size=page_size,
        )

    async def retrieve(
        self,
        provider: str,
        id: int,
        current_user: CurrentUser,
        session: Session = Depends(get_session),
    ):
        provider_value = self.resolve_provider(provider)
        queryset = await self.get_scoped_queryset(session, current_user.id, provider_value)
        obj = await self.get_object_from_queryset(session, queryset, id)
        return self.serialize(obj)


class UserInstallationScopedListRetrieveAPIView(UserScopedListRetrieveAPIView):
    installation_model: type[SQLModel] | None = None
    installation_field: str = "installation_id"
    installation_user_field: str = "user_id"
    installation_relation: str = "installation"

    def get_installation_model(self) -> type[SQLModel]:
        if not self.installation_model:
            raise RuntimeError("installation_model is required for installation scoped views.")
        return self.installation_model

    def get_installation_field(self) -> str:
        return self.installation_field

    def get_installation_user_field(self) -> str:
        return self.installation_user_field

    def get_installation_relation(self) -> str:
        return self.installation_relation

    async def get_scoped_queryset(self, session: Session, user_id: int):
        queryset = await self._resolve_queryset(session)
        installation_model = self.get_installation_model()
        if hasattr(queryset, "join"):
            installation_field = getattr(self.model, self.get_installation_field())
            installation_id = getattr(installation_model, "id")
            installation_user = getattr(
                installation_model,
                self.get_installation_user_field(),
            )
            return queryset.join(
                installation_model,
                installation_id == installation_field,
            ).where(installation_user == user_id)
        relation_name = self.get_installation_relation()
        return [
            item
            for item in queryset
            if getattr(
                getattr(item, relation_name, None),
                self.get_installation_user_field(),
                None,
            )
            == user_id
        ]


class ListAPIView(ListModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_list_path(),
            self.list,
            methods=["GET"],
            response_model=self.get_list_response_model(),
        )


class NonModelListAPIView(ListModelMixin, GenericAPIView):
    requires_model = False

    def get_queryset(self, session: Session, *, request: Request | None = None):
        raise NotImplementedError("NonModelListAPIView requires get_queryset override.")

    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_list_path(),
            self.list,
            methods=["GET"],
            response_model=self.get_list_response_model(),
        )


class NonModelRetrieveAPIView(GenericAPIView):
    requires_model = False

    async def retrieve(self, *args: Any, **kwargs: Any):
        raise NotImplementedError("NonModelRetrieveAPIView requires retrieve override.")

    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_detail_path(),
            self.retrieve,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )


class RetrieveAPIView(RetrieveModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        endpoint = self._build_detail_endpoint(self.retrieve)
        self.router.add_api_route(
            self.get_detail_path(),
            endpoint,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )


class CreateAPIView(CreateModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        endpoint = self._build_create_endpoint()
        self.router.add_api_route(
            self.get_list_path(),
            endpoint,
            methods=["POST"],
            response_model=self.get_serializer_class(),
            status_code=status.HTTP_201_CREATED,
        )


class UpdateAPIView(UpdateModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        update_schema = self.get_update_schema()
        update_endpoint = self._build_detail_endpoint(self.update, payload_schema=update_schema)
        self.router.add_api_route(
            self.get_detail_path(),
            update_endpoint,
            methods=["PUT"],
            response_model=self.get_serializer_class(),
        )
        partial_endpoint = self._build_detail_endpoint(
            self.partial_update,
            payload_schema=update_schema,
        )
        self.router.add_api_route(
            self.get_detail_path(),
            partial_endpoint,
            methods=["PATCH"],
            response_model=self.get_serializer_class(),
        )


class DestroyAPIView(DestroyModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        endpoint = self._build_detail_endpoint(self.destroy)
        self.router.add_api_route(
            self.get_detail_path(),
            endpoint,
            methods=["DELETE"],
            status_code=status.HTTP_204_NO_CONTENT,
        )


class ListCreateAPIView(ListModelMixin, CreateModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        self.router.add_api_route(
            self.get_list_path(),
            self.list,
            methods=["GET"],
            response_model=self.get_list_response_model(),
        )
        endpoint = self._build_create_endpoint()
        self.router.add_api_route(
            self.get_list_path(),
            endpoint,
            methods=["POST"],
            response_model=self.get_serializer_class(),
            status_code=status.HTTP_201_CREATED,
        )


class RetrieveUpdateAPIView(RetrieveModelMixin, UpdateModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        retrieve_endpoint = self._build_detail_endpoint(self.retrieve)
        self.router.add_api_route(
            self.get_detail_path(),
            retrieve_endpoint,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )
        update_schema = self.get_update_schema()
        update_endpoint = self._build_detail_endpoint(self.update, payload_schema=update_schema)
        self.router.add_api_route(
            self.get_detail_path(),
            update_endpoint,
            methods=["PUT"],
            response_model=self.get_serializer_class(),
        )
        partial_endpoint = self._build_detail_endpoint(
            self.partial_update,
            payload_schema=update_schema,
        )
        self.router.add_api_route(
            self.get_detail_path(),
            partial_endpoint,
            methods=["PATCH"],
            response_model=self.get_serializer_class(),
        )


class RetrieveDestroyAPIView(RetrieveModelMixin, DestroyModelMixin, GenericAPIView):
    def register_routes(self) -> None:
        retrieve_endpoint = self._build_detail_endpoint(self.retrieve)
        self.router.add_api_route(
            self.get_detail_path(),
            retrieve_endpoint,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )
        destroy_endpoint = self._build_detail_endpoint(self.destroy)
        self.router.add_api_route(
            self.get_detail_path(),
            destroy_endpoint,
            methods=["DELETE"],
            status_code=status.HTTP_204_NO_CONTENT,
        )


class RetrieveUpdateDestroyAPIView(
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin,
    GenericAPIView,
):
    def register_routes(self) -> None:
        retrieve_endpoint = self._build_detail_endpoint(self.retrieve)
        self.router.add_api_route(
            self.get_detail_path(),
            retrieve_endpoint,
            methods=["GET"],
            response_model=self.get_serializer_class(),
        )
        update_schema = self.get_update_schema()
        update_endpoint = self._build_detail_endpoint(self.update, payload_schema=update_schema)
        self.router.add_api_route(
            self.get_detail_path(),
            update_endpoint,
            methods=["PUT"],
            response_model=self.get_serializer_class(),
        )
        partial_endpoint = self._build_detail_endpoint(
            self.partial_update,
            payload_schema=update_schema,
        )
        self.router.add_api_route(
            self.get_detail_path(),
            partial_endpoint,
            methods=["PATCH"],
            response_model=self.get_serializer_class(),
        )
        destroy_endpoint = self._build_detail_endpoint(self.destroy)
        self.router.add_api_route(
            self.get_detail_path(),
            destroy_endpoint,
            methods=["DELETE"],
            status_code=status.HTTP_204_NO_CONTENT,
        )
