from __future__ import annotations

from array import array
from pathlib import Path

import numpy as np
from PySide6.QtCore import Qt
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtWidgets import QFileDialog, QLabel, QPushButton, QWidget

from .base_viewer import BaseViewer
from .value_utils import first_value, get_value, record_value

try:
    import cv2
except Exception:  # pragma: no cover - optional dependency at import time.
    cv2 = None


class ImageViewer(BaseViewer):
    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.empty_label.hide()
        self.image_label = QLabel("No image")
        self.image_label.setAlignment(Qt.AlignCenter)
        self.image_label.setMinimumHeight(280)
        self.image_label.setStyleSheet("QLabel { background: #111; color: #ddd; }")
        self.save_button = QPushButton("画像保存")
        self.save_button.clicked.connect(self.save_current_image)
        self._current_image: QImage | None = None
        self.layout.addWidget(self.image_label, 1)
        self.layout.addWidget(self.save_button)

    def render_current(self) -> None:
        record = self.current_record()
        if record is None:
            self.image_label.setText("No image messages")
            self._current_image = None
            return
        try:
            image = decode_image_record(record)
        except Exception as exc:
            self.image_label.setText(f"画像を復元できません: {exc}")
            self._current_image = None
            return

        self._current_image = image
        self._update_pixmap()

    def resizeEvent(self, event) -> None:  # noqa: N802 - Qt override
        super().resizeEvent(event)
        self._update_pixmap()

    def save_current_image(self) -> None:
        if self._current_image is None:
            return
        path, _ = QFileDialog.getSaveFileName(self, "画像保存", "frame.png", "PNG (*.png);;JPEG (*.jpg)")
        if path:
            self._current_image.save(path)

    def export(self, path: str | Path) -> None:
        if self._current_image is not None:
            self._current_image.save(str(path))

    def _update_pixmap(self) -> None:
        if self._current_image is None:
            return
        pixmap = QPixmap.fromImage(self._current_image)
        self.image_label.setPixmap(
            pixmap.scaled(self.image_label.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
        )


class VideoViewer(ImageViewer):
    """Image viewer used with the shared playback controls."""


def decode_image_record(record) -> QImage:
    value = record_value(record)
    if _has_field(value, "format") and _has_field(value, "data") and not _has_field(value, "height"):
        return _decode_compressed(value)
    return _decode_raw_image(value)


def _decode_compressed(value) -> QImage:
    if cv2 is None:
        raise RuntimeError("OpenCV is not installed.")
    payload = _bytes_from(first_value(value, ["data"], b""))
    if not payload:
        raise ValueError("CompressedImage.data is empty.")
    buffer = np.frombuffer(payload, dtype=np.uint8)
    image = cv2.imdecode(buffer, cv2.IMREAD_UNCHANGED)
    if image is None:
        raise ValueError("OpenCV could not decode the image payload.")
    if image.ndim == 2:
        rgb = image
    elif image.shape[2] == 3:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    elif image.shape[2] == 4:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGRA2RGBA)
    else:
        raise ValueError(f"Unsupported decoded image shape: {image.shape}")
    return _qimage_from_array(rgb)


def _decode_raw_image(value) -> QImage:
    height = int(first_value(value, ["height"], 0) or 0)
    width = int(first_value(value, ["width"], 0) or 0)
    encoding = str(first_value(value, ["encoding"], "") or "").lower()
    step = int(first_value(value, ["step"], 0) or 0)
    payload = _bytes_from(first_value(value, ["data"], b""))
    if height <= 0 or width <= 0 or not payload:
        raise ValueError("Image height, width, or data is empty.")

    channels = {
        "mono8": 1,
        "rgb8": 3,
        "bgr8": 3,
        "rgba8": 4,
        "bgra8": 4,
    }.get(encoding)
    if channels is None:
        raise ValueError(f"Unsupported encoding: {encoding}")

    row_bytes = step or width * channels
    expected = height * row_bytes
    if len(payload) < expected:
        raise ValueError(f"Image data is shorter than expected: {len(payload)} < {expected}")

    flat = np.frombuffer(payload[:expected], dtype=np.uint8)
    rows = flat.reshape((height, row_bytes))
    cropped = rows[:, : width * channels]
    if channels == 1:
        image = cropped.reshape((height, width))
    else:
        image = cropped.reshape((height, width, channels))

    if encoding == "bgr8":
        image = image[:, :, ::-1]
    elif encoding == "bgra8":
        image = image[:, :, [2, 1, 0, 3]]
    return _qimage_from_array(np.ascontiguousarray(image))


def _qimage_from_array(image: np.ndarray) -> QImage:
    if image.ndim == 2:
        height, width = image.shape
        qimage = QImage(image.data, width, height, width, QImage.Format_Grayscale8)
    elif image.ndim == 3 and image.shape[2] == 3:
        height, width, _ = image.shape
        qimage = QImage(image.data, width, height, width * 3, QImage.Format_RGB888)
    elif image.ndim == 3 and image.shape[2] == 4:
        height, width, _ = image.shape
        qimage = QImage(image.data, width, height, width * 4, QImage.Format_RGBA8888)
    else:
        raise ValueError(f"Unsupported image array shape: {image.shape}")
    return qimage.copy()


def _bytes_from(value) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, bytearray):
        return bytes(value)
    if isinstance(value, array):
        return value.tobytes()
    if isinstance(value, list):
        return bytes(value)
    return bytes(value or b"")


def _has_field(value, name: str) -> bool:
    if isinstance(value, dict):
        return name in value
    return hasattr(value, name) or get_value(value, name, None) is not None

