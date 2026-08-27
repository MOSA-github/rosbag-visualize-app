import { useRef, useState } from 'react';

const initialTabs = [{ id: 'welcome-1', title: 'Welcome' }];

export function useEditorTabs() {
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0].id);
  const nextTabNumber = useRef(2);

  function addTab() {
    const number = nextTabNumber.current;
    const newTab = {
      id: `welcome-${number}`,
      title: `Welcome ${number}`,
    };

    nextTabNumber.current += 1;
    setTabs((currentTabs) => [...currentTabs, newTab]);
    setActiveTabId(newTab.id);
  }

  function selectTab(tabId) {
    setActiveTabId(tabId);
  }

  function closeTab(tabId) {
    const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
    const remainingTabs = tabs.filter((tab) => tab.id !== tabId);

    setTabs(remainingTabs);
    setActiveTabId((currentActiveTabId) => {
      if (currentActiveTabId !== tabId) {
        return currentActiveTabId;
      }

      return remainingTabs[closedIndex]?.id ?? remainingTabs[closedIndex - 1]?.id ?? null;
    });
  }

  function moveTab(sourceTabId, targetTabId) {
    setTabs((currentTabs) => {
      const sourceIndex = currentTabs.findIndex((tab) => tab.id === sourceTabId);
      const targetIndex = currentTabs.findIndex((tab) => tab.id === targetTabId);

      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return currentTabs;
      }

      const nextTabs = [...currentTabs];
      const [movedTab] = nextTabs.splice(sourceIndex, 1);
      nextTabs.splice(targetIndex, 0, movedTab);
      return nextTabs;
    });
  }

  return {
    activeTabId,
    addTab,
    closeTab,
    moveTab,
    selectTab,
    tabs,
  };
}
