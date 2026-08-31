import { useRef, useState } from 'react';
import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import TopicSelectionDialog from './features/rosbag/components/TopicSelectionDialog';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

const initialTimeRange = { start: 0, end: 12 };
const rawMessageOptions = { limit: 3 };

function getTopicRequestKey(filePath, topicId) {
  return `${filePath}\u0000${topicId}`;
}

function App() {
  const [hasSelectedRosbag, setHasSelectedRosbag] = useState(false);
  const [fileSelectionError, setFileSelectionError] = useState(null);
  const [pendingRosbag, setPendingRosbag] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedRosbagFile, setSelectedRosbagFile] = useState(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [topicDataById, setTopicDataById] = useState({});
  const [topics, setTopics] = useState([]);
  const topicRequestIdsRef = useRef(new Map());
  const nextTopicRequestIdRef = useRef(0);
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

  function clearTopicData() {
    // bag切替後に古い非同期読み込み結果を反映しない。
    topicRequestIdsRef.current.clear();
    setTopicDataById({});
  }

  function removeTopicData(filePath, topicId) {
    if (filePath) {
      topicRequestIdsRef.current.delete(getTopicRequestKey(filePath, topicId));
    }

    setTopicDataById((currentTopicData) => {
      const { [topicId]: _removedTopicData, ...remainingTopicData } = currentTopicData;
      return remainingTopicData;
    });
  }

  async function loadTopicData(filePath, topicId) {
    const getTopicMessages = window.rosbagApi?.getTopicMessages;

    if (!getTopicMessages) {
      setTopicDataById((currentTopicData) => ({
        ...currentTopicData,
        [topicId]: {
          status: 'error',
          error: 'Electron のトピックデータ取得機能を利用できません。',
        },
      }));
      return;
    }

    const requestKey = getTopicRequestKey(filePath, topicId);
    const requestId = nextTopicRequestIdRef.current + 1;
    nextTopicRequestIdRef.current = requestId;
    topicRequestIdsRef.current.set(requestKey, requestId);
    setTopicDataById((currentTopicData) => ({
      ...currentTopicData,
      [topicId]: { status: 'loading' },
    }));

    try {
      // 巨大な画像データもあるため、まずは先頭1メッセージだけを表示する。
      const result = await getTopicMessages(filePath, topicId, rawMessageOptions);

      if (!result?.topic || !Array.isArray(result.messages)) {
        throw new Error('トピックデータの形式が不正です。');
      }

      if (topicRequestIdsRef.current.get(requestKey) !== requestId) {
        return;
      }

      setTopicDataById((currentTopicData) => ({
        ...currentTopicData,
        [topicId]: { status: 'ready', result },
      }));
    } catch (error) {
      if (topicRequestIdsRef.current.get(requestKey) !== requestId) {
        return;
      }

      setTopicDataById((currentTopicData) => ({
        ...currentTopicData,
        [topicId]: {
          status: 'error',
          error: error instanceof Error ? error.message : 'トピックデータを読み込めませんでした。',
        },
      }));
    }
  }

  function confirmTopicSelection(topicIds) {
    if (!pendingRosbag) {
      return;
    }

    const nextRosbagFile = { name: pendingRosbag.name, path: pendingRosbag.path };

    clearTopicData();
    setSelectedRosbagFile(nextRosbagFile);
    setTopics(pendingRosbag.topics);
    setSelectedTopicIds(topicIds);
    setHasSelectedRosbag(true);
    setPendingRosbag(null);
    topicIds.forEach((topicId) => {
      void loadTopicData(nextRosbagFile.path, topicId);
    });
  }

  function cancelTopicSelection() {
    setPendingRosbag(null);
  }

  function toggleTopicVisibility(topicId) {
    const isSelected = selectedTopicIds.includes(topicId);

    if (isSelected) {
      setSelectedTopicIds((currentTopicIds) => (
        currentTopicIds.filter((currentTopicId) => currentTopicId !== topicId)
      ));
      removeTopicData(selectedRosbagFile?.path, topicId);
      return;
    }

    setSelectedTopicIds((currentTopicIds) => [...currentTopicIds, topicId]);

    if (selectedRosbagFile?.path) {
      void loadTopicData(selectedRosbagFile.path, topicId);
    }
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
          topicDataById={topicDataById}
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
