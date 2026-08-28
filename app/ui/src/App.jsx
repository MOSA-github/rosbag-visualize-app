import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import { previewTopics } from './features/rosbag/model/previewTopics';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

const initialTimeRange = { start: 0, end: 12 };

function App() {
  const [hasSelectedRosbag, setHasSelectedRosbag] = useState(false);
  const [fileSelectionError, setFileSelectionError] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedRosbagFile, setSelectedRosbagFile] = useState(null);
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

  async function selectRosbagFile() {
    if (!window.rosbagApi?.selectFile) {
      setFileSelectionError('Electron のファイル選択機能を利用できません。');
      return;
    }

    try {
      setFileSelectionError(null);
      const selectedFile = await window.rosbagApi.selectFile();

      if (!selectedFile?.path || !selectedFile.name) {
        return;
      }

      setSelectedRosbagFile(selectedFile);
      setHasSelectedRosbag(true);
      setSelectedTopicIds([]);
    } catch (error) {
      console.error('Failed to select rosbag file.', error);
      setFileSelectionError('ファイルを選択できませんでした。もう一度お試しください。');
    }
  }

  function toggleTopicVisibility(topicId) {
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
          fileSelectionError={fileSelectionError}
          hasSelectedRosbag={hasSelectedRosbag}
          onSelectRosbag={selectRosbagFile}
          selectedRosbagFile={selectedRosbagFile}
          selectedTopics={selectedTopics}
        />
      ) : <EmptyEditorPage />}
    </AppShell>
  );
}

export default App;
