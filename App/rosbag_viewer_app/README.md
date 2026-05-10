# ROS 2 Rosbag Visualizer

ROS 2 の rosbag2 ディレクトリを読み込み、`metadata.yaml` の Topic type を中心に Viewer を自動判定して表示する PySide6 デスクトップアプリです。

## 対応している rosbag 形式

- ROS 2 rosbag2
- `metadata.yaml` + SQLite3 `.db3`
- `serialization_format: cdr`

## 必要な環境

- Python 3.10 以上
- ROS 2 Humble 以降を想定
- PySide6 / matplotlib / numpy / OpenCV / PyYAML
- ROS 2 の `rclpy`, `rosidl_runtime_py`, `rosbag2_py`

ROS 2 Python パッケージが無い環境でも `metadata.yaml` の読み込みと Topic 一覧表示は動きます。メッセージのデシリアライズは ROS 2 環境が必要です。SQLite3 の `.db3` は高速な Topic 単位読み込みのため `sqlite3` で直接読み、SQLite 以外の storage や `.db3` が見つからないケースでは `rosbag2_py.SequentialReader` に fallback します。

## インストール

```bash
cd App/rosbag_viewer_app
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell の場合:

```powershell
cd App\rosbag_viewer_app
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

ROS 2 環境では、起動前に ROS 2 の setup を読み込んでください。

```bash
source /opt/ros/humble/setup.bash
```

## 起動

```bash
python main.py
```

起動後、`rosbagフォルダを選択` から rosbag ディレクトリを選びます。

## 使い方

1. rosbag フォルダを選択
2. `metadata.yaml` から Topic 一覧を表示
3. Topic をクリック
4. `.db3` から選択 Topic の message を読み込み
5. type またはフィールド構造から Viewer を自動選択
6. 必要に応じて Viewer ComboBox から手動切り替え

画面右側には再生、停止、前後フレーム、時刻スライダー、timestamp 一覧があります。

## 対応メッセージ型

主な自動判定:

- `std_msgs/msg/Int*`, `UInt*`, `Float*`: Time Series
- `std_msgs/msg/Bool`: ON/OFF Timeline
- `std_msgs/msg/String`: Log / Table
- `sensor_msgs/msg/Image`: Image / Video
- `sensor_msgs/msg/CompressedImage`: Image / Video
- `sensor_msgs/msg/LaserScan`: 2D Scan
- `sensor_msgs/msg/Imu`: Time Series
- `sensor_msgs/msg/JointState`: Joint Plot
- `nav_msgs/msg/Odometry`: Trajectory
- `nav_msgs/msg/Path`: Path
- `geometry_msgs/msg/Pose*`: Pose / Trajectory
- `geometry_msgs/msg/Twist*`: Twist Graph
- `tf2_msgs/msg/TFMessage`: Table fallback
- `diagnostic_msgs/msg/DiagnosticArray`: Table

PointCloud2 は MVP では Tree/Raw fallback です。Viewer 追加用の registry と BaseViewer は分離しているため、3D Viewer を後から差し替えやすい構造です。

## Viewer 判定ロジック

1. `topic_metadata.type` の完全一致を `VIEWER_REGISTRY` で判定
2. 標準 ROS メッセージ prefix で分類
3. 未知 type は、デシリアライズ後のフィールド構造を推定
4. 推定不能なら Raw / JSON または Tree
5. UI の Viewer ComboBox で手動切り替え可能

Topic 名は判定の主情報には使いません。

## 未対応型の扱い

- ROS 2 型が環境に存在しない場合、serialized CDR bytes のプレビューを Raw 表示します。
- デシリアライズ失敗時もアプリは落ちず、エラーと raw preview を表示します。
- ネストが深いメッセージは Tree / JSON で確認できます。

## サンプルデータ

`sample_rosbag/metadata.yaml` は metadata 読み込みテスト用のダミーデータです。`.db3` は含まないため、Topic 選択時には DB 不在エラーが表示されます。

## 今後の拡張案

- `sensor_msgs/msg/PointCloud2` の OpenGL/pyqtgraph 3D 表示
- TF tree のグラフ表示
- 複数 Topic の時刻同期再生
- 表示範囲ごとの遅延読み込み
- custom message 定義ファイルからのフィールド推定強化
- CSV / PNG / MP4 export
