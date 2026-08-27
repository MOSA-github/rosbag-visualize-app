import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

// The application layer will later pass the file-selection handler as onSelect.
function OpenRosbagButton({ onSelect }) {
  return (
    <Button className="open-rosbag-button" onClick={onSelect}>
      <Icon name="folder" size={18} />
      rosbag ファイルを選択
    </Button>
  );
}

export default OpenRosbagButton;
