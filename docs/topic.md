・/parameter_events
各ノードに対して, パラメータが追加, 変更, 削除されたことを通知するトピックである.
対象のパラメータに関する情報が示される.
ノードとはros内で動く一つのプログラム単位(カメラで撮影, モータを動かすなど)

・/module_1/joint_states, /module_2/joint_states, /module_1/cmd_pos_deg, /module_2/cmd_pos_deg
各ノードに対して, 関節の状態を通知するトピックである. ロボットの各関節の位置, 速度, 力の情報が示される.
以下のメッセージだと, dxl_1, dxl_2, dxl_3, dxl_4の4つの関節があり, nameタグ内の順に対応する形で, position(位置), velocity(速度), effort(力)の情報が示される.

メッセージ例
{
  "header": {
    "stamp": {
      "sec": 43,
      "nanosec": 895000000
    },
    "frameId": ""
  },
  "name": [
    "dxl_1",
    "dxl_2",
    "dxl_3",
    "dxl_4"
  ],
  "position": [
    0.307708740234375,
    0.1318817138671875,
    0.21978759765625,
    0.1318817138671875
  ],
  "velocity": [
    0,
    0,
    0,
    0
  ],
  "effort": [
    -115.67000579833984,
    0,
    -59.18000030517578,
    0
  ]
}

表示方法としては, /module_1/joint_statesを読み込んだら, 全ての関節の位置, 速度, 力の情報を表示するようにする. また, それぞれの関節の情報を個別に表示することもできるようにする.

dxl_1
    position
    velocity
    effort
dxl_2
    position
    velocity
    effort
dxl_3
    position
    velocity
    effort
dxl_4
    position
    velocity
    effort

・/rosout
各ノードが出力するログを表示している. levelが重要度, nameがノード, ロガーの名前, messageがログの内容を示す. ログの重要度は, DEBUG < INFO < WARN < ERROR < FATALの順である. fileはログ出力をした実行ファイル名, functionはログ出力をした関数名, lineはログ出力命令があるソースコード上の行番号である.

表示方法としてはwiresharkみたいにする？ノード名とかでフィルタできたりする.

{
  "stamp": {
    "sec": 1768112413,
    "nanosec": 460353835
  },
  "level": 20,
  "name": "rosbag2_recorder",
  "message": "Subscribed to topic '/rosout'",
  "file": "./src/rosbag2_transport/recorder.cpp",
  "function": "subscribe_topic",
  "line": 368
}

・/image_raw/theora


・/camera_info

・/initialpose, /image_raw/compressedDepth, /goal_pose, /clicked_point, /events/write_split
これらはサンプルにデータなし.