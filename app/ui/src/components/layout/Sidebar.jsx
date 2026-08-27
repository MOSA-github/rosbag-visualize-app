import Icon from '../ui/Icon';

function Sidebar({ hasSelectedRosbag, onTimeRangeChange, timeRange }) {
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
      {/* rosbag未選択時は時間帯指定を描画しない。 */}
      {hasSelectedRosbag && (
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
      )}
    </aside>
  );
}

export default Sidebar;
