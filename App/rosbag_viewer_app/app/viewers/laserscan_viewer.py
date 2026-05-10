from __future__ import annotations

import math

import numpy as np
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from PySide6.QtWidgets import QWidget

from .base_viewer import BaseViewer
from .value_utils import first_value, record_value, sequence


class LaserScanViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.figure = Figure(figsize=(6, 4), tight_layout=True)
        self.canvas = FigureCanvas(self.figure)
        self.layout.addWidget(self.canvas)

    def render_current(self) -> None:
        self.figure.clear()
        axes = self.figure.add_subplot(111)
        record = self.current_record()
        if record is None:
            axes.text(0.5, 0.5, "No LaserScan messages", ha="center", va="center")
            self.canvas.draw_idle()
            return

        value = record_value(record)
        ranges = np.asarray(sequence(first_value(value, ["ranges"], [])), dtype=float)
        angle_min = float(first_value(value, ["angle_min"], 0.0) or 0.0)
        angle_increment = float(first_value(value, ["angle_increment"], 0.0) or 0.0)

        if ranges.size == 0 or angle_increment == 0.0:
            axes.text(0.5, 0.5, "No ranges/angle_increment found", ha="center", va="center")
        else:
            angles = angle_min + np.arange(ranges.size) * angle_increment
            valid = np.isfinite(ranges) & (ranges > 0.0)
            xs = ranges[valid] * np.cos(angles[valid])
            ys = ranges[valid] * np.sin(angles[valid])
            axes.scatter(xs, ys, s=3)
            axes.scatter([0], [0], s=30, color="tab:red")
            axes.set_aspect("equal", adjustable="datalim")
            axes.set_xlabel("x [m]")
            axes.set_ylabel("y [m]")
            axes.set_title(f"LaserScan frame {self.current_index + 1}/{len(self.records)}")
            axes.grid(True, alpha=0.3)
            if xs.size:
                radius = max(float(np.max(np.abs(xs))), float(np.max(np.abs(ys))), 1.0)
                radius = math.ceil(radius)
                axes.set_xlim(-radius, radius)
                axes.set_ylim(-radius, radius)
        self.canvas.draw_idle()

