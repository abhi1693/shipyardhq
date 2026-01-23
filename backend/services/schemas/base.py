from __future__ import annotations

from abc import ABC
from datetime import datetime
from typing import Any, TypeVar

from pydantic import BaseModel, ConfigDict, PrivateAttr, computed_field

SerializerT = TypeVar("SerializerT", bound="BaseSerializer")
ModelSerializerT = TypeVar("ModelSerializerT", bound="BaseModelSerializer")


class BaseSerializer(BaseModel, ABC):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    @classmethod
    def from_payload(cls: type[SerializerT], payload: dict[str, Any] | None) -> SerializerT | None:
        if not payload:
            return None
        return cls.model_validate(payload)


class BaseModelSerializer(BaseSerializer, ABC):
    model_config = ConfigDict(extra="ignore", populate_by_name=True, from_attributes=True)

    id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    _display: str | None = PrivateAttr(default=None)

    @classmethod
    def from_model(
        cls: type[ModelSerializerT],
        model: Any,
    ) -> ModelSerializerT:
        instance = cls.model_validate(model)
        instance._display = str(model)
        return instance

    @computed_field(return_type=str | None)
    @property
    def display(self) -> str | None:
        if self._display is not None:
            return self._display
        if self.id is None:
            return None
        return str(self.id)
