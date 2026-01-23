from __future__ import annotations

import os
from importlib import metadata
from pathlib import Path
import tomllib

_PACKAGE_NAME = "git-rank"
_DEFAULT_VERSION = "0.0.0"
APP_NAME = _PACKAGE_NAME


def _read_pyproject_version() -> str | None:
    pyproject = Path(__file__).resolve().parents[1] / "pyproject.toml"
    try:
        data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError):
        return None
    project = data.get("project")
    if not isinstance(project, dict):
        return None
    version = project.get("version")
    if isinstance(version, str) and version:
        return version
    return None


def resolve_app_version() -> str:
    env_version = os.getenv("APP_VERSION")
    if env_version:
        return env_version
    try:
        return metadata.version(_PACKAGE_NAME)
    except metadata.PackageNotFoundError:
        file_version = _read_pyproject_version()
        return file_version or _DEFAULT_VERSION


APP_VERSION = resolve_app_version()
