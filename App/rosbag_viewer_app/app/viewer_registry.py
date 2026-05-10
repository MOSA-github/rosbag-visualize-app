from __future__ import annotations

from typing import Any

from .topic_model import TopicInfo
from .viewer_inference import infer_viewer_from_messages


VIEWER_REGISTRY: dict[str, str] = {
    "std_msgs/msg/Int8": "timeseries",
    "std_msgs/msg/Int16": "timeseries",
    "std_msgs/msg/Int32": "timeseries",
    "std_msgs/msg/Int64": "timeseries",
    "std_msgs/msg/UInt8": "timeseries",
    "std_msgs/msg/UInt16": "timeseries",
    "std_msgs/msg/UInt32": "timeseries",
    "std_msgs/msg/UInt64": "timeseries",
    "std_msgs/msg/Float32": "timeseries",
    "std_msgs/msg/Float64": "timeseries",
    "std_msgs/msg/Bool": "state_timeline",
    "std_msgs/msg/String": "log_table",
    "sensor_msgs/msg/Image": "image_viewer",
    "sensor_msgs/msg/CompressedImage": "image_viewer",
    "sensor_msgs/msg/PointCloud2": "pointcloud_viewer",
    "sensor_msgs/msg/LaserScan": "laserscan_viewer",
    "sensor_msgs/msg/Imu": "imu_viewer",
    "sensor_msgs/msg/JointState": "joint_state_viewer",
    "nav_msgs/msg/Odometry": "odometry_viewer",
    "nav_msgs/msg/Path": "path_viewer",
    "geometry_msgs/msg/Twist": "twist_viewer",
    "geometry_msgs/msg/TwistStamped": "twist_viewer",
    "geometry_msgs/msg/Pose": "pose_viewer",
    "geometry_msgs/msg/PoseStamped": "pose_viewer",
    "geometry_msgs/msg/PoseWithCovarianceStamped": "pose_viewer",
    "tf2_msgs/msg/TFMessage": "tf_viewer",
    "diagnostic_msgs/msg/DiagnosticArray": "diagnostic_viewer",
}

STANDARD_TYPE_PREFIXES = {
    "std_msgs/msg/": "table_viewer",
    "builtin_interfaces/msg/": "table_viewer",
    "sensor_msgs/msg/": "tree_viewer",
    "geometry_msgs/msg/": "tree_viewer",
    "nav_msgs/msg/": "tree_viewer",
    "tf2_msgs/msg/": "tf_viewer",
    "diagnostic_msgs/msg/": "diagnostic_viewer",
}

VIEWER_LABELS: dict[str, str] = {
    "timeseries": "Time Series",
    "state_timeline": "ON/OFF Timeline",
    "log_table": "Log / Table",
    "image_viewer": "Image / Video",
    "video_viewer": "Video",
    "pointcloud_viewer": "3D PointCloud",
    "laserscan_viewer": "2D Scan",
    "imu_viewer": "IMU Graph",
    "joint_state_viewer": "Joint Plot",
    "odometry_viewer": "Trajectory",
    "path_viewer": "Path",
    "pose_viewer": "Pose / Trajectory",
    "twist_viewer": "Twist Graph",
    "tf_viewer": "TF Tree / Table",
    "diagnostic_viewer": "Diagnostics",
    "table_viewer": "Table",
    "tree_viewer": "Tree",
    "raw_viewer": "Raw / JSON",
}

MANUAL_VIEW_MODES: list[tuple[str, str]] = [
    ("Auto", "auto"),
    ("Graph", "timeseries"),
    ("Table", "table_viewer"),
    ("Image", "image_viewer"),
    ("Video", "video_viewer"),
    ("Trajectory", "odometry_viewer"),
    ("2D Scan", "laserscan_viewer"),
    ("3D PointCloud", "pointcloud_viewer"),
    ("TF Tree", "tf_viewer"),
    ("Raw / JSON", "raw_viewer"),
]


class ViewerRegistry:
    """Chooses a viewer from a ROS type first, then message structure."""

    def recommend_for_type(self, type_name: str) -> str:
        if type_name in VIEWER_REGISTRY:
            return VIEWER_REGISTRY[type_name]

        for prefix, viewer_id in STANDARD_TYPE_PREFIXES.items():
            if type_name.startswith(prefix):
                return viewer_id

        return "raw_viewer"

    def select_viewer(
        self,
        topic: TopicInfo,
        messages: list[Any] | None = None,
        manual_mode: str = "auto",
    ) -> str:
        if manual_mode != "auto":
            return manual_mode

        type_based = self.recommend_for_type(topic.type)
        if type_based != "raw_viewer":
            return type_based

        inferred = infer_viewer_from_messages(messages or [])
        return inferred or "raw_viewer"

    def label_for(self, viewer_id: str) -> str:
        return VIEWER_LABELS.get(viewer_id, viewer_id)

