from __future__ import annotations

from collections import defaultdict

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QHBoxLayout, QLabel, QListWidget, QListWidgetItem, QSplitter, QWidget

from .base_viewer import BaseViewer
from .value_utils import flatten_numeric, record_value


class TimeseriesViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.series: dict[str, list[tuple[float, float]]] = {}

        self.splitter = QSplitter(Qt.Horizontal)
        self.field_list = QListWidget()
        self.field_list.setMaximumWidth(280)
        self.field_list.itemChanged.connect(self._plot)
        self.figure = Figure(figsize=(6, 4), tight_layout=True)
        self.canvas = FigureCanvas(self.figure)

        left = QWidget()
        left_layout = QHBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.addWidget(self.field_list)

        self.splitter.addWidget(left)
        self.splitter.addWidget(self.canvas)
        self.splitter.setStretchFactor(1, 1)
        self.layout.addWidget(QLabel("Numeric fields"))
        self.layout.addWidget(self.splitter)

    def set_messages(self, records, topic=None) -> None:
        super().set_messages(records, topic)
        self._build_series()
        self._populate_fields()
        self._plot()

    def render_current(self) -> None:
        return

    def _build_series(self) -> None:
        self.series = defaultdict(list)
        if not self.records:
            return
        start = self.records[0].timestamp_ns
        for record in self.records:
            t = (record.timestamp_ns - start) / 1_000_000_000.0
            numeric = flatten_numeric(record_value(record))
            for key, value in numeric.items():
                self.series[key].append((t, value))

    def _populate_fields(self) -> None:
        self.field_list.blockSignals(True)
        self.field_list.clear()
        for index, key in enumerate(sorted(self.series.keys())):
            item = QListWidgetItem(key)
            item.setFlags(item.flags() | Qt.ItemIsUserCheckable)
            item.setCheckState(Qt.Checked if index < 6 else Qt.Unchecked)
            self.field_list.addItem(item)
        self.field_list.blockSignals(False)

    def _selected_fields(self) -> list[str]:
        fields: list[str] = []
        for index in range(self.field_list.count()):
            item = self.field_list.item(index)
            if item.checkState() == Qt.Checked:
                fields.append(item.text())
        return fields

    def _plot(self) -> None:
        self.figure.clear()
        axes = self.figure.add_subplot(111)
        fields = self._selected_fields()
        if not self.records:
            axes.text(0.5, 0.5, "No messages", ha="center", va="center")
        elif not self.series:
            axes.text(0.5, 0.5, "No numeric fields found", ha="center", va="center")
        elif not fields:
            axes.text(0.5, 0.5, "Select fields to plot", ha="center", va="center")
        else:
            for field in fields:
                points = self.series.get(field, [])
                if not points:
                    continue
                xs, ys = zip(*points)
                if self.topic and self.topic.type == "std_msgs/msg/Bool":
                    axes.step(xs, ys, where="post", label=field)
                    axes.set_yticks([0, 1])
                    axes.set_yticklabels(["False", "True"])
                else:
                    axes.plot(xs, ys, label=field)
            axes.set_xlabel("time [s]")
            axes.set_ylabel("value")
            axes.grid(True, alpha=0.3)
            if fields:
                axes.legend(loc="best", fontsize=8)
        self.canvas.draw_idle()

