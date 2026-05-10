from __future__ import annotations

from PySide6.QtWidgets import QTableWidget, QTableWidgetItem, QWidget

from .base_viewer import BaseViewer
from .value_utils import flatten_scalars, record_value, short_text


class TableViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.table = QTableWidget()
        self.table.setAlternatingRowColors(True)
        self.table.setSortingEnabled(True)
        self.layout.addWidget(self.table)

    def set_messages(self, records, topic=None) -> None:
        super().set_messages(records, topic)
        self._populate()

    def render_current(self) -> None:
        return

    def _populate(self) -> None:
        self.table.setSortingEnabled(False)
        self.table.clear()
        rows = self.records[:1000]
        flattened = [flatten_scalars(record_value(record)) for record in rows]
        columns = ["timestamp_ns"]
        for row in flattened[:100]:
            for key in row.keys():
                if key not in columns:
                    columns.append(key)
                if len(columns) > 40:
                    break

        self.table.setColumnCount(len(columns))
        self.table.setHorizontalHeaderLabels(columns)
        self.table.setRowCount(len(rows))
        for row_index, record in enumerate(rows):
            values = {"timestamp_ns": record.timestamp_ns}
            values.update(flattened[row_index])
            for col_index, column in enumerate(columns):
                self.table.setItem(row_index, col_index, QTableWidgetItem(short_text(values.get(column, ""))))
        self.table.resizeColumnsToContents()
        self.table.setSortingEnabled(True)

