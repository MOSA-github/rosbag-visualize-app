import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/ui/Icon';

function TopicSelectionDialog({ fileName, onCancel, onConfirm, topics }) {
  const dialogRef = useRef(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);

  useEffect(() => {
    const dialog = dialogRef.current;

    dialog.showModal();
    // 開いた直後に選択リストへフォーカスを移し、キーボードでも選べるようにする。
    dialog.querySelector('input, button')?.focus();

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  function toggleTopic(topicId) {
    setSelectedTopicIds((currentIds) => (
      currentIds.includes(topicId)
        ? currentIds.filter((currentId) => currentId !== topicId)
        : [...currentIds, topicId]
    ));
  }

  function selectAllTopics() {
    setSelectedTopicIds(topics.map((topic) => topic.id));
  }

  function clearTopics() {
    setSelectedTopicIds([]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm(selectedTopicIds);
  }

  function handleCancel(event) {
    event.preventDefault();
    onCancel();
  }

  const hasSelectedAllTopics = topics.length > 0 && selectedTopicIds.length === topics.length;

  return (
    <dialog
      ref={dialogRef}
      className="topic-selection-dialog"
      aria-describedby="topic-selection-description"
      aria-labelledby="topic-selection-title"
      onCancel={handleCancel}
    >
      <form className="topic-selection-dialog-content" onSubmit={handleSubmit}>
        <header className="topic-selection-dialog-header">
          <div>
            <p className="topic-selection-dialog-eyebrow">ROSBAG TOPICS</p>
            <h2 id="topic-selection-title">表示するトピックを選択</h2>
            <p id="topic-selection-description">
              {fileName} に含まれるトピックから、可視化へ追加するものを選択してください。
            </p>
          </div>
          <button
            type="button"
            className="topic-selection-close-button"
            aria-label="トピック選択をキャンセル"
            onClick={onCancel}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="topic-selection-dialog-body">
          <div className="topic-selection-dialog-toolbar">
            <span className="topic-selection-count" aria-live="polite">
              {selectedTopicIds.length} / {topics.length} 件を選択中
            </span>
            <div className="topic-selection-bulk-actions">
              <button
                type="button"
                className="topic-selection-text-button"
                disabled={hasSelectedAllTopics}
                onClick={selectAllTopics}
              >
                すべて選択
              </button>
              <button
                type="button"
                className="topic-selection-text-button"
                disabled={selectedTopicIds.length === 0}
                onClick={clearTopics}
              >
                選択解除
              </button>
            </div>
          </div>

          {topics.length > 0 ? (
            <ul className="topic-selection-list" aria-label="表示するrosbagトピック">
              {topics.map((topic) => {
                const inputId = `topic-selection-${topic.id}`;
                const isSelected = selectedTopicIds.includes(topic.id);

                return (
                  <li key={topic.id} className={isSelected ? 'is-selected' : ''}>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTopic(topic.id)}
                    />
                    <label htmlFor={inputId}>
                      <span className="topic-selection-topic-name" title={topic.name}>{topic.name}</span>
                      <span className="topic-selection-topic-type" title={topic.type}>{topic.type}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="topic-selection-empty">このdb3ファイルには選択できるトピックがありません。</p>
          )}
        </div>

        <footer className="topic-selection-dialog-actions">
          <button type="button" className="topic-selection-cancel-button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className="topic-selection-confirm-button">
            選択を反映
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default TopicSelectionDialog;
