from __future__ import annotations

import json

from PySide6.QtWidgets import QTextEdit, QWidget

from .base_viewer import BaseViewer
from .value_utils import record_value


class RawViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.text = QTextEdit()
        self.text.setReadOnly(True)
        self.layout.addWidget(self.text)

    def render_current(self) -> None:
        record = self.current_record()
        if record is None:
            self.text.setPlainText("No messages")
            return
        payload = {
            "timestamp_ns": record.timestamp_ns,
            "error": record.error,
            "data": record_value(record),
        }
        self.text.setPlainText(json.dumps(payload, indent=2, ensure_ascii=False, default=str))

