from __future__ import annotations

from collections.abc import Mapping, Sequence
from numbers import Number
from typing import Any


NUMERIC_TYPES = (int, float)


def infer_viewer_from_messages(messages: Sequence[Any]) -> str | None:
    for record in messages:
        value = getattr(record, "data", None)
        if value is None:
            value = getattr(record, "message", record)
        viewer = infer_viewer_from_structure(value)
        if viewer:
            return viewer
    return None


def infer_viewer_from_structure(value: Any) -> str | None:
    plain = to_plain_probe(value)
    if plain is None:
        return None

    if isinstance(plain, bool):
        return "state_timeline"
    if isinstance(plain, NUMERIC_TYPES):
        return "timeseries"
    if isinstance(plain, str):
        return "log_table"

    if isinstance(plain, Mapping):
        keys = set(plain.keys())
        lower_keys = {str(key).lower() for key in keys}

        if {"height", "width", "encoding", "data"}.issubset(lower_keys):
            return "image_viewer"
        if {"format", "data"}.issubset(lower_keys):
            return "image_viewer"
        if {"ranges", "angle_min", "angle_increment"}.issubset(lower_keys):
            return "laserscan_viewer"
        if {"name", "position"}.issubset(lower_keys):
            return "joint_state_viewer"
        if {"position", "orientation"}.issubset(lower_keys):
            return "pose_viewer"
        if {"linear", "angular"}.issubset(lower_keys):
            return "twist_viewer"
        if {"x", "y", "z"}.issubset(lower_keys):
            return "odometry_viewer"

        values = list(plain.values())
        if len(values) == 1:
            return infer_viewer_from_structure(values[0])
        if any(isinstance(item, str) for item in values):
            return "table_viewer"
        if all(isinstance(item, (bool, int, float)) for item in values if item is not None):
            return "timeseries"
        if _looks_deeply_nested(plain):
            return "tree_viewer"
        return "table_viewer"

    if isinstance(plain, Sequence) and not isinstance(plain, (str, bytes, bytearray)):
        if not plain:
            return "table_viewer"
        if all(isinstance(item, bool) for item in plain):
            return "state_timeline"
        if all(isinstance(item, NUMERIC_TYPES) for item in plain):
            return "timeseries"
        return "tree_viewer"

    if isinstance(plain, (bytes, bytearray)):
        return "raw_viewer"

    return None


def to_plain_probe(value: Any, depth: int = 0) -> Any:
    if depth > 4:
        return "<nested>"
    if value is None or isinstance(value, (str, int, float, bool, bytes, bytearray)):
        return value
    if isinstance(value, Mapping):
        return {str(key): to_plain_probe(val, depth + 1) for key, val in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [to_plain_probe(item, depth + 1) for item in list(value)[:8]]
    if hasattr(value, "get_fields_and_field_types"):
        return {
            field: to_plain_probe(getattr(value, field), depth + 1)
            for field in value.get_fields_and_field_types().keys()
        }
    if hasattr(value, "__slots__"):
        return {
            field.lstrip("_"): to_plain_probe(getattr(value, field), depth + 1)
            for field in value.__slots__
            if hasattr(value, field)
        }
    return str(value)


def _looks_deeply_nested(value: Mapping[str, Any], depth: int = 0) -> bool:
    if depth >= 2:
        return True
    for item in value.values():
        if isinstance(item, Mapping) and _looks_deeply_nested(item, depth + 1):
            return True
    return False

