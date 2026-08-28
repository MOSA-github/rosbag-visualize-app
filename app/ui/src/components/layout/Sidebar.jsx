import { useState } from 'react';
import Icon from '../ui/Icon';

const playbackSpeeds = [0.25, 0.5, 1, 2, 4];
const initialExpandedSections = {
  rosbag: true,
  topics: true,
  timeRange: true,
  playbackSpeed: true,
};

function formatPlaybackSpeed(speed) {
  return `${Number(speed.toFixed(2))}×`;
}

function SidebarSection({ children, className = '', count, id, isExpanded, label, onToggle }) {
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;

  return (
    <section className={`sidebar-section ${className}`.trim()} aria-labelledby={headingId}>
      <h2 className="sidebar-section-heading">
        <button
          id={headingId}
          type="button"
          className="sidebar-section-toggle"
          aria-controls={panelId}
          aria-expanded={isExpanded}
          onClick={onToggle}
        >
          <span className="sidebar-section-chevron" aria-hidden="true">
            <Icon name="chevron" size={13} />
          </span>
          <span>{label}</span>
          {count !== undefined && <span className="topic-count">{count}</span>}
        </button>
      </h2>
      <div id={panelId} className="sidebar-section-content" hidden={!isExpanded}>
        {children}
      </div>
    </section>
  );
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
  const [expandedSections, setExpandedSections] = useState(initialExpandedSections);

  function toggleSection(sectionId) {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [sectionId]: !currentSections[sectionId],
    }));
  }

  return (
    <aside className="sidebar" aria-label="Explorer">
      <div className="sidebar-heading">EXPLORER</div>
      <SidebarSection
        id="rosbag"
        isExpanded={expandedSections.rosbag}
        label="ROSBAG"
        onToggle={() => toggleSection('rosbag')}
      >
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
      </SidebarSection>
      {/* rosbag未選択時は読み込み後の操作UIを描画しない。 */}
      {hasSelectedRosbag && (
        <>
          <SidebarSection
            className="topic-section"
            count={topics.length}
            id="topics"
            isExpanded={expandedSections.topics}
            label="TOPICS"
            onToggle={() => toggleSection('topics')}
          >
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
          </SidebarSection>
          <SidebarSection
            className="time-range-section"
            id="time-range"
            isExpanded={expandedSections.timeRange}
            label="表示時間帯"
            onToggle={() => toggleSection('timeRange')}
          >
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
          </SidebarSection>
          <SidebarSection
            className="playback-speed-section"
            id="playback-speed"
            isExpanded={expandedSections.playbackSpeed}
            label="再生速度"
            onToggle={() => toggleSection('playbackSpeed')}
          >
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
          </SidebarSection>
        </>
      )}
    </aside>
  );
}

export default Sidebar;
