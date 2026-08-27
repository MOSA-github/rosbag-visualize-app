import { useEffect, useMemo, useState } from 'react';

const topics = [
  {
    id: 'odom',
    name: '/odom',
    type: 'nav_msgs/msg/Odometry',
    icon: 'route',
    accent: '#79e0c1',
    value: '1.32 m/s',
    detail: 'position · velocity',
  },
  {
    id: 'scan',
    name: '/scan',
    type: 'sensor_msgs/msg/LaserScan',
    icon: 'scan',
    accent: '#a797ff',
    value: '8,412 pts',
    detail: '10 Hz · 360°',
  },
  {
    id: 'camera',
    name: '/camera/front',
    type: 'sensor_msgs/msg/Image',
    icon: 'camera',
    accent: '#ffbd70',
    value: '30 fps',
    detail: '1280 × 720',
  },
  {
    id: 'battery',
    name: '/battery_state',
    type: 'sensor_msgs/msg/BatteryState',
    icon: 'battery',
    accent: '#66b9ff',
    value: '84%',
    detail: '25.1 V · healthy',
  },
  {
    id: 'diagnostics',
    name: '/diagnostics',
    type: 'diagnostic_msgs/msg/DiagnosticArray',
    icon: 'pulse',
    accent: '#ff8ca2',
    value: 'Normal',
    detail: '14 status entries',
  },
];

const signalSets = {
  odom: {
    label: '線形速度',
    unit: 'm/s',
    value: '1.32',
    delta: '+0.18',
    samples: [0.46, 0.54, 0.5, 0.64, 0.72, 0.69, 0.83, 0.8, 0.94, 1.03, 1.0, 1.12, 1.08, 1.23, 1.2, 1.31, 1.27, 1.38, 1.32, 1.41, 1.37, 1.45, 1.4, 1.32],
  },
  scan: {
    label: '検出ポイント数',
    unit: 'points',
    value: '8,412',
    delta: '+312',
    samples: [6200, 6800, 6490, 7100, 6900, 7350, 7210, 7560, 7330, 7700, 7490, 7910, 7660, 8100, 7860, 8240, 8050, 8380, 8120, 8590, 8310, 8450, 8210, 8412],
  },
  camera: {
    label: 'フレーム輝度',
    unit: '%',
    value: '68.4',
    delta: '+4.2',
    samples: [58, 62, 59, 64, 66, 65, 69, 71, 68, 74, 70, 73, 71, 76, 72, 75, 73, 70, 69, 72, 68, 71, 67, 68.4],
  },
  battery: {
    label: 'バッテリー電圧',
    unit: 'V',
    value: '25.1',
    delta: '−0.04',
    samples: [25.82, 25.8, 25.77, 25.74, 25.71, 25.69, 25.66, 25.62, 25.59, 25.55, 25.51, 25.48, 25.45, 25.42, 25.39, 25.36, 25.33, 25.3, 25.27, 25.24, 25.21, 25.17, 25.13, 25.1],
  },
  diagnostics: {
    label: '正常な診断項目',
    unit: '%',
    value: '100',
    delta: 'stable',
    samples: [92, 92, 94, 94, 93, 96, 96, 95, 97, 97, 97, 98, 98, 98, 99, 99, 99, 100, 100, 100, 100, 100, 100, 100],
  },
};

const tabs = [
  { id: 'overview', label: 'セッション概要', topic: 'odom' },
  { id: 'odometry', label: '/odom', topic: 'odom' },
  { id: 'front-camera', label: '/camera/front', topic: 'camera' },
];

const lidarPoints = [
  [37, 58, 2.4], [43, 44, 1.7], [50, 51, 1.8], [55, 36, 2.8], [61, 55, 2.2],
  [67, 39, 1.6], [72, 49, 2.6], [78, 32, 1.5], [83, 53, 2.4], [89, 42, 1.8],
  [30, 68, 1.4], [39, 75, 2.6], [48, 64, 1.8], [57, 75, 1.3], [66, 66, 2.2],
  [75, 77, 2.7], [85, 65, 1.5], [92, 73, 1.8], [25, 86, 1.6], [34, 94, 2.2],
  [45, 86, 1.3], [53, 98, 2.8], [63, 89, 1.7], [72, 96, 2.1], [81, 86, 1.5],
  [91, 97, 2.4], [101, 84, 1.5], [108, 62, 2.2], [106, 36, 1.6], [116, 51, 2.6],
];

