import Icon from '../ui/Icon';

const playbackSpeeds = [0.25, 0.5, 1, 2, 4];

function formatPlaybackSpeed(speed) {
  return `${Number(speed.toFixed(2))}×`;
}

function Sidebar({
  hasSelectedRosbag,
  onPlaybackSpeedChange,
  onTopicToggle,
  onTimeRangeChange,
  playbackSpeed,
  selectedTopicIds,
  timeRange,
  topics,
}) {
  return (
    <aside className="sidebar" aria-label="Explorer">
      <div className="sidebar-heading">EXPLORER</div>
      <section className="sidebar-section">
        <div className="sidebar-section-title">
          <Icon name="chevron" size={13} />
          ROSBAG
        </div>
        {hasSelectedRosbag ? (
          <div className="selected-source">
            <Icon name="database" size={18} />
            <span>rosbag ファイルを選択済み</span>
          </div>
        ) : (
          <div className="empty-source">
            <Icon name="database" size={18} />
            <span>ファイルが選択されていません</span>
          </div>
        )}
      </section>
      {/* rosbag未選択時は読み込み後の操作UIを描画しない。 */}
      {hasSelectedRosbag && (
        <>
          <section className="sidebar-section topic-section" aria-labelledby="topic-list-heading">
            <div className="sidebar-section-title">
              <Icon name="chevron" size={13} />
              <span id="topic-list-heading">TOPICS</span>
              <span className="topic-count">{topics.length}</span>
            </div>
            <ul className="topic-list" aria-label="rosbag トピック一覧">
              {topics.map((topic) => {
                const isSelected = selectedTopicIds.includes(topic.id);

                return (
                  <li key={topic.id}>
                    <button
                      type="button"
                      className={`topic-list-item${isSelected ? ' is-selected' : ''}`}
                      aria-label={`${topic.name} を${isSelected ? '可視化から削除' : '可視化に追加'}`}
                      aria-pressed={isSelected}
                      onClick={() => onTopicToggle(topic.id)}
                    >
                      <span className="topic-list-content">
                        <span className="topic-name" title={topic.name}>{topic.name}</span>
                        <span className="topic-type" title={topic.type}>{topic.type}</span>
                      </span>
                      <span className="topic-selection-status">
                        <Icon name={isSelected ? 'check' : 'plus'} size={13} />
                        <span>{isSelected ? '表示中' : '追加'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="sidebar-section time-range-section" aria-labelledby="time-range-heading">
            <div id="time-range-heading" className="sidebar-section-title">
              <Icon name="chevron" size={13} />
              表示時間帯
            </div>
            <div className="time-range-controls">
              <p className="time-range-hint">rosbag 開始からの相対時間（秒）</p>
              <label className="time-range-field" htmlFor="time-range-start">
                <span>開始</span>
                <input
                  id="time-range-start"
                  className="time-range-input"
                  type="number"
                  min="0"
                  max={timeRange.end}
                  step="0.1"
                  value={timeRange.start}
                  onChange={(event) => onTimeRangeChange('start', event.target.value)}
                />
              </label>
              <span className="time-range-separator" aria-hidden="true">〜</span>
              <label className="time-range-field" htmlFor="time-range-end">
                <span>終了</span>
                <input
                  id="time-range-end"
                  className="time-range-input"
                  type="number"
                  min={timeRange.start}
                  step="0.1"
                  value={timeRange.end}
                  onChange={(event) => onTimeRangeChange('end', event.target.value)}
                />
              </label>
            </div>
          </section>
          <section className="sidebar-section playback-speed-section" aria-labelledby="playback-speed-heading">
            <div id="playback-speed-heading" className="sidebar-section-title">
              <Icon name="chevron" size={13} />
              再生速度
            </div>
            <div className="playback-speed-controls">
              <div className="playback-speed-slider-header">
                <label htmlFor="playback-speed-slider">細かく調整</label>
                <output className="playback-speed-value" htmlFor="playback-speed-slider">
                  {formatPlaybackSpeed(playbackSpeed)}
                </output>
              </div>
              <input
                id="playback-speed-slider"
                className="playback-speed-slider"
                type="range"
                min="0.25"
                max="4"
                step="0.05"
                value={playbackSpeed}
                aria-valuetext={`${formatPlaybackSpeed(playbackSpeed)}倍速`}
                onChange={(event) => onPlaybackSpeedChange(Number(event.target.value))}
              />
              <div className="playback-speed-limits" aria-hidden="true">
                <span>0.25×</span>
                <span>4×</span>
              </div>
              <div className="playback-speed-presets" aria-label="再生速度プリセットを選択">
                {playbackSpeeds.map((speed) => {
                  const isSelected = playbackSpeed === speed;

                  return (
                    <button
                      key={speed}
                      type="button"
                      className={`playback-speed-button${isSelected ? ' is-selected' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => onPlaybackSpeedChange(speed)}
                    >
                      {speed}×
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </aside>
  );
}

export default Sidebar;
