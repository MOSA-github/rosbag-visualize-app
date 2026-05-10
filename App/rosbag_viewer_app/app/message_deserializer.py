from __future__ import annotations

import importlib
import math
from array import array
from collections.abc import Mapping, Sequence
from typing import Any

from .topic_model import MessageRecord

try:
    from rclpy.serialization import deserialize_message as ros_deserialize_message
    from rosidl_runtime_py.utilities import get_message as ros_get_message
except Exception:  # pragma: no cover - exercised only outside ROS 2.
    ros_deserialize_message = None
    ros_get_message = None


class MessageDeserializer:
    """Deserializes ROS 2 CDR payloads when ROS 2 Python packages exist."""

    def __init__(self) -> None:
        self._message_class_cache: dict[str, Any] = {}
        self.last_error: str | None = None

    @property
    def ros_available(self) -> bool:
        return ros_deserialize_message is not None and ros_get_message is not None

    def deserialize(self, type_name: str, timestamp_ns: int, payload: bytes) -> MessageRecord:
        if not self.ros_available:
            return MessageRecord(
                timestamp_ns=timestamp_ns,
                raw_data=payload,
                data={
                    "size_bytes": len(payload),
                    "raw_hex_preview": payload[:96].hex(" "),
                    "note": "ROS 2 Python packages are not available; showing serialized CDR bytes.",
                },
                error="ROS 2 Python packages are not available.",
            )

        try:
            message_class = self._message_class(type_name)
            message = ros_deserialize_message(payload, message_class)
            return MessageRecord(
                timestamp_ns=timestamp_ns,
                raw_data=payload,
                message=message,
                data=message_to_plain(message),
            )
        except Exception as exc:
            error = f"Failed to deserialize {type_name}: {exc}"
            self.last_error = error
            return MessageRecord(
                timestamp_ns=timestamp_ns,
                raw_data=payload,
                data={
                    "size_bytes": len(payload),
                    "raw_hex_preview": payload[:96].hex(" "),
                    "error": error,
                },
                error=error,
            )

    def _message_class(self, type_name: str) -> Any:
        if type_name in self._message_class_cache:
            return self._message_class_cache[type_name]

        try:
            message_class = ros_get_message(type_name)
        except Exception:
            package, _, name = type_name.partition("/msg/")
            if not package or not name:
                raise
            module = importlib.import_module(f"{package}.msg")
            message_class = getattr(module, name)

        self._message_class_cache[type_name] = message_class
        return message_class


def message_to_plain(value: Any, depth: int = 0, sequence_limit: int = 80) -> Any:
    """Converts ROS messages to JSON-like data without exploding large arrays."""

    if depth > 8:
        return "<max depth reached>"
    if value is None or isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        if math.isfinite(value):
            return value
        return str(value)
    if isinstance(value, (bytes, bytearray)):
        return {
            "type": "bytes",
            "length": len(value),
            "hex_preview": bytes(value[:64]).hex(" "),
        }
    if isinstance(value, array):
        if value.typecode in ("b", "B"):
            return {
                "type": f"array({value.typecode})",
                "length": len(value),
                "hex_preview": bytes(value[:64]).hex(" "),
            }
        return _sequence_to_plain(value, depth, sequence_limit)
    if isinstance(value, Mapping):
        return {str(key): message_to_plain(val, depth + 1, sequence_limit) for key, val in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return _sequence_to_plain(value, depth, sequence_limit)
    if hasattr(value, "get_fields_and_field_types"):
        return {
            field: message_to_plain(getattr(value, field), depth + 1, sequence_limit)
            for field in value.get_fields_and_field_types().keys()
        }
    if hasattr(value, "__slots__"):
        return {
            field.lstrip("_"): message_to_plain(getattr(value, field), depth + 1, sequence_limit)
            for field in value.__slots__
            if hasattr(value, field)
        }
    return str(value)


def _sequence_to_plain(value: Sequence[Any], depth: int, sequence_limit: int) -> Any:
    data = list(value[:sequence_limit]) if hasattr(value, "__getitem__") else list(value)[:sequence_limit]
    converted = [message_to_plain(item, depth + 1, sequence_limit) for item in data]
    if len(value) > sequence_limit:
        converted.append(f"... {len(value) - sequence_limit} more items")
    return converted

