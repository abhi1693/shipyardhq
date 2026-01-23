from __future__ import annotations

import json
import logging
import sys
import time
from datetime import datetime, timezone
from typing import Any

from services.version import APP_NAME, APP_VERSION
from settings import get_settings

_STANDARD_LOG_RECORD_ATTRS = {
    "args",
    "asctime",
    "created",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "module",
    "msecs",
    "message",
    "msg",
    "name",
    "pathname",
    "process",
    "processName",
    "relativeCreated",
    "stack_info",
    "thread",
    "threadName",
    "app",
    "version",
}


class AppLogFilter(logging.Filter):
    def __init__(self, app_name: str, version: str) -> None:
        super().__init__()
        self._app_name = app_name
        self._version = version

    def filter(self, record: logging.LogRecord) -> bool:
        record.app = self._app_name
        record.version = self._version
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "app": getattr(record, "app", APP_NAME),
            "version": getattr(record, "version", APP_VERSION),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack"] = self.formatStack(record.stack_info)
        for key, value in record.__dict__.items():
            if key in _STANDARD_LOG_RECORD_ATTRS or key in payload:
                continue
            payload[key] = value
        return json.dumps(payload, separators=(",", ":"), default=str)


class KeyValueFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = super().format(record)
        extras = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _STANDARD_LOG_RECORD_ATTRS
        }
        if not extras:
            return base
        extra_bits = " ".join(f"{key}={value}" for key, value in extras.items())
        return f"{base} {extra_bits}"


class AppLogger:
    _configured = False

    @classmethod
    def configure(cls, *, force: bool = False) -> None:
        if cls._configured and not force:
            return
        settings = get_settings()
        level_name = settings.log_level.upper()
        if level_name.isdigit():
            level = int(level_name)
        else:
            level = logging._nameToLevel.get(level_name, logging.INFO)

        handler = logging.StreamHandler(sys.stdout)
        handler.addFilter(AppLogFilter(APP_NAME, APP_VERSION))
        format_name = settings.log_format.lower()
        if format_name == "json":
            formatter: logging.Formatter = JsonFormatter()
        else:
            formatter = KeyValueFormatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s app=%(app)s version=%(version)s"
            )
            if settings.log_use_utc:
                formatter.converter = time.gmtime
        handler.setFormatter(formatter)

        root = logging.getLogger()
        root.setLevel(level)
        root.handlers.clear()
        root.addHandler(handler)

        logging.getLogger("apscheduler").setLevel(logging.WARNING)
        logging.getLogger("apscheduler.jobstores").setLevel(logging.WARNING)
        logging.getLogger("apscheduler.scheduler").setLevel(logging.WARNING)
        logging.getLogger("apscheduler.triggers").setLevel(logging.WARNING)
        logging.getLogger("apscheduler.executors").setLevel(logging.ERROR)
        logging.getLogger("github_sync").setLevel(logging.INFO)
        cls._configured = True

    @classmethod
    def get_logger(cls, name: str | None = None) -> logging.Logger:
        if not cls._configured:
            cls.configure()
        return logging.getLogger(name)


def log_info(
    logger: logging.Logger,
    message: str,
    meta: dict[str, Any] | None = None,
) -> None:
    logger.info(message, extra=meta or {})


def log_debug(
    logger: logging.Logger,
    message: str,
    meta: dict[str, Any] | None = None,
) -> None:
    logger.debug(message, extra=meta or {})


def log_warn(
    logger: logging.Logger,
    message: str,
    meta: dict[str, Any] | None = None,
) -> None:
    logger.warning(message, extra=meta or {})


def log_error(
    logger: logging.Logger,
    message: str,
    meta: dict[str, Any] | None = None,
) -> None:
    logger.error(message, extra=meta or {})
