import Icon from '../ui/Icon';
import { useState } from 'react';

function EditorTabs({
  activeTabId,
  onAddTab,
  onCloseTab,
  onMoveTab,
  onSelectTab,
  tabs,
}) {
  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dropTargetTabId, setDropTargetTabId] = useState(null);

  function handleDragStart(event, tabId) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tabId);
    setDraggedTabId(tabId);
  }

  function handleDragOver(event, tabId) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (tabId !== draggedTabId) {
      setDropTargetTabId(tabId);
    }
  }

  function handleDrop(event, targetTabId) {
    event.preventDefault();
    const sourceTabId = event.dataTransfer.getData('text/plain') || draggedTabId;

    if (sourceTabId && sourceTabId !== targetTabId) {
      onMoveTab(sourceTabId, targetTabId);
    }

    setDraggedTabId(null);
    setDropTargetTabId(null);
  }

  function handleDragEnd() {
    setDraggedTabId(null);
    setDropTargetTabId(null);
  }

  return (
    <div className="editor-tabs" role="tablist" aria-label="エディタータブ">
      <div className="editor-tab-list">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`editor-tab${tab.id === activeTabId ? ' is-active' : ''}${tab.id === draggedTabId ? ' is-dragging' : ''}${tab.id === dropTargetTabId ? ' is-drop-target' : ''}`}
            draggable
            role="tab"
            tabIndex={0}
            aria-selected={tab.id === activeTabId}
            onClick={() => onSelectTab(tab.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(event) => handleDragOver(event, tab.id)}
            onDragStart={(event) => handleDragStart(event, tab.id)}
            onDrop={(event) => handleDrop(event, tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectTab(tab.id);
              }
            }}
          >
            <Icon name="file" size={15} />
            <span>{tab.title}</span>
            <button
              type="button"
              className="tab-close-button"
              aria-label={`${tab.title} を閉じる`}
              onClick={(event) => {
                event.stopPropagation();
                onCloseTab(tab.id);
              }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="add-tab-button" aria-label="新しいタブを追加" onClick={onAddTab}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export default EditorTabs;
