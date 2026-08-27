// 実ファイル連携前にUIを確認するための仮データ。
export const previewTopics = [
  { id: 'camera-upper-image', name: '/camera/upper/image_raw', type: 'sensor_msgs/msg/Image' },
  { id: 'camera-upper-info', name: '/camera/upper/camera_info', type: 'sensor_msgs/msg/CameraInfo' },
  { id: 'camera-left-image', name: '/camera/left/image_raw', type: 'sensor_msgs/msg/Image' },
  { id: 'camera-left-info', name: '/camera/left/camera_info', type: 'sensor_msgs/msg/CameraInfo' },
  { id: 'camera-right-image', name: '/camera/right/image_raw', type: 'sensor_msgs/msg/Image' },
  { id: 'camera-right-info', name: '/camera/right/camera_info', type: 'sensor_msgs/msg/CameraInfo' },
  { id: 'camera-back-image', name: '/camera/back/image_raw', type: 'sensor_msgs/msg/Image' },
  { id: 'camera-back-info', name: '/camera/back/camera_info', type: 'sensor_msgs/msg/CameraInfo' },
  { id: 'imu-data', name: '/imu/data', type: 'sensor_msgs/msg/Imu' },
  { id: 'joint-states', name: '/joint_states', type: 'sensor_msgs/msg/JointState' },
  { id: 'odom', name: '/odom', type: 'nav_msgs/msg/Odometry' },
  { id: 'scan', name: '/scan', type: 'sensor_msgs/msg/LaserScan' },
  { id: 'tf', name: '/tf', type: 'tf2_msgs/msg/TFMessage' },
  { id: 'tf-static', name: '/tf_static', type: 'tf2_msgs/msg/TFMessage' },
  { id: 'temperature', name: '/temperature', type: 'std_msgs/msg/Float64' },
  { id: 'diagnostics', name: '/diagnostics', type: 'diagnostic_msgs/msg/DiagnosticArray' },
];
