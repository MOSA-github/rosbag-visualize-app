from __future__ import annotations

from pathlib import Path
from typing import Type

from PySide6.QtCore import QObject, QThread, QTimer, Qt, Signal, Slot
from PySide6.QtWidgets import (
    QApplication,
    QAbstractItemView,
    QComboBox,
    QFileDialog,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSlider,
    QSplitter,
    QStyle,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QToolButton,
    QVBoxLayout,
    QWidget,
)

from .bag_loader import BagLoader
from .metadata_parser import MetadataParser
from .topic_model import BagMetadata, MessageRecord, TopicInfo
from .viewer_registry import MANUAL_VIEW_MODES, ViewerRegistry
from .viewers.base_viewer import BaseViewer
from .viewers.image_viewer import ImageViewer, VideoViewer
from .viewers.laserscan_viewer import LaserScanViewer
from .viewers.odometry_viewer import OdometryViewer
from .viewers.raw_viewer import RawViewer
from .viewers.table_viewer import TableViewer
from .viewers.timeseries_viewer import TimeseriesViewer
from .viewers.tree_viewer import TreeViewer


VIEWER_CLASSES: dict[str, Type[BaseViewer]] = {
    "timeseries": TimeseriesViewer,
    "state_timeline": TimeseriesViewer,
    "imu_viewer": TimeseriesViewer,
    "joint_state_viewer": TimeseriesViewer,
    "twist_viewer": TimeseriesViewer,
    "log_table": TableViewer,
    "table_viewer": TableViewer,
    "diagnostic_viewer": TableViewer,
    "tf_viewer": TableViewer,
    "image_viewer": ImageViewer,
    "video_viewer": VideoViewer,
    "odometry_viewer": OdometryViewer,
    "path_viewer": OdometryViewer,
    "pose_viewer": OdometryViewer,
    "laserscan_viewer": LaserScanViewer,
    "tree_viewer": TreeViewer,
    "pointcloud_viewer": TreeViewer,
    "raw_viewer": RawViewer,
}


