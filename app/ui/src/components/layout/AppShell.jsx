import { useRef, useState } from 'react';
import EditorTabs from './EditorTabs';
import Header from './Header';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;

function clampSidebarWidth(width) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

function AppShell({
  activeTabId,
  children,
  hasSelectedRosbag,
  onAddTab,
  onCloseTab,
  onMoveTab,
  onPlaybackSpeedChange,
  onSelectTab,
  onTopicToggle,
  onTimeRangeChange,
  selectedTopicIds,
  tabs,
  playbackSpeed,
  timeRange,
  topics,
}) {
  const [sidebarWidth, setSidebarWidth] = useState(245);
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const sidebarResizeState = useRef(null);

  function handleSidebarResizeStart(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    // 境界外へ移動してもドラッグを継続できるようにする。
    event.currentTarget.setPointerCapture(event.pointerId);
    sidebarResizeState.current = { startWidth: sidebarWidth, startX: event.clientX };
    setIsSidebarResizing(true);
  }

  function handleSidebarResizeMove(event) {
    const resizeState = sidebarResizeState.current;

    if (!resizeState) {
      return;
    }

    setSidebarWidth(clampSidebarWidth(resizeState.startWidth + event.clientX - resizeState.startX));
  }

  function handleSidebarResizeEnd(event) {
    if (!sidebarResizeState.current) {
      return;
    }

    sidebarResizeState.current = null;
    setIsSidebarResizing(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSidebarResizeKeyDown(event) {
    const step = event.shiftKey ? 40 : 10;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setSidebarWidth((width) => clampSidebarWidth(width - step));
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      setSidebarWidth((width) => clampSidebarWidth(width + step));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
    }
  }

  return (
    <div className="app-shell">
      <Header />
      <div
        className={`app-body${isSidebarResizing ? ' is-resizing' : ''}`}
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
      >
        <Sidebar
          hasSelectedRosbag={hasSelectedRosbag}
          onPlaybackSpeedChange={onPlaybackSpeedChange}
          onTopicToggle={onTopicToggle}
          onTimeRangeChange={onTimeRangeChange}
          playbackSpeed={playbackSpeed}
          selectedTopicIds={selectedTopicIds}
          timeRange={timeRange}
          topics={topics}
        />
        <div
          className={`sidebar-resize-handle${isSidebarResizing ? ' is-resizing' : ''}`}
          role="separator"
          tabIndex={0}
          aria-label="サイドバーの幅を変更"
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          onKeyDown={handleSidebarResizeKeyDown}
          onLostPointerCapture={handleSidebarResizeEnd}
          onPointerCancel={handleSidebarResizeEnd}
          onPointerDown={handleSidebarResizeStart}
          onPointerMove={handleSidebarResizeMove}
          onPointerUp={handleSidebarResizeEnd}
        />
        <main className="editor" aria-label="Rosbag workspace">
          <EditorTabs
            activeTabId={activeTabId}
            onAddTab={onAddTab}
            onCloseTab={onCloseTab}
            onMoveTab={onMoveTab}
            onSelectTab={onSelectTab}
            tabs={tabs}
          />
          <section className="editor-content">{children}</section>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default AppShell;