function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" /><path d="M3 10h18" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h2a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3" /></>,
    scan: <><path d="M4 17a8 8 0 0 1 16 0" /><path d="M7 17a5 5 0 0 1 10 0" /><path d="M10 17a2 2 0 0 1 4 0" /><path d="M12 13v4" /></>,
    camera: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h8A2.5 2.5 0 0 1 17 7.5V8l3-1.5v11L17 16v.5a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 4 16.5z" /><circle cx="10.5" cy="12" r="2.5" /></>,
    battery: <><rect x="3" y="7" width="17" height="10" rx="2" /><path d="M21 10v4" /><path d="M6 10v4" /><path d="M9 10v4" /><path d="M12 10v4" /></>,
    pulse: <path d="M3 12h3l2.1-5 3.8 10 2.2-5H21" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    play: <path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
    back: <><path d="m11 17-5-5 5-5" /><path d="M18 17l-5-5 5-5" /></>,
    forward: <><path d="m13 17 5-5-5-5" /><path d="m6 17 5-5-5-5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    sliders: <><path d="M4 7h16" /><path d="M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></>,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    database: <><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.66 3.13 3 7 3s7-1.34 7-3V5" /><path d="M5 12v7c0 1.66 3.13 3 7 3s7-1.34 7-3v-7" /></>,
  };

  return <svg {...common}>{paths[name] ?? paths.grid}</svg>;
}

function TopicRow({ topic, isActive, onSelect }) {
  return (
    <button
      type="button"
      className={`topic-row${isActive ? ' is-active' : ''}`}
      onClick={() => onSelect(topic.id)}
      aria-pressed={isActive}
    >
      <span className="topic-icon" style={{ '--topic-accent': topic.accent }}>
        <Icon name={topic.icon} size={17} />
      </span>
      <span className="topic-copy">
        <strong>{topic.name}</strong>
        <span>{topic.type}</span>
      </span>
      <span className="topic-chevron"><Icon name="chevron" size={15} /></span>
    </button>
  );
}

function SignalChart({ topicId, playhead }) {
  const data = signalSets[topicId] ?? signalSets.odom;
  const width = 800;
  const height = 278;
  const padding = { top: 20, right: 20, bottom: 35, left: 48 };
  const values = data.samples;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.1);
  const x = (index) => padding.left + (index / (values.length - 1)) * (width - padding.left - padding.right);
  const y = (value) => padding.top + ((max - value) / range) * (height - padding.top - padding.bottom);
  const line = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(value).toFixed(2)}`).join(' ');
  const area = `${line} L ${x(values.length - 1).toFixed(2)} ${height - padding.bottom} L ${x(0).toFixed(2)} ${height - padding.bottom} Z`;
  const markerX = padding.left + playhead * (width - padding.left - padding.right);
  const currentIndex = Math.min(values.length - 1, Math.round(playhead * (values.length - 1)));
  const currentValue = values[currentIndex];
  const markers = [0, 0.25, 0.5, 0.75, 1];
  const timeLabels = ['12:04:12', '12:04:22', '12:04:32', '12:04:42', '12:04:52'];

  return (
    <div className="signal-chart">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">SELECTED SIGNAL</span>
          <div className="metric-line">
            <strong>{data.value}</strong><span>{data.unit}</span>
            <em className={data.delta.startsWith('−') ? 'is-negative' : ''}>{data.delta}</em>
          </div>
        </div>
        <div className="chart-legend"><span className="legend-dot" />{data.label}</div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${data.label}の時系列グラフ`}>
        <defs>
          <linearGradient id="signal-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7ce7c5" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#7ce7c5" stopOpacity="0" />
          </linearGradient>
          <filter id="line-glow" x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((level) => {
          const gridY = padding.top + level * (height - padding.top - padding.bottom);
          return <line key={level} x1={padding.left} x2={width - padding.right} y1={gridY} y2={gridY} className="chart-grid" />;
        })}
        {markers.map((marker, index) => {
          const gridX = padding.left + marker * (width - padding.left - padding.right);
          return <g key={marker}>
            <line x1={gridX} x2={gridX} y1={padding.top} y2={height - padding.bottom} className="chart-grid chart-grid--vertical" />
            <text x={gridX} y={height - 12} textAnchor={index === 0 ? 'start' : index === markers.length - 1 ? 'end' : 'middle'} className="chart-axis-text">{timeLabels[index]}</text>
          </g>;
        })}
        <text x="5" y={padding.top + 4} className="chart-axis-text">{max.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
        <text x="5" y={height - padding.bottom + 4} className="chart-axis-text">{min.toLocaleString(undefined, { maximumFractionDigits: 1 })}</text>
        <path d={area} fill="url(#signal-fill)" />
        <path d={line} className="chart-line" filter="url(#line-glow)" />
        <line x1={markerX} x2={markerX} y1={padding.top} y2={height - padding.bottom} className="playhead-line" />
        <circle cx={markerX} cy={y(currentValue)} r="5.5" className="playhead-point" />
        <circle cx={markerX} cy={y(currentValue)} r="2.5" fill="#0b1120" />
      </svg>
    </div>
  );
}

