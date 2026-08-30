import { useState } from 'react';
import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import TopicSelectionDialog from './features/rosbag/components/TopicSelectionDialog';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

const initialTimeRange = { start: 0, end: 12 };

function App() {
  const [hasSelectedRosbag, setHasSelectedRosbag] = useState(false);
  const [fileSelectionError, setFileSelectionError] = useState(null);
  const [pendingRosbag, setPendingRosbag] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedRosbagFile, setSelectedRosbagFile] = useState(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [topics, setTopics] = useState([]);
  const {
    activeTabId,
    addTab,
    closeTab,
    moveTab,
    selectTab,
    tabs,
  } = useEditorTabs();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const selectedTopics = topics.filter((topic) => selectedTopicIds.includes(topic.id));

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

      if (!Array.isArray(selectedFile.topics)) {
        throw new Error('The selected rosbag does not include topic data.');
      }

      // ダイアログで確定するまで、現在表示中のrosbagは差し替えない。
      setPendingRosbag({
        name: selectedFile.name,
        path: selectedFile.path,
        topics: selectedFile.topics,
      });
    } catch (error) {
      console.error('Failed to select rosbag file.', error);
      setFileSelectionError('ファイルまたはトピック一覧を読み込めませんでした。もう一度お試しください。');
    }
  }

  function confirmTopicSelection(topicIds) {
    if (!pendingRosbag) {
      return;
    }

    setSelectedRosbagFile({ name: pendingRosbag.name, path: pendingRosbag.path });
    setTopics(pendingRosbag.topics);
    setSelectedTopicIds(topicIds);
    setHasSelectedRosbag(true);
    setPendingRosbag(null);
  }

  function cancelTopicSelection() {
    setPendingRosbag(null);
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
    <>
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
      topics={topics}
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
    {pendingRosbag && (
      <TopicSelectionDialog
        fileName={pendingRosbag.name}
        topics={pendingRosbag.topics}
        onCancel={cancelTopicSelection}
        onConfirm={confirmTopicSelection}
      />
    )}
  </>
  );
}

export default App;
