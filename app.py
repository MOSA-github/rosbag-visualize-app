import sys
import pandas as pd
import json
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.backends.backend_qt5agg import NavigationToolbar2QT as NavigationToolbar
from PyQt5.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout,
                            QWidget, QPushButton, QFileDialog, QListWidget,
                            QLabel, QLineEdit, QAbstractItemView, QGroupBox,
                            QComboBox, QCheckBox, QDoubleSpinBox, QSpinBox
                            )
from matplotlib.ticker import AutoMinorLocator

class ResearchGraphExpertTool(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Research Graph Tool (Legend Outside Bottom Support)")
        self.setGeometry(50, 50, 1300, 1100)
        self.df = None
        self.joint_names = {}

        self.main_widget = QWidget()
        self.setCentralWidget(self.main_widget)
        self.layout = QHBoxLayout(self.main_widget)

        self.controls = QVBoxLayout()

        # 1. Files
        self.group_io = QGroupBox("1. Files")
        io_lay = QVBoxLayout()
        self.btn_load_csv = QPushButton("① CSV読み込み"); self.btn_load_csv.clicked.connect(self.load_data)
        self.btn_load_config = QPushButton("② 設定(JSON)読み込み"); self.btn_load_config.clicked.connect(self.load_config)
        self.btn_save_config = QPushButton("設定をJSON保存"); self.btn_save_config.clicked.connect(self.save_config)
        io_lay.addWidget(self.btn_load_csv); io_lay.addWidget(self.btn_load_config); io_lay.addWidget(self.btn_save_config)
        self.group_io.setLayout(io_lay); self.controls.addWidget(self.group_io)

        # 2. Joint Settings
        self.group_joint = QGroupBox("2. Joint Settings")
        j_lay = QVBoxLayout(); self.joint_list = QListWidget(); self.joint_list.setSelectionMode(QAbstractItemView.ExtendedSelection)
        self.joint_list.itemClicked.connect(self.on_joint_clicked)
        self.edit_rename = QLineEdit(); self.btn_rename = QPushButton("表示名を保存"); self.btn_rename.clicked.connect(self.apply_rename)
        j_lay.addWidget(self.joint_list); j_lay.addWidget(QLabel("表示名の変更:")); j_lay.addWidget(self.edit_rename); j_lay.addWidget(self.btn_rename)
        self.group_joint.setLayout(j_lay); self.controls.addWidget(self.group_joint)

        # 3. Appearance
        self.group_config = QGroupBox("3. Appearance")
        c_lay = QVBoxLayout()
        self.edit_title = QLineEdit(""); c_lay.addWidget(QLabel("タイトル:")); c_lay.addWidget(self.edit_title)
        self.edit_xlabel = QLineEdit("Time [s]"); c_lay.addWidget(QLabel("X軸ラベル:")); c_lay.addWidget(self.edit_xlabel)
        self.edit_ylabel = QLineEdit("Value"); c_lay.addWidget(QLabel("Y軸ラベル:")); c_lay.addWidget(self.edit_ylabel)

        h_line = QHBoxLayout(); self.combo_linestyle = QComboBox(); self.combo_linestyle.addItems(["solid", "dashed", "dotted", "dashdot", "variant (auto)"])
        self.spin_linewidth = QDoubleSpinBox(); self.spin_linewidth.setValue(1.5)
        h_line.addWidget(QLabel("線種:")); h_line.addWidget(self.combo_linestyle); h_line.addWidget(QLabel("太さ:")); h_line.addWidget(self.spin_linewidth)
        c_lay.addLayout(h_line)

        h_tick = QHBoxLayout(); self.combo_tick_dir = QComboBox(); self.combo_tick_dir.addItems(["out", "in"])
        h_tick.addWidget(QLabel("目盛り方向:")); h_tick.addWidget(self.combo_tick_dir); c_lay.addLayout(h_tick)

        h_grid = QHBoxLayout(); self.check_grid_major = QCheckBox("主グリッド"); self.check_grid_major.setChecked(True); self.check_grid_minor = QCheckBox("補助グリッド")
        h_grid.addWidget(self.check_grid_major); h_grid.addWidget(self.check_grid_minor); c_lay.addLayout(h_grid)

        self.spin_font = QDoubleSpinBox(); self.spin_font.setValue(12); c_lay.addWidget(QLabel("フォントサイズ:")); c_lay.addWidget(self.spin_font)

        self.combo_legend = QComboBox()
        self.combo_legend.addItems(["upper right", "upper left", "lower right", "lower left", "best", "outside right", "outside bottom"])
        c_lay.addWidget(QLabel("凡例位置:")); c_lay.addWidget(self.combo_legend)

        self.spin_ncol = QSpinBox(); self.spin_ncol.setMinimum(1); c_lay.addWidget(QLabel("凡例列数:")); c_lay.addWidget(self.spin_ncol)
        self.group_config.setLayout(c_lay); self.controls.addWidget(self.group_config)

        # 4. Axis Limits
        self.group_limits = QGroupBox("4. Axis Limits")
        l_lay = QVBoxLayout(); self.check_x_limit = QCheckBox("X軸固定"); self.edit_xmin = QLineEdit("0"); self.edit_xmax = QLineEdit("10")
        self.check_y_limit = QCheckBox("Y軸固定"); self.edit_ymin = QLineEdit("-1"); self.edit_ymax = QLineEdit("1")
        x_b = QHBoxLayout(); x_b.addWidget(self.edit_xmin); x_b.addWidget(self.edit_xmax)
        y_b = QHBoxLayout(); y_b.addWidget(self.edit_ymin); y_b.addWidget(self.edit_ymax)
        l_lay.addWidget(self.check_x_limit); l_lay.addLayout(x_b); l_lay.addWidget(self.check_y_limit); l_lay.addLayout(y_b)
        self.group_limits.setLayout(l_lay); self.controls.addWidget(self.group_limits)

        # 5. Execute
        self.btn_plot = QPushButton("グラフ更新"); self.btn_plot.setStyleSheet("background-color: #bbdefb; font-weight: bold; height: 40px;")
        self.btn_plot.clicked.connect(self.plot_graph); self.controls.addWidget(self.btn_plot)
        self.btn_save_img = QPushButton("画像保存 (300DPI)"); self.btn_save_img.clicked.connect(self.save_graph_img); self.controls.addWidget(self.btn_save_img)

        self.controls.addStretch(); self.layout.addLayout(self.controls, 1)

        self.graph_layout = QVBoxLayout(); self.figure, self.ax = plt.subplots(constrained_layout=True)
        self.canvas = FigureCanvas(self.figure); self.toolbar = NavigationToolbar(self.canvas, self)
        self.graph_layout.addWidget(self.toolbar); self.graph_layout.addWidget(self.canvas)
        self.layout.addLayout(self.graph_layout, 4)

    def load_data(self):
        path, _ = QFileDialog.getOpenFileName(self, "Open CSV", "", "CSV Files (*.csv)")
        if path:
            self.df = pd.read_csv(path)
            if 'topic' in self.df.columns:
                topics = sorted(self.df['topic'].unique())
                self.joint_list.clear()
                for t in topics:
                    if t not in self.joint_names: self.joint_names[t] = t.split('/')[-1]
                    self.joint_list.addItem(t)
                self.joint_list.selectAll()

    def on_joint_clicked(self, item): self.edit_rename.setText(self.joint_names.get(item.text(), ""))
    def apply_rename(self):
        sel = self.joint_list.selectedItems()
        if sel: self.joint_names[sel[0].text()] = self.edit_rename.text()

    def save_config(self):
        path, _ = QFileDialog.getSaveFileName(self, "Save Config", "config.json", "JSON Files (*.json)")
        if not path: return
        config = {
            "joint_names": self.joint_names, "title": self.edit_title.text(), "xlabel": self.edit_xlabel.text(), "ylabel": self.edit_ylabel.text(),
            "font_size": self.spin_font.value(), "linestyle": self.combo_linestyle.currentText(), "linewidth": self.spin_linewidth.value(),
            "tick_direction": self.combo_tick_dir.currentText(), "grid_major": self.check_grid_major.isChecked(), "grid_minor": self.check_grid_minor.isChecked(),
            "legend_loc": self.combo_legend.currentText(), "legend_ncol": self.spin_ncol.value(),
            "x_limit_on": self.check_x_limit.isChecked(), "xmin": self.edit_xmin.text(), "xmax": self.edit_xmax.text(),
            "y_limit_on": self.check_y_limit.isChecked(), "ymin": self.edit_ymin.text(), "ymax": self.edit_ymax.text(),
        }
        with open(path, 'w', encoding='utf-8') as f: json.dump(config, f, indent=4, ensure_ascii=False)

    def load_config(self):
        path, _ = QFileDialog.getOpenFileName(self, "Load Config", "", "JSON Files (*.json)")
        if not path: return
        with open(path, 'r', encoding='utf-8') as f: d = json.load(f)
        self.joint_names.update(d.get("joint_names", {})); self.edit_title.setText(d.get("title", ""))
        self.edit_xlabel.setText(d.get("xlabel", "Time [s]")); self.edit_ylabel.setText(d.get("ylabel", "Value"))
        self.spin_font.setValue(d.get("font_size", 12)); self.combo_linestyle.setCurrentText(d.get("linestyle", "solid"))
        self.spin_linewidth.setValue(d.get("linewidth", 1.5)); self.combo_tick_dir.setCurrentText(d.get("tick_direction", "out"))
        self.check_grid_major.setChecked(d.get("grid_major", True)); self.check_grid_minor.setChecked(d.get("grid_minor", False))
        self.combo_legend.setCurrentText(d.get("legend_loc", "best")); self.spin_ncol.setValue(d.get("legend_ncol", 1))
        self.check_x_limit.setChecked(d.get("x_limit_on", False)); self.edit_xmin.setText(d.get("xmin", "0")); self.edit_xmax.setText(d.get("xmax", "10"))
        self.check_y_limit.setChecked(d.get("y_limit_on", False)); self.edit_ymin.setText(d.get("ymin", "-1")); self.edit_ymax.setText(d.get("ymax", "1"))
        if self.df is not None: self.plot_graph()

    def plot_graph(self):
        if self.df is None: return
        sel = [item.text() for item in self.joint_list.selectedItems()]
        if not sel: return
        self.ax.clear(); f_s = self.spin_font.value(); l_s = self.combo_linestyle.currentText(); l_w = self.spin_linewidth.value()
        t_d = self.combo_tick_dir.currentText(); styles = ["-", "--", ":", "-."]
        for i, topic in enumerate(sel):
            sub = self.df[self.df['topic'] == topic]
            name = self.joint_names.get(topic, topic.split('/')[-1])
            c_s = styles[i % len(styles)] if l_s == "variant (auto)" else l_s
            self.ax.plot(sub['elapsed time'], sub['value'], label=name, linestyle=c_s, linewidth=l_w)

        self.ax.set_title(self.edit_title.text(), fontsize=f_s * 1.2)
        self.ax.set_xlabel(self.edit_xlabel.text(), fontsize=f_s); self.ax.set_ylabel(self.edit_ylabel.text(), fontsize=f_s)
        self.ax.tick_params(axis='both', which='both', direction=t_d, labelsize=f_s)
        if self.check_grid_major.isChecked(): self.ax.grid(True, which='major', linestyle='--', alpha=0.6)
        if self.check_grid_minor.isChecked():
            self.ax.xaxis.set_minor_locator(AutoMinorLocator()); self.ax.yaxis.set_minor_locator(AutoMinorLocator())
            self.ax.grid(True, which='minor', linestyle=':', alpha=0.3)
        if self.check_x_limit.isChecked(): self.ax.set_xlim(float(self.edit_xmin.text()), float(self.edit_xmax.text()))
        if self.check_y_limit.isChecked(): self.ax.set_ylim(float(self.edit_ymin.text()), float(self.edit_ymax.text()))

        # Legend Positioning
        loc_val = self.combo_legend.currentText()
        nc = self.spin_ncol.value()
        if loc_val == "outside right":
            self.ax.legend(loc='upper left', bbox_to_anchor=(1, 1), ncol=nc, fontsize=f_s*0.8)
        elif loc_val == "outside bottom":
            self.ax.legend(loc='upper center', bbox_to_anchor=(0.5, -0.18), ncol=nc, fontsize=f_s*0.8)
        else:
            self.ax.legend(loc=loc_val, ncol=nc, fontsize=f_s*0.8)

        self.canvas.draw()

    def save_graph_img(self):
        path, _ = QFileDialog.getSaveFileName(self, "Save Image", "graph.png", "PNG (*.png);;PDF (*.pdf);;EPS (*.eps)")
        if path: self.figure.savefig(path, dpi=300, bbox_inches='tight')

if __name__ == "__main__":
    app = QApplication(sys.argv); win = ResearchGraphExpertTool(); win.show(); sys.exit(app.exec_())