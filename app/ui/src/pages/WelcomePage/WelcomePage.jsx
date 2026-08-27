import Icon from '../../components/ui/Icon';
import OpenRosbagButton from '../../features/rosbag/components/OpenRosbagButton';

function WelcomePage({ hasSelectedRosbag, onSelectRosbag, selectedTopics }) {
  return (
    <section className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-icon"><Icon name="database" size={28} /></div>
        <h1>ROSBag Visualizer</h1>
        <p>rosbag ファイルを選択して、記録データの可視化を始めます。</p>
        <OpenRosbagButton isSelected={hasSelectedRosbag} onSelect={onSelectRosbag} />
        {hasSelectedRosbag && (
          <section className="visualization-preview" aria-labelledby="visualization-preview-heading">
            <div className="visualization-preview-header">
              <span id="visualization-preview-heading">可視化に追加済み</span>
              <span className="visualization-count">{selectedTopics.length}</span>
            </div>
            {selectedTopics.length > 0 ? (
              <ul className="visualization-topic-list">
                {selectedTopics.map((topic) => (
                  <li key={topic.id} className="visualization-topic-item">
                    <Icon name="file" size={15} />
                    <span className="visualization-topic-content">
                      <strong title={topic.name}>{topic.name}</strong>
                      <span title={topic.type}>{topic.type}</span>
                    </span>
                    <span className="visualization-topic-state">準備中</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="visualization-empty">サイドバーからトピックを選択してください。</p>
            )}
          </section>
        )}
      </div>
    </section>
  );
}

export default WelcomePage;
