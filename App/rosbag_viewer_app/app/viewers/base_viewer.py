from __future__ import annotations

from bisect import bisect_left
from pathlib import Path

from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget

from ..topic_model import MessageRecord, TopicInfo


class BaseViewer(QWidget):
    """Common interface for all topic viewers."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.records: list[MessageRecord] = []
        self.topic: TopicInfo | None = None
        self.current_index = 0
        self.layout = QVBoxLayout(self)
        self.empty_label = QLabel("Topicを選択するとここにViewerが表示されます。")
        self.empty_label.setWordWrap(True)
        self.layout.addWidget(self.empty_label)

    def set_messages(self, records: list[MessageRecord], topic: TopicInfo | None = None) -> None:
        self.records = records
        self.topic = topic
        self.current_index = 0
        self.render_current()

    def set_index(self, index: int) -> None:
        if not self.records:
            self.current_index = 0
            self.render_current()
            return
        self.current_index = max(0, min(index, len(self.records) - 1))
        self.render_current()

    def set_time(self, timestamp_ns: int) -> None:
        if not self.records:
            return
        timestamps = [record.timestamp_ns for record in self.records]
        index = bisect_left(timestamps, timestamp_ns)
        if index >= len(timestamps):
            index = len(timestamps) - 1
        elif index > 0 and abs(timestamps[index - 1] - timestamp_ns) < abs(timestamps[index] - timestamp_ns):
            index -= 1
        self.set_index(index)

    def clear(self) -> None:
        self.records = []
        self.current_index = 0
        self.empty_label.setText("表示するデータがありません。")

    def export(self, path: str | Path) -> None:
        raise NotImplementedError("This viewer does not support export yet.")

    def render_current(self) -> None:
        if not self.records:
            self.empty_label.setText("表示するメッセージがありません。")
        else:
            self.empty_label.setText(f"{len(self.records)} messages loaded.")

    def current_record(self) -> MessageRecord | None:
        if not self.records:
            return None
        return self.records[max(0, min(self.current_index, len(self.records) - 1))]

