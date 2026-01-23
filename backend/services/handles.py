import re

HANDLE_MIN_LENGTH = 3
HANDLE_MAX_LENGTH = 20
HANDLE_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")


def normalize_handle(value: str | None) -> str:
    trimmed = (value or "").strip().lower()
    if not trimmed:
        return ""
    return trimmed[1:] if trimmed.startswith("@") else trimmed


def validate_handle(handle: str) -> str | None:
    if not handle:
        return "Handle is required."
    if len(handle) < HANDLE_MIN_LENGTH or len(handle) > HANDLE_MAX_LENGTH:
        return f"Handle must be {HANDLE_MIN_LENGTH}-{HANDLE_MAX_LENGTH} characters."
    if not HANDLE_PATTERN.match(handle):
        return "Use letters, numbers, and single dashes only."
    return None