class MessageLoadWorker(QObject):
    finished = Signal(object, str)
    failed = Signal(str)

    def __init__(self, metadata: BagMetadata, topic: TopicInfo, limit: int) -> None:
        super().__init__()
        self.metadata = metadata
        self.topic = topic
        self.limit = limit

    @Slot()
    def run(self) -> None:
        try:
            loader = BagLoader(self.metadata)
            records = loader.load_topic_messages(self.topic, limit=self.limit)
            warning = ""
            errors = [record.error for record in records if record.error]
            if errors:
                unique_errors = list(dict.fromkeys(errors))
                warning = "\n".join(unique_errors[:3])
            self.finished.emit(records, warning)
        except Exception as exc:
            self.failed.emit(str(exc))


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("ROS 2 Rosbag Visualizer")
        self.resize(1500, 920)

        self.parser = MetadataParser()
        self.registry = ViewerRegistry()
        self.metadata: BagMetadata | None = None
        self.topics: list[TopicInfo] = []
        self.current_topic: TopicInfo | None = None
        self.current_messages: list[MessageRecord] = []
        self.current_viewer: BaseViewer | None = None
        self.load_thread: QThread | None = None
        self.load_worker: MessageLoadWorker | None = None

        self.play_timer = QTimer(self)
        self.play_timer.setInterval(120)
        self.play_timer.timeout.connect(self._advance_frame)

        self._build_ui()
        self.statusBar().showMessage("rosbagフォルダを選択してください。")

    def _build_ui(self) -> None:
        central = QWidget()
        root = QHBoxLayout(central)
        self.setCentralWidget(central)

        splitter = QSplitter(Qt.Horizontal)
        root.addWidget(splitter)

        left = QWidget()
        left_layout = QVBoxLayout(left)
        self.open_button = QPushButton("rosbagフォルダを選択")
        self.open_button.clicked.connect(self.open_bag_folder)
        left_layout.addWidget(self.open_button)

        self.info_label = QLabel("No rosbag loaded.")
        self.info_label.setWordWrap(True)
        left_layout.addWidget(self.info_label)

        self.topic_table = QTableWidget(0, 5)
        self.topic_table.setHorizontalHeaderLabels(
            ["Topic", "Type", "Count", "Serialization", "Recommended View"]
        )
        self.topic_table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.topic_table.setSelectionMode(QAbstractItemView.SingleSelection)
        self.topic_table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.topic_table.verticalHeader().setVisible(False)
        self.topic_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.topic_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeToContents)
        self.topic_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.topic_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self.topic_table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeToContents)
        self.topic_table.itemSelectionChanged.connect(self._topic_selection_changed)
        left_layout.addWidget(self.topic_table, 1)

        right = QWidget()
        right_layout = QVBoxLayout(right)
        detail_group = QGroupBox("選択Topicの詳細")
        detail_layout = QVBoxLayout(detail_group)
        self.detail_text = QTextEdit()
        self.detail_text.setReadOnly(True)
        self.detail_text.setMaximumHeight(150)
        detail_layout.addWidget(self.detail_text)
        right_layout.addWidget(detail_group)

        toolbar = QHBoxLayout()
        self.viewer_combo = QComboBox()
        for label, viewer_id in MANUAL_VIEW_MODES:
            self.viewer_combo.addItem(label, viewer_id)
        self.viewer_combo.currentIndexChanged.connect(self._viewer_mode_changed)
        toolbar.addWidget(QLabel("Viewer"))
        toolbar.addWidget(self.viewer_combo)
        toolbar.addStretch(1)
        right_layout.addLayout(toolbar)

        playback_group = QGroupBox("再生 / 時刻")
        playback_layout = QHBoxLayout(playback_group)
        icons = QStyle.StandardPixmap
        self.prev_button = self._tool_button(icons.SP_MediaSkipBackward, "前フレーム", self._previous_frame)
        self.play_button = self._tool_button(icons.SP_MediaPlay, "再生", self._start_playback)
        self.stop_button = self._tool_button(icons.SP_MediaStop, "停止", self._stop_playback)
        self.next_button = self._tool_button(icons.SP_MediaSkipForward, "次フレーム", self._next_frame)
        self.time_slider = QSlider(Qt.Horizontal)
        self.time_slider.setEnabled(False)
        self.time_slider.valueChanged.connect(self._slider_changed)
        self.time_label = QLabel("time: -")
        playback_layout.addWidget(self.prev_button)
        playback_layout.addWidget(self.play_button)
        playback_layout.addWidget(self.stop_button)
        playback_layout.addWidget(self.next_button)
        playback_layout.addWidget(self.time_slider, 1)
        playback_layout.addWidget(self.time_label)
        right_layout.addWidget(playback_group)

        viewer_splitter = QSplitter(Qt.Horizontal)
        self.viewer_host = QWidget()
        self.viewer_layout = QVBoxLayout(self.viewer_host)
        self.viewer_layout.setContentsMargins(0, 0, 0, 0)
        self.timestamp_list = QListWidget()
        self.timestamp_list.setMaximumWidth(250)
        self.timestamp_list.currentRowChanged.connect(self._timestamp_row_changed)
        viewer_splitter.addWidget(self.viewer_host)
        viewer_splitter.addWidget(self.timestamp_list)
        viewer_splitter.setStretchFactor(0, 1)
        right_layout.addWidget(viewer_splitter, 1)

        splitter.addWidget(left)
        splitter.addWidget(right)
        splitter.setStretchFactor(0, 2)
        splitter.setStretchFactor(1, 3)

        self._set_playback_enabled(False)
        self._install_viewer(RawViewer())

    def _tool_button(self, icon_id: QStyle.StandardPixmap, tip: str, slot) -> QToolButton:
        button = QToolButton()
        button.setIcon(self.style().standardIcon(icon_id))
        button.setToolTip(tip)
        button.clicked.connect(slot)
        return button

    @Slot()
    def open_bag_folder(self) -> None:
        folder = QFileDialog.getExistingDirectory(self, "rosbagフォルダを選択")
        if folder:
            self.load_bag_folder(Path(folder))

    def load_bag_folder(self, folder: Path) -> None:
        try:
            self.metadata = self.parser.parse(folder)
        except Exception as exc:
            QMessageBox.critical(self, "metadata.yamlを読み込めません", str(exc))
            self.statusBar().showMessage(str(exc))
            return

        self.topics = self.metadata.topics
        self.current_topic = None
        self.current_messages = []
        self._populate_topics()
        self._update_bag_info()
        self._set_detail("Topicを選択してください。")
        self.statusBar().showMessage(f"Loaded metadata: {self.metadata.metadata_path}")

    def _populate_topics(self) -> None:
        self.topic_table.blockSignals(True)
        self.topic_table.setRowCount(len(self.topics))
        for row, topic in enumerate(self.topics):
            values = [
                topic.name,
                topic.type,
                str(topic.message_count),
                topic.serialization_format,
                self.registry.label_for(topic.recommended_view),
            ]
            for column, value in enumerate(values):
                item = QTableWidgetItem(value)
                if column == 2:
                    item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
                self.topic_table.setItem(row, column, item)
        self.topic_table.blockSignals(False)
        self.topic_table.resizeRowsToContents()

    def _update_bag_info(self) -> None:
        if self.metadata is None:
            self.info_label.setText("No rosbag loaded.")
            return
        db_status = ", ".join(path.name for path in BagLoader(self.metadata).db_paths()) or "db3 not found"
        self.info_label.setText(
            f"Path: {self.metadata.bag_path}\n"
            f"Storage: {self.metadata.storage_identifier}\n"
            f"Messages: {self.metadata.message_count}\n"
            f"Duration: {self.metadata.duration_ns / 1_000_000_000.0:.3f} s\n"
            f"DB: {db_status}"
        )

    @Slot()
    def _topic_selection_changed(self) -> None:
        selected = self.topic_table.selectionModel().selectedRows()
        if not selected or self.metadata is None:
            return
        row = selected[0].row()
        if row < 0 or row >= len(self.topics):
            return
        self.current_topic = self.topics[row]
        self.current_messages = []
        self._set_playback_enabled(False)
        self._set_detail(self._topic_detail(self.current_topic, loading=True))
        self._start_loading_topic(self.current_topic)

    def _start_loading_topic(self, topic: TopicInfo) -> None:
        if self.metadata is None:
            return
        if self.load_thread and self.load_thread.isRunning():
            self.load_thread.quit()
            self.load_thread.wait(1000)

        limit = self._message_limit(topic)
        self.statusBar().showMessage(f"Loading {topic.name} ({limit} messages max)...")
        self.topic_table.setEnabled(False)
        self.open_button.setEnabled(False)

        self.load_thread = QThread(self)
        self.load_worker = MessageLoadWorker(self.metadata, topic, limit)
        self.load_worker.moveToThread(self.load_thread)
        self.load_thread.started.connect(self.load_worker.run)
        self.load_worker.finished.connect(self._topic_loaded)
        self.load_worker.failed.connect(self._topic_load_failed)
        self.load_worker.finished.connect(self.load_thread.quit)
        self.load_worker.failed.connect(self.load_thread.quit)
        self.load_worker.finished.connect(self.load_worker.deleteLater)
        self.load_worker.failed.connect(self.load_worker.deleteLater)
        self.load_thread.finished.connect(self.load_thread.deleteLater)
        self.load_thread.finished.connect(self._load_thread_finished)
        self.load_thread.start()

    @Slot()
    def _load_thread_finished(self) -> None:
        self.load_thread = None
        self.load_worker = None

    @Slot(object, str)
    def _topic_loaded(self, records: list[MessageRecord], warning: str) -> None:
        self.topic_table.setEnabled(True)
        self.open_button.setEnabled(True)
        self.current_messages = records
        self._populate_timestamps()
        self._set_playback_enabled(bool(records))
        self._create_viewer_from_selection()
        detail = self._topic_detail(self.current_topic, loaded_count=len(records), warning=warning)
        self._set_detail(detail)
        self.statusBar().showMessage(f"Loaded {len(records)} messages.")

    @Slot(str)
    def _topic_load_failed(self, error: str) -> None:
        self.topic_table.setEnabled(True)
        self.open_button.setEnabled(True)
        self.current_messages = []
        self._populate_timestamps()
        self._set_playback_enabled(False)
        self._install_viewer(RawViewer())
        self._set_detail(self._topic_detail(self.current_topic, warning=error))
        self.statusBar().showMessage(error)

    def _message_limit(self, topic: TopicInfo) -> int:
        viewer_id = self.registry.recommend_for_type(topic.type)
        if viewer_id in {"image_viewer", "video_viewer", "pointcloud_viewer"}:
            return 350
        if viewer_id == "laserscan_viewer":
            return 800
        return 3000

    @Slot()
    def _viewer_mode_changed(self) -> None:
        if self.current_topic and self.current_messages:
            self._create_viewer_from_selection()

    def _create_viewer_from_selection(self) -> None:
        if self.current_topic is None:
            return
        manual = self.viewer_combo.currentData()
        viewer_id = self.registry.select_viewer(self.current_topic, self.current_messages, manual)
        viewer_class = VIEWER_CLASSES.get(viewer_id, RawViewer)
        viewer = viewer_class()
        viewer.set_messages(self.current_messages, self.current_topic)
        viewer.set_index(self.time_slider.value() if self.current_messages else 0)
        self._install_viewer(viewer)
        self.statusBar().showMessage(f"Viewer: {self.registry.label_for(viewer_id)}")

    def _install_viewer(self, viewer: BaseViewer) -> None:
        if self.current_viewer is not None:
            self.viewer_layout.removeWidget(self.current_viewer)
            self.current_viewer.deleteLater()
        self.current_viewer = viewer
        self.viewer_layout.addWidget(viewer)

    def _populate_timestamps(self) -> None:
        self.timestamp_list.blockSignals(True)
        self.timestamp_list.clear()
        if not self.current_messages:
            self.time_slider.setRange(0, 0)
        else:
            start = self.current_messages[0].timestamp_ns
            for index, record in enumerate(self.current_messages):
                relative = (record.timestamp_ns - start) / 1_000_000_000.0
                self.timestamp_list.addItem(f"{index:04d}  {relative:.6f}s")
            self.time_slider.setRange(0, len(self.current_messages) - 1)
            self.time_slider.setValue(0)
            self.timestamp_list.setCurrentRow(0)
        self.timestamp_list.blockSignals(False)
        self._update_time_label(0)

    def _set_playback_enabled(self, enabled: bool) -> None:
        for widget in [self.prev_button, self.play_button, self.stop_button, self.next_button, self.time_slider]:
            widget.setEnabled(enabled)

    @Slot()
    def _start_playback(self) -> None:
        if self.current_messages:
            self.play_timer.start()

    @Slot()
    def _stop_playback(self) -> None:
        self.play_timer.stop()

    @Slot()
    def _previous_frame(self) -> None:
        self._set_frame(self.time_slider.value() - 1)

    @Slot()
    def _next_frame(self) -> None:
        self._set_frame(self.time_slider.value() + 1)

    @Slot()
    def _advance_frame(self) -> None:
        if not self.current_messages:
            self.play_timer.stop()
            return
        next_index = self.time_slider.value() + 1
        if next_index >= len(self.current_messages):
            self.play_timer.stop()
            return
        self._set_frame(next_index)

    @Slot(int)
    def _slider_changed(self, index: int) -> None:
        self._set_frame(index, from_slider=True)

    @Slot(int)
    def _timestamp_row_changed(self, row: int) -> None:
        if row >= 0:
            self._set_frame(row)

    def _set_frame(self, index: int, from_slider: bool = False) -> None:
        if not self.current_messages:
            return
        index = max(0, min(index, len(self.current_messages) - 1))
        if not from_slider:
            self.time_slider.blockSignals(True)
            self.time_slider.setValue(index)
            self.time_slider.blockSignals(False)
        self.timestamp_list.blockSignals(True)
        self.timestamp_list.setCurrentRow(index)
        self.timestamp_list.blockSignals(False)
        if self.current_viewer is not None:
            self.current_viewer.set_index(index)
        self._update_time_label(index)

    def _update_time_label(self, index: int) -> None:
        if not self.current_messages:
            self.time_label.setText("time: -")
            return
        index = max(0, min(index, len(self.current_messages) - 1))
        start = self.current_messages[0].timestamp_ns
        record = self.current_messages[index]
        relative = (record.timestamp_ns - start) / 1_000_000_000.0
        self.time_label.setText(f"time: {relative:.6f}s ({record.timestamp_ns} ns)")

    def _topic_detail(
        self,
        topic: TopicInfo | None,
        loading: bool = False,
        loaded_count: int | None = None,
        warning: str = "",
    ) -> str:
        if topic is None:
            return "Topicを選択してください。"
        recommended = self.registry.label_for(topic.recommended_view)
        lines = [
            f"Topic: {topic.name}",
            f"Type: {topic.type}",
            f"Message Count (metadata): {topic.message_count}",
            f"Serialization: {topic.serialization_format}",
            f"Recommended View: {recommended}",
        ]
        if loading:
            lines.append("Loading messages...")
        if loaded_count is not None:
            lines.append(f"Loaded Messages: {loaded_count}")
        if warning:
            lines.append("")
            lines.append("Warning:")
            lines.append(warning)
        return "\n".join(lines)

    def _set_detail(self, text: str) -> None:
        self.detail_text.setPlainText(text)


def main() -> int:
    app = QApplication([])
    window = MainWindow()
    window.show()
    return app.exec()
