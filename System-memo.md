
# 処理の流れ
・rosbagデータのsqliteを選択
・sqliteのtopicsテーブルを参照して, topics.nameの一覧を表示
・選択されたnameのidでmessagesテーブルをフィルタして, topicsテーブルのserialization_format, typeからdataをデシリアライゼーション
・それらを時系列に並べて表示
    ・画像であれば動画みたいに時系列に並べる
    ・数値データであれば, 二次元のグラフに
    ・文字列データであれば, 表みたいな感じ？
    ・ブール値であれば, グラフ？
・その後, 細かく処理できるようにする
    ・画像であれば, コマ送り
    ・数値データであれば, グラフの拡大縮小や範囲指定
    ・文字列データであれば, 表のソートやフィルタリング
    ・ブール値であれば, グラフの拡大縮小や範囲指定

# 細かい処理
・複数のタブを開いて, それぞれのタブで異なるトピックを表示できるようにする
・データの重ね合わせもできるようにする

# モジュール化
ui(ユーザーインターフェースの処理を記述)
application(処理の順番を記述)
domain(計算アルゴリズムなどを記述)
infrastructure(DB保存, API通信などを記述)
platform(OSごとに分けないと行けない処理を記述)

# UI
起動時はタブが一つ起動していて真ん中にrosbagファイルを選択というボタンがあるだけ
ファイルを選ぶとそのトピックを選択するかのダイアログが出る
選んだら左端にサイドバー, サイドバーから右端にかけて動画やグラフ
サイドバーの中には表示区間の選択や再生速度の選択, ほかのトピックを追加するための選んだrosbagデータのトピック一覧などを表示

loadRosbagFile
    openFile
    selectTopic
    desiriliseData
    selectData
    arrangeData

openFile
    openDialog
    selectFile
    validateFile

