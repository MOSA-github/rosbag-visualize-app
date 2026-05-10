from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class TopicInfo:
    name: str
    type: str
    message_count: int = 0
    serialization_format: str = ""
    offered_qos_profiles: str = ""
    recommended_view: str = "raw_viewer"


@dataclass(frozen=True)
class BagMetadata:
    bag_path: Path
    metadata_path: Path
    storage_identifier: str = "sqlite3"
    duration_ns: int = 0
    starting_time_ns: int = 0
    message_count: int = 0
    relative_file_paths: list[str] = field(default_factory=list)
    topics: list[TopicInfo] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class MessageRecord:
    timestamp_ns: int
    raw_data: bytes | None = None
    message: Any | None = None
    data: dict[str, Any] | Any | None = None
    error: str | None = None

    @property
    def timestamp_sec(self) -> float:
        return self.timestamp_ns / 1_000_000_000.0

