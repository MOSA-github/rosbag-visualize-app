import Icon from '../../components/ui/Icon';
import OpenRosbagButton from '../../features/rosbag/components/OpenRosbagButton';

function WelcomePage() {
  return (
    <section className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-icon"><Icon name="database" size={28} /></div>
        <h1>ROSBag Visualizer</h1>
        <p>rosbag ファイルを選択して、記録データの可視化を始めます。</p>
        <OpenRosbagButton />
      </div>
    </section>
  );
}

export default WelcomePage;
