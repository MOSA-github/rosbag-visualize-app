import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import { previewTopics } from './features/rosbag/model/previewTopics';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

const initialTimeRange = { start: 0, end: 12 };

function App() {
  const [hasSelectedRosbag, setHasSelectedRosbag] = useState(false);
  // 将来の再生処理へ渡す速度を保持する。
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
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
  const selectedTopics = previewTopics.filter((topic) => selectedTopicIds.includes(topic.id));

  function toggleRosbagSelection() {
    // UI確認用に、選択状態だけを切り替える。
    setHasSelectedRosbag((isSelected) => !isSelected);
    setSelectedTopicIds([]);
  }

  function toggleTopicVisibility(topicId) {
    // クリックごとに可視化対象へ追加・削除する。
    setSelectedTopicIds((currentTopicIds) => (
      currentTopicIds.includes(topicId)
        ? currentTopicIds.filter((currentTopicId) => currentTopicId !== topicId)
        : [...currentTopicIds, topicId]
    ));
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
      onPlaybackSpeedChange={setPlaybackSpeed}
      onSelectTab={selectTab}
      onTopicToggle={toggleTopicVisibility}
      onTimeRangeChange={updateTimeRange}
      playbackSpeed={playbackSpeed}
      selectedTopicIds={selectedTopicIds}
      tabs={tabs}
      timeRange={timeRange}
      topics={previewTopics}
    >
      {activeTab ? (
        <WelcomePage
          hasSelectedRosbag={hasSelectedRosbag}
          onSelectRosbag={toggleRosbagSelection}
          selectedTopics={selectedTopics}
        />
      ) : <EmptyEditorPage />}
    </AppShell>
  );
}

export default App;
