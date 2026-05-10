from __future__ import annotations

import math
import sqlite3
from pathlib import Path

from .message_deserializer import MessageDeserializer
from .topic_model import BagMetadata, MessageRecord, TopicInfo

try:
    import rosbag2_py
except Exception:  # pragma: no cover - depends on ROS 2 environment.
    rosbag2_py = None


class BagLoader:
    """Loads selected-topic messages from ROS 2 sqlite3/db3 bag files."""

    def __init__(self, metadata: BagMetadata) -> None:
        self.metadata = metadata
        self.deserializer = MessageDeserializer()

    def db_paths(self) -> list[Path]:
        candidates: list[Path] = []
        for relative in self.metadata.relative_file_paths:
            candidates.append(self.metadata.bag_path / relative)
        for file_entry in self.metadata.raw.get("rosbag2_bagfile_information", {}).get("files", []) or []:
            path = file_entry.get("path")
            if path:
                candidates.append(self.metadata.bag_path / path)
        if not candidates:
            candidates.extend(sorted(self.metadata.bag_path.glob("*.db3")))

        seen: set[Path] = set()
        existing: list[Path] = []
        for candidate in candidates:
            resolved = candidate.resolve()
            if resolved.exists() and resolved not in seen:
                seen.add(resolved)
                existing.append(resolved)
        return existing

    def load_topic_messages(
        self,
        topic: TopicInfo,
        limit: int = 3000,
        deserialize: bool = True,
    ) -> list[MessageRecord]:
        rows = self._load_serialized_rows(topic, limit)
        records: list[MessageRecord] = []
        for timestamp_ns, payload in rows:
            if deserialize:
                records.append(self.deserializer.deserialize(topic.type, timestamp_ns, payload))
            else:
                records.append(MessageRecord(timestamp_ns=timestamp_ns, raw_data=payload))

        return sorted(records, key=lambda item: item.timestamp_ns)

    def _load_serialized_rows(self, topic: TopicInfo, limit: int) -> list[tuple[int, bytes]]:
        if self.metadata.storage_identifier != "sqlite3" and rosbag2_py is not None:
            return self._read_rows_with_rosbag2_py(topic, limit)

        db_paths = self.db_paths()
        if not db_paths:
            if rosbag2_py is not None:
                return self._read_rows_with_rosbag2_py(topic, limit)
            raise FileNotFoundError("No .db3 file was found in the selected rosbag folder.")

        rows: list[tuple[int, bytes]] = []
        remaining = max(1, limit)
        for db_path in db_paths:
            if remaining <= 0:
                break
            db_rows = self._read_rows(db_path, topic.name, topic.message_count, remaining)
            rows.extend(db_rows)
            remaining = limit - len(rows)
        return rows

    def _read_rows_with_rosbag2_py(self, topic: TopicInfo, limit: int) -> list[tuple[int, bytes]]:
        if rosbag2_py is None:
            raise RuntimeError("rosbag2_py is not available in this Python environment.")

        storage_options = rosbag2_py.StorageOptions(
            uri=str(self.metadata.bag_path),
            storage_id=self.metadata.storage_identifier or "sqlite3",
        )
        serialization_format = topic.serialization_format or "cdr"
        converter_options = rosbag2_py.ConverterOptions(
            input_serialization_format=serialization_format,
            output_serialization_format=serialization_format,
        )
        reader = rosbag2_py.SequentialReader()
        reader.open(storage_options, converter_options)
        try:
            reader.set_filter(rosbag2_py.StorageFilter(topics=[topic.name]))
        except Exception:
            pass

        rows: list[tuple[int, bytes]] = []
        while reader.has_next() and len(rows) < limit:
            name, payload, timestamp_ns = reader.read_next()
            if name == topic.name:
                rows.append((int(timestamp_ns), bytes(payload)))
        return rows

    def _read_rows(
        self,
        db_path: Path,
        topic_name: str,
        declared_count: int,
        limit: int,
    ) -> list[tuple[int, bytes]]:
        with sqlite3.connect(str(db_path)) as connection:
            connection.row_factory = sqlite3.Row
            topic_row = connection.execute(
                "SELECT id FROM topics WHERE name = ? LIMIT 1",
                (topic_name,),
            ).fetchone()
            if topic_row is None:
                return []

            topic_id = int(topic_row["id"])
            actual_count = self._count_messages(connection, topic_id)
            count = actual_count or declared_count
            stride = max(1, math.ceil(count / max(1, limit)))

            if stride <= 1:
                rows = connection.execute(
                    "SELECT timestamp, data FROM messages WHERE topic_id = ? ORDER BY timestamp LIMIT ?",
                    (topic_id, limit),
                ).fetchall()
            else:
                rows = connection.execute(
                    """
                    SELECT timestamp, data
                    FROM messages
                    WHERE topic_id = ? AND (id % ?) = 0
                    ORDER BY timestamp
                    LIMIT ?
                    """,
                    (topic_id, stride, limit),
                ).fetchall()

        return [(int(row["timestamp"]), bytes(row["data"])) for row in rows]

    def _count_messages(self, connection: sqlite3.Connection, topic_id: int) -> int:
        row = connection.execute(
            "SELECT COUNT(*) AS count FROM messages WHERE topic_id = ?",
            (topic_id,),
        ).fetchone()
        return int(row["count"]) if row else 0
