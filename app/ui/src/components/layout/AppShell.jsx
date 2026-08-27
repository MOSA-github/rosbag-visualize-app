import EditorTabs from './EditorTabs';
import Header from './Header';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

function AppShell({
  activeTabId,
  children,
  hasSelectedRosbag,
  onAddTab,
  onCloseTab,
  onMoveTab,
  onSelectTab,
  onTimeRangeChange,
  tabs,
  timeRange,
}) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar
          hasSelectedRosbag={hasSelectedRosbag}
          onTimeRangeChange={onTimeRangeChange}
          timeRange={timeRange}
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
