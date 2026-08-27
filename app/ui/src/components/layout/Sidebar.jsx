import Icon from '../ui/Icon';

function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Explorer">
      <div className="sidebar-heading">EXPLORER</div>
      <section className="sidebar-section">
        <div className="sidebar-section-title">
          <Icon name="chevron" size={13} />
          ROSBAG
        </div>
        <div className="empty-source">
          <Icon name="database" size={18} />
          <span>ファイルが選択されていません</span>
        </div>
      </section>
    </aside>
  );
}

export default Sidebar;
