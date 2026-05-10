from __future__ import annotations

import math

from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from PySide6.QtWidgets import QWidget

from .base_viewer import BaseViewer
from .value_utils import first_value, get_value, record_value, sequence, yaw_from_quaternion


class OdometryViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.figure = Figure(figsize=(6, 4), tight_layout=True)
        self.canvas = FigureCanvas(self.figure)
        self.layout.addWidget(self.canvas)

    def render_current(self) -> None:
        self.figure.clear()
        axes = self.figure.add_subplot(111)
        if not self.records:
            axes.text(0.5, 0.5, "No trajectory messages", ha="center", va="center")
            self.canvas.draw_idle()
            return

        if self.topic and self.topic.type == "nav_msgs/msg/Path":
            points = self._path_points(record_value(self.current_record()))
            title = "Path"
        else:
            points = [self._pose_point(record_value(record)) for record in self.records[: self.current_index + 1]]
            points = [point for point in points if point is not None]
            title = "Trajectory"

        if not points:
            axes.text(0.5, 0.5, "No pose-like fields found", ha="center", va="center")
        else:
            xs = [point[0] for point in points]
            ys = [point[1] for point in points]
            axes.plot(xs, ys, "-o", markersize=2)
            axes.scatter([xs[-1]], [ys[-1]], s=50, zorder=3)
            yaw = points[-1][2]
            if yaw is not None:
                axes.arrow(
                    xs[-1],
                    ys[-1],
                    0.4 * math.cos(yaw),
                    0.4 * math.sin(yaw),
                    head_width=0.12,
                    color="tab:red",
                    length_includes_head=True,
                )
            axes.set_aspect("equal", adjustable="datalim")
            axes.set_xlabel("x [m]")
            axes.set_ylabel("y [m]")
            axes.grid(True, alpha=0.3)
            axes.set_title(title)
        self.canvas.draw_idle()

    def _path_points(self, value) -> list[tuple[float, float, float | None]]:
        poses = sequence(get_value(value, "poses", []))
        points: list[tuple[float, float, float | None]] = []
        for pose_stamped in poses:
            point = self._pose_point(pose_stamped)
            if point is not None:
                points.append(point)
        return points

    def _pose_point(self, value) -> tuple[float, float, float | None] | None:
        x = first_value(
            value,
            [
                "pose.pose.position.x",
                "pose.position.x",
                "position.x",
                "x",
            ],
        )
        y = first_value(
            value,
            [
                "pose.pose.position.y",
                "pose.position.y",
                "position.y",
                "y",
            ],
        )
        if x is None or y is None:
            return None

        orientation = first_value(
            value,
            [
                "pose.pose.orientation",
                "pose.orientation",
                "orientation",
            ],
        )
        yaw = None
        if orientation is not None:
            qx = float(get_value(orientation, "x", 0.0) or 0.0)
            qy = float(get_value(orientation, "y", 0.0) or 0.0)
            qz = float(get_value(orientation, "z", 0.0) or 0.0)
            qw = float(get_value(orientation, "w", 1.0) or 1.0)
            yaw = yaw_from_quaternion(qx, qy, qz, qw)
        return float(x), float(y), yaw

