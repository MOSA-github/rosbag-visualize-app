import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

function OpenRosbagButton({ isSelected, onSelect }) {
  return (
    <Button
      className="open-rosbag-button"
      aria-label={isSelected ? '別の rosbag ファイルを選択' : 'rosbag ファイルを選択'}
      onClick={onSelect}
    >
      <Icon name="folder" size={18} />
      {isSelected ? '別の rosbag ファイルを選択' : 'rosbag ファイルを選択'}
    </Button>
  );
}

export default OpenRosbagButton;
