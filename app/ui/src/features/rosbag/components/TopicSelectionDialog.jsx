import { useEffect, useRef, useState } from 'react';
import Icon from '../../../components/ui/Icon';

function TopicSelectionDialog({ fileName, onCancel, onConfirm, topics }) {
  const dialogRef = useRef(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);

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

  function handleSubmit(event) {
    event.preventDefault();

    if (selectedTopicId !== null) {
      onConfirm([selectedTopicId]);
    }
  }

  function handleCancel(event) {
    event.preventDefault();
    onCancel();
  }

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
              {fileName} に含まれるトピックから、可視化へ追加する1つを選択してください。
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
          {topics.length > 0 ? (
            <ul className="topic-selection-list" aria-label="表示するrosbagトピック" role="radiogroup">
              {topics.map((topic) => {
                const inputId = `topic-selection-${topic.id}`;
                const isSelected = selectedTopicId === topic.id;

                return (
                  <li key={topic.id} className={isSelected ? 'is-selected' : ''}>
                    <input
                      id={inputId}
                      type="radio"
                      name="topic-selection"
                      checked={isSelected}
                      onChange={() => setSelectedTopicId(topic.id)}
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
          <button
            type="submit"
            className="topic-selection-confirm-button"
            disabled={selectedTopicId === null}
          >
            選択を反映
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default TopicSelectionDialog;
