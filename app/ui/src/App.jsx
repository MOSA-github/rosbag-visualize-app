import AppShell from './components/layout/AppShell';
import { useEditorTabs } from './features/editorTabs/model/useEditorTabs';
import EmptyEditorPage from './pages/EmptyEditorPage/EmptyEditorPage';
import WelcomePage from './pages/WelcomePage/WelcomePage';

function App() {
  const {
    activeTabId,
    addTab,
    closeTab,
    moveTab,
    selectTab,
    tabs,
  } = useEditorTabs();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <AppShell
      activeTabId={activeTabId}
      onAddTab={addTab}
      onCloseTab={closeTab}
      onMoveTab={moveTab}
      onSelectTab={selectTab}
      tabs={tabs}
    >
      {activeTab ? <WelcomePage /> : <EmptyEditorPage />}
    </AppShell>
  );
}

export default App;