function LidarView() {
  return (
    <div className="lidar-view" aria-label="LiDAR point cloud preview">
      <div className="lidar-toolbar"><span>POINT CLOUD</span><button type="button" aria-label="ポイントクラウドのメニュー"><Icon name="more" size={18} /></button></div>
      <svg viewBox="0 0 150 125" role="img" aria-label="LiDAR point cloud">
        <defs>
          <radialGradient id="lidar-glow"><stop stopColor="#a797ff" stopOpacity="0.18" /><stop offset="1" stopColor="#a797ff" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="76" cy="75" r="60" fill="url(#lidar-glow)" />
        {[26, 43, 60].map((radius) => <circle key={radius} cx="76" cy="75" r={radius} className="lidar-ring" />)}
        <path d="M16 75h120M76 15v104M33 33l86 86M119 33l-86 86" className="lidar-axis" />
        {lidarPoints.map(([cx, cy, radius], index) => <circle key={index} cx={cx} cy={cy} r={radius} className={`lidar-point lidar-point--${index % 3}`} />)}
        <path d="M72 69h8l5 7-5 7h-8l-5-7z" className="robot-mark" />
      </svg>
      <div className="lidar-scale"><span>0 m</span><i /><span>10 m</span></div>
    </div>
  );
}

function CameraPreview() {
  return (
    <div className="camera-preview">
      <div className="camera-sky" />
      <div className="camera-horizon" />
      <div className="camera-road" />
      <div className="camera-lane lane-one" /><div className="camera-lane lane-two" />
      <div className="camera-tree tree-one" /><div className="camera-tree tree-two" /><div className="camera-tree tree-three" />
      <div className="detection detection-car"><span>car · 0.94</span></div>
      <div className="detection detection-person"><span>person · 0.87</span></div>
      <div className="camera-meta"><span>FRONT CAMERA</span><strong>12:04:36.420</strong></div>
      <div className="camera-rec"><i />REC</div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTopicId, setSelectedTopicId] = useState('odom');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0.58);
  const [range, setRange] = useState('1 min');
  const [selectedFile, setSelectedFile] = useState(null);
  const [notice, setNotice] = useState('サンプルセッションを表示中');

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) ?? topics[0],
    [selectedTopicId],
  );

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = window.setInterval(() => {
      setPlayhead((value) => (value >= 1 ? 0 : Number((value + 0.004).toFixed(3))));
    }, 80);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  function selectTopic(topicId) {
    setSelectedTopicId(topicId);
    setNotice(`${topics.find((topic) => topic.id === topicId)?.name ?? 'トピック'} を選択中`);
  }

  function changeTab(tab) {
    setActiveTab(tab.id);
    selectTopic(tab.topic);
  }

  function chooseFile(event) {
    const [file] = event.target.files;
    if (!file) return;
    setSelectedFile(file);
    setNotice(`${file.name} を読み込み準備中`);
  }

  function movePlayhead(amount) {
    setPlayhead((value) => Math.max(0, Math.min(1, Number((value + amount).toFixed(3)))));
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><span /><span /><span /></div>
          <div><strong>Rosbag<span>Studio</span></strong><small>ROBOTICS OBSERVABILITY</small></div>
        </div>

        <label className="import-card" htmlFor="rosbag-file">
          <span className="import-icon"><Icon name="folder" size={18} /></span>
          <span>
            <strong>{selectedFile ? selectedFile.name : 'rosbag を開く'}</strong>
            <small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB · 読み込み待機中` : 'DB3 / MCAP / BAG を選択'}</small>
          </span>
          <Icon name="chevron" size={16} />
          <input id="rosbag-file" type="file" accept=".db3,.mcap,.bag" onChange={chooseFile} />
        </label>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className="nav-link is-active" type="button"><Icon name="grid" size={18} />ワークスペース</button>
          <button className="nav-link" type="button" onClick={() => setNotice('セッション一覧は今後追加されます')}><Icon name="database" size={18} />セッション</button>
        </nav>

        <section className="topic-section" aria-labelledby="topic-heading">
          <div className="section-heading">
            <div><span className="eyebrow">TOPICS</span><strong id="topic-heading">記録トピック <b>{topics.length}</b></strong></div>
            <button type="button" className="icon-button" aria-label="トピックを検索" onClick={() => setNotice('トピック検索を準備中です')}><Icon name="search" size={17} /></button>
          </div>
          <div className="topic-list">
            {topics.map((topic) => <TopicRow key={topic.id} topic={topic} isActive={topic.id === selectedTopicId} onSelect={selectTopic} />)}
          </div>
        </section>

        <div className="sidebar-footer">
          <span className="status-indicator"><i />解析エンジン接続済み</span>
          <button className="settings-button" type="button" onClick={() => setNotice('表示設定を準備中です')}><Icon name="sliders" size={17} />表示設定</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs"><span>ワークスペース</span><Icon name="chevron" size={14} /><strong>urban_delivery_2025-06-18</strong></div>
          <div className="topbar-actions">
            <span className="session-state"><i />SESSION READY</span>
            <button type="button" className="icon-button" aria-label="通知" onClick={() => setNotice('新しい通知はありません')}><Icon name="bell" size={18} /></button>
            <span className="avatar">TH</span>
          </div>
        </header>

        <div className="workspace-title">
          <div>
            <p className="eyebrow">ACTIVE RECORDING</p>
            <h1>Urban delivery run <span>#042</span></h1>
            <p>2025年6月18日　12:04:12 — 12:05:12 <i /> 60秒間 <i /> 5 topics</p>
          </div>
          <div className="title-actions">
            <button type="button" className="secondary-button" onClick={() => setNotice('共有リンクをコピーしました')}><Icon name="download" size={16} />エクスポート</button>
            <button type="button" className="primary-button" onClick={() => setNotice('新しい可視化タブを追加しました')}><Icon name="plus" size={17} />可視化を追加</button>
          </div>
        </div>

        <div className="tab-bar" role="tablist" aria-label="可視化タブ">
          {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={tab.id === activeTab} className={`tab${tab.id === activeTab ? ' is-active' : ''}`} onClick={() => changeTab(tab)}>{tab.label}<span className="tab-close"><Icon name="close" size={13} /></span></button>)}
          <button type="button" className="add-tab" aria-label="タブを追加" onClick={() => setNotice('可視化を追加できます')}><Icon name="plus" size={17} /></button>
          <div className="tab-spacer" />
          <button type="button" className="tab-options" onClick={() => setNotice('タブ設定を準備中です')}><Icon name="sliders" size={16} />表示オプション</button>
        </div>

        <div className="content-scroll">
          <div className="notice-bar"><span><Icon name="check" size={15} />{notice}</span><time>Last message · 12:04:46.382</time></div>
          <section className="dashboard-grid">
            <article className="panel signal-panel">
              <div className="panel-title">
                <div><span className="topic-kicker" style={{ '--topic-accent': selectedTopic.accent }}><Icon name={selectedTopic.icon} size={15} />{selectedTopic.name}</span><h2>{selectedTopic.detail}</h2></div>
                <button type="button" className="icon-button panel-more" aria-label="グラフのメニュー" onClick={() => setNotice(`${selectedTopic.name} の表示設定を開きます`)}><Icon name="more" size={19} /></button>
              </div>
              <SignalChart topicId={selectedTopicId} playhead={playhead} />
            </article>

            <article className="panel overview-panel">
              <div className="panel-title compact"><div><span className="eyebrow">LIVE SNAPSHOT</span><h2>走行状態</h2></div><span className="live-badge"><i />LIVE</span></div>
              <div className="vehicle-map">
                <div className="map-grid" />
                <div className="map-route" />
                <div className="route-dot route-dot-one" /><div className="route-dot route-dot-two" /><div className="route-dot route-dot-three" />
                <div className="vehicle"><span /><span /></div>
                <span className="north">N</span>
                <div className="map-scale"><i /> 5 m</div>
              </div>
              <div className="stat-row">
                <div><span>速度</span><strong>1.32 <small>m/s</small></strong></div>
                <div><span>方位</span><strong>084<small>°</small></strong></div>
                <div><span>走行距離</span><strong>118.6 <small>m</small></strong></div>
              </div>
            </article>

            <article className="panel lidar-panel">
              <LidarView />
              <div className="lidar-caption"><div><span className="topic-kicker topic-kicker--violet"><Icon name="scan" size={14} />/scan</span><h2>LaserScan</h2></div><strong>8,412 <small>points</small></strong></div>
            </article>

            <article className="panel camera-panel">
              <CameraPreview />
              <div className="camera-caption"><div><span className="topic-kicker topic-kicker--orange"><Icon name="camera" size={14} />/camera/front</span><h2>Front camera</h2></div><button type="button" className="mini-action" onClick={() => { setSelectedTopicId('camera'); setNotice('/camera/front を選択中'); }}>詳細を表示 <Icon name="chevron" size={14} /></button></div>
            </article>

            <article className="panel diagnostics-panel">
              <div className="panel-title compact"><div><span className="eyebrow">SYSTEM HEALTH</span><h2>診断</h2></div><button type="button" className="icon-button" aria-label="診断の詳細" onClick={() => selectTopic('diagnostics')}><Icon name="chevron" size={17} /></button></div>
              <div className="health-score"><strong>100</strong><span>%</span><em>すべて正常</em></div>
              <div className="health-bars"><span className="is-good" /><span className="is-good" /><span className="is-good" /><span className="is-good" /><span className="is-good" /><span className="is-good" /><span className="is-good" /><span className="is-good" /></div>
              <div className="diagnostic-list"><span><i className="ok-dot" />Localization <b>OK</b></span><span><i className="ok-dot" />Navigation <b>OK</b></span></div>
            </article>
          </section>
        </div>

        <footer className="timeline-player">
          <div className="player-controls">
            <button type="button" className="control-button" aria-label="10秒戻る" onClick={() => movePlayhead(-0.16)}><Icon name="back" size={17} /></button>
            <button type="button" className="play-button" aria-label={isPlaying ? '一時停止' : '再生'} onClick={() => setIsPlaying((value) => !value)}><Icon name={isPlaying ? 'pause' : 'play'} size={18} /></button>
            <button type="button" className="control-button" aria-label="10秒進む" onClick={() => movePlayhead(0.16)}><Icon name="forward" size={17} /></button>
          </div>
          <div className="timeline-main">
            <div className="time-readout"><strong>12:04:{String(Math.round(playhead * 59)).padStart(2, '0')}.420</strong><span>/ 12:05:12.000</span></div>
            <input className="timeline-range" type="range" min="0" max="1" step="0.001" value={playhead} style={{ '--progress': `${playhead * 100}%` }} onChange={(event) => setPlayhead(Number(event.target.value))} aria-label="再生位置" />
            <div className="timeline-ticks"><span>12:04:12</span><span>12:04:27</span><span>12:04:42</span><span>12:04:57</span><span>12:05:12</span></div>
          </div>
          <div className="player-tools">
            <div className="range-selector" aria-label="表示範囲">
              {['10 sec', '30 sec', '1 min'].map((item) => <button key={item} type="button" className={range === item ? 'is-selected' : ''} onClick={() => setRange(item)}>{item}</button>)}
            </div>
            <button type="button" className="icon-button" aria-label="再生設定" onClick={() => setNotice('再生設定を準備中です')}><Icon name="sliders" size={18} /></button>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default App;
