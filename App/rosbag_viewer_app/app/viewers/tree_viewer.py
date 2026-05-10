from __future__ import annotations

from collections.abc import Mapping, Sequence

from PySide6.QtWidgets import QTreeWidget, QTreeWidgetItem, QWidget

from .base_viewer import BaseViewer
from .value_utils import record_value, short_text


class TreeViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.tree = QTreeWidget()
        self.tree.setHeaderLabels(["Field", "Value"])
        self.layout.addWidget(self.tree)

    def render_current(self) -> None:
        self.tree.clear()
        record = self.current_record()
        if record is None:
            self.tree.addTopLevelItem(QTreeWidgetItem(["message", "No messages"]))
            return

        root = QTreeWidgetItem(["message", f"timestamp_ns={record.timestamp_ns}"])
        self.tree.addTopLevelItem(root)
        self._add_value(root, record_value(record), depth=0)
        root.setExpanded(True)

    def _add_value(self, parent: QTreeWidgetItem, value, depth: int) -> None:
        if depth > 7:
            parent.addChild(QTreeWidgetItem(["...", "<max depth reached>"]))
            return
        if isinstance(value, Mapping):
            for key, item in value.items():
                child = QTreeWidgetItem([str(key), "" if _is_nested(item) else short_text(item)])
                parent.addChild(child)
                if _is_nested(item):
                    self._add_value(child, item, depth + 1)
            return
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            for index, item in enumerate(list(value)[:80]):
                child = QTreeWidgetItem([f"[{index}]", "" if _is_nested(item) else short_text(item)])
                parent.addChild(child)
                if _is_nested(item):
                    self._add_value(child, item, depth + 1)
            if len(value) > 80:
                parent.addChild(QTreeWidgetItem(["...", f"{len(value) - 80} more items"]))
            return
        if hasattr(value, "get_fields_and_field_types"):
            for field in value.get_fields_and_field_types().keys():
                item = getattr(value, field)
                child = QTreeWidgetItem([field, "" if _is_nested(item) else short_text(item)])
                parent.addChild(child)
                if _is_nested(item):
                    self._add_value(child, item, depth + 1)
            return
        parent.addChild(QTreeWidgetItem(["value", short_text(value)]))


def _is_nested(value) -> bool:
    return isinstance(value, Mapping) or (
        isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray))
    ) or hasattr(value, "get_fields_and_field_types")

