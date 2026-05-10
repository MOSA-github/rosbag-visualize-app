from __future__ import annotations

from pathlib import Path
from typing import Any

try:
    import yaml
except Exception:  # pragma: no cover - depends on local environment.
    yaml = None

from .topic_model import BagMetadata, TopicInfo
from .viewer_registry import ViewerRegistry


class MetadataParser:
    """Reads ROS 2 metadata.yaml files and normalizes topic information."""

    def __init__(self) -> None:
        self.registry = ViewerRegistry()

    def parse(self, bag_folder: str | Path) -> BagMetadata:
        if yaml is None:
            raise RuntimeError("PyYAML is required. Install dependencies with: pip install -r requirements.txt")

        bag_path = Path(bag_folder)
        metadata_path = bag_path / "metadata.yaml"
        if not metadata_path.exists():
            raise FileNotFoundError(f"metadata.yaml was not found: {metadata_path}")

        with metadata_path.open("r", encoding="utf-8") as stream:
            raw = yaml.safe_load(stream) or {}

        info = raw.get("rosbag2_bagfile_information", raw)
        topics = self._parse_topics(info)
        duration_ns = self._read_ns(info.get("duration"))
        starting_time_ns = self._read_ns(info.get("starting_time"), "nanoseconds_since_epoch")

        return BagMetadata(
            bag_path=bag_path,
            metadata_path=metadata_path,
            storage_identifier=str(info.get("storage_identifier", "sqlite3")),
            duration_ns=duration_ns,
            starting_time_ns=starting_time_ns,
            message_count=int(info.get("message_count") or 0),
            relative_file_paths=list(info.get("relative_file_paths") or []),
            topics=topics,
            raw=raw,
        )

    def _parse_topics(self, info: dict[str, Any]) -> list[TopicInfo]:
        topics: list[TopicInfo] = []
        for entry in info.get("topics_with_message_count", []) or []:
            topic_metadata = entry.get("topic_metadata", {}) or {}
            type_name = str(topic_metadata.get("type", ""))
            viewer_id = self.registry.recommend_for_type(type_name)
            topics.append(
                TopicInfo(
                    name=str(topic_metadata.get("name", "")),
                    type=type_name,
                    message_count=int(entry.get("message_count") or 0),
                    serialization_format=str(topic_metadata.get("serialization_format", "")),
                    offered_qos_profiles=str(topic_metadata.get("offered_qos_profiles", "")),
                    recommended_view=viewer_id,
                )
            )
        return topics

    def _read_ns(self, value: Any, key: str = "nanoseconds") -> int:
        if isinstance(value, dict):
            return int(value.get(key) or value.get("nanoseconds") or 0)
        if isinstance(value, (int, float)):
            return int(value)
        return 0
