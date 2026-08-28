import Icon from '../ui/Icon';
import { useRef, useState } from 'react';

const DEFAULT_TAB_WIDTH = 150;
const MIN_TAB_WIDTH = 110;
const MAX_TAB_WIDTH = 320;

function clampTabWidth(width) {
  return Math.min(MAX_TAB_WIDTH, Math.max(MIN_TAB_WIDTH, width));
}

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
  const [resizingTabId, setResizingTabId] = useState(null);
  const [tabWidths, setTabWidths] = useState({});
  const tabResizeState = useRef(null);

  function getTabWidth(tabId) {
    return tabWidths[tabId] ?? DEFAULT_TAB_WIDTH;
  }

  function handleTabResizeStart(event, tabId) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    tabResizeState.current = {
      startWidth: getTabWidth(tabId),
      startX: event.clientX,
      tabId,
    };
    setResizingTabId(tabId);
  }

  function handleTabResizeMove(event) {
    const resizeState = tabResizeState.current;

    if (!resizeState) {
      return;
    }

    const nextWidth = clampTabWidth(resizeState.startWidth + event.clientX - resizeState.startX);
    setTabWidths((currentWidths) => ({ ...currentWidths, [resizeState.tabId]: nextWidth }));
  }

  function handleTabResizeEnd(event) {
    if (!tabResizeState.current) {
      return;
    }

    tabResizeState.current = null;
    setResizingTabId(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleTabResizeKeyDown(event, tabId) {
    const step = event.shiftKey ? 40 : 10;
    const { key } = event;
    const supportedKeys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

    if (!supportedKeys.includes(key)) {
      return;
    }

    event.preventDefault();
    setTabWidths((currentWidths) => {
      const currentWidth = currentWidths[tabId] ?? DEFAULT_TAB_WIDTH;
      let targetWidth = currentWidth;

      if (key === 'ArrowLeft') {
        targetWidth = clampTabWidth(currentWidth - step);
      } else if (key === 'ArrowRight') {
        targetWidth = clampTabWidth(currentWidth + step);
      } else if (key === 'Home') {
        targetWidth = MIN_TAB_WIDTH;
      } else if (key === 'End') {
        targetWidth = MAX_TAB_WIDTH;
      }

      return { ...currentWidths, [tabId]: targetWidth };
    });
  }

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
    <div className={`editor-tabs${resizingTabId ? ' is-resizing' : ''}`} role="tablist" aria-label="エディタータブ">
      <div className="editor-tab-list">
        {tabs.map((tab) => {
          const tabWidth = getTabWidth(tab.id);

          return (
            <div
              key={tab.id}
              className="editor-tab-wrapper"
              style={{ '--tab-width': `${tabWidth}px` }}
            >
              <div
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
              <div
                className={`tab-resize-handle${resizingTabId === tab.id ? ' is-resizing' : ''}`}
                role="separator"
                tabIndex={0}
                aria-label={`${tab.title} タブの幅を変更`}
                aria-orientation="vertical"
                aria-valuemin={MIN_TAB_WIDTH}
                aria-valuemax={MAX_TAB_WIDTH}
                aria-valuenow={tabWidth}
                onKeyDown={(event) => handleTabResizeKeyDown(event, tab.id)}
                onLostPointerCapture={handleTabResizeEnd}
                onPointerCancel={handleTabResizeEnd}
                onPointerDown={(event) => handleTabResizeStart(event, tab.id)}
                onPointerMove={handleTabResizeMove}
                onPointerUp={handleTabResizeEnd}
              />
            </div>
          );
        })}
      </div>
      <button type="button" className="add-tab-button" aria-label="新しいタブを追加" onClick={onAddTab}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export default EditorTabs;
