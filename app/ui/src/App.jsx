import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

const initialTimeRange = { start: 0, end: 12 };

function App() {
  const [hasSelectedRosbag, setHasSelectedRosbag] = useState(false);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const {
    activeTabId,
    addTab,
    closeTab,
    moveTab,
    selectTab,
    tabs,
  } = useEditorTabs();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  function toggleRosbagSelection() {
    // UI確認用に、選択状態だけを切り替える。
    setHasSelectedRosbag((isSelected) => !isSelected);
  }

  function updateTimeRange(edge, rawValue) {
    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    setTimeRange((currentRange) => {
      if (edge === 'start') {
        return { ...currentRange, start: Math.min(value, currentRange.end) };
      }

      return { ...currentRange, end: Math.max(value, currentRange.start) };
    });
  }

  return (
    <AppShell
      activeTabId={activeTabId}
      hasSelectedRosbag={hasSelectedRosbag}
      onAddTab={addTab}
      onCloseTab={closeTab}
      onMoveTab={moveTab}
      onSelectTab={selectTab}
      onTimeRangeChange={updateTimeRange}
      tabs={tabs}
      timeRange={timeRange}
    >
      {activeTab ? (
        <WelcomePage
          hasSelectedRosbag={hasSelectedRosbag}
          onSelectRosbag={toggleRosbagSelection}
        />
      ) : <EmptyEditorPage />}
    </AppShell>
  );
}

export default App;
