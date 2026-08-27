function Header() {
  return (
    <header className="app-header">
      <div className="app-brand" aria-label="ROSBag Visualizer">
        <span className="app-logo" aria-hidden="true"><i /><i /><i /></span>
        <span>ROSBag Visualizer</span>
      </div>
      <span className="app-header-title">rosbag-visualize-app</span>
    </header>
  );
}

export default Header;
