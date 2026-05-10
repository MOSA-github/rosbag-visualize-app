from __future__ import annotations

import math
from array import array
from collections.abc import Mapping, Sequence
from typing import Any


def record_value(record: Any) -> Any:
    message = getattr(record, "message", None)
    if message is not None:
        return message
    return getattr(record, "data", record)


def get_value(value: Any, path: str, default: Any = None) -> Any:
    current = value
    for part in path.split("."):
        if current is None:
            return default
        if isinstance(current, Mapping):
            current = current.get(part, default)
        else:
            current = getattr(current, part, default)
    return current


def first_value(value: Any, paths: list[str], default: Any = None) -> Any:
    for path in paths:
        found = get_value(value, path, None)
        if found is not None:
            return found
    return default


def sequence(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, array):
        return list(value)
    if isinstance(value, (bytes, bytearray)):
        return list(value)
    if isinstance(value, Sequence) and not isinstance(value, str):
        return list(value)
    return []


def flatten_scalars(value: Any, prefix: str = "", depth: int = 0, limit: int = 128) -> dict[str, Any]:
    if depth > 5:
        return {prefix or "value": "<nested>"}
    if value is None or isinstance(value, (str, int, float, bool)):
        return {prefix or "value": value}
    if isinstance(value, (bytes, bytearray, array)):
        return {prefix or "value": f"<{type(value).__name__} length={len(value)}>"}

    result: dict[str, Any] = {}
    if isinstance(value, Mapping):
        items = list(value.items())[:limit]
        for key, item in items:
            child = f"{prefix}.{key}" if prefix else str(key)
            result.update(flatten_scalars(item, child, depth + 1, limit))
        return result

    if isinstance(value, Sequence) and not isinstance(value, str):
        for index, item in enumerate(list(value)[: min(len(value), 16)]):
            child = f"{prefix}[{index}]" if prefix else f"[{index}]"
            result.update(flatten_scalars(item, child, depth + 1, limit))
        if len(value) > 16:
            result[prefix or "value"] = f"<sequence length={len(value)}>"
        return result

    if hasattr(value, "get_fields_and_field_types"):
        for field in value.get_fields_and_field_types().keys():
            child = f"{prefix}.{field}" if prefix else field
            result.update(flatten_scalars(getattr(value, field), child, depth + 1, limit))
        return result

    if hasattr(value, "__slots__"):
        for slot in value.__slots__:
            if hasattr(value, slot):
                name = slot.lstrip("_")
                child = f"{prefix}.{name}" if prefix else name
                result.update(flatten_scalars(getattr(value, slot), child, depth + 1, limit))
        return result

    return {prefix or "value": str(value)}


def flatten_numeric(value: Any, prefix: str = "", depth: int = 0) -> dict[str, float]:
    if depth > 5:
        return {}
    if isinstance(value, bool):
        return {prefix or "value": 1.0 if value else 0.0}
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if math.isfinite(float(value)):
            return {prefix or "value": float(value)}
        return {}
    if isinstance(value, (str, bytes, bytearray)):
        return {}
    if isinstance(value, array):
        if value.typecode in ("b", "B"):
            return {}
        return {
            f"{prefix}[{index}]": float(item)
            for index, item in enumerate(value[:32])
            if isinstance(item, (int, float)) and math.isfinite(float(item))
        }
    if isinstance(value, Mapping):
        result: dict[str, float] = {}
        for key, item in value.items():
            child = f"{prefix}.{key}" if prefix else str(key)
            result.update(flatten_numeric(item, child, depth + 1))
        return _filter_unhelpful_numeric_fields(result)
    if isinstance(value, Sequence):
        result: dict[str, float] = {}
        for index, item in enumerate(list(value)[:32]):
            child = f"{prefix}[{index}]" if prefix else f"[{index}]"
            result.update(flatten_numeric(item, child, depth + 1))
        return result
    if hasattr(value, "get_fields_and_field_types"):
        result: dict[str, float] = {}
        for field in value.get_fields_and_field_types().keys():
            child = f"{prefix}.{field}" if prefix else field
            result.update(flatten_numeric(getattr(value, field), child, depth + 1))
        return _filter_unhelpful_numeric_fields(result)
    if hasattr(value, "__slots__"):
        result: dict[str, float] = {}
        for slot in value.__slots__:
            if hasattr(value, slot):
                name = slot.lstrip("_")
                child = f"{prefix}.{name}" if prefix else name
                result.update(flatten_numeric(getattr(value, slot), child, depth + 1))
        return _filter_unhelpful_numeric_fields(result)
    return {}


def yaw_from_quaternion(x: float, y: float, z: float, w: float) -> float:
    siny_cosp = 2.0 * (w * z + x * y)
    cosy_cosp = 1.0 - 2.0 * (y * y + z * z)
    return math.atan2(siny_cosp, cosy_cosp)


def short_text(value: Any, max_len: int = 120) -> str:
    text = str(value)
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def _filter_unhelpful_numeric_fields(values: dict[str, float]) -> dict[str, float]:
    filtered: dict[str, float] = {}
    for key, value in values.items():
        normalized = key.lower()
        if ".stamp.sec" in normalized or ".stamp.nanosec" in normalized:
            continue
        if "covariance" in normalized:
            continue
        filtered[key] = value
    return filtered

