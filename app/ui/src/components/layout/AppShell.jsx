import EditorTabs from './EditorTabs';
import Header from './Header';
import Sidebar from './Sidebar';
import StatusBar from './StatusBar';

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        <Sidebar />
        <main className="editor" aria-label="Rosbag workspace">
          <EditorTabs />
          <section className="editor-content">{children}</section>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

export default AppShell;
