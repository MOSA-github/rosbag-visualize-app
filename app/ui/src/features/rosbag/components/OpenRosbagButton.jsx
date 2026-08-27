import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

function OpenRosbagButton({ isSelected, onSelect }) {
  return (
    <Button className="open-rosbag-button" aria-pressed={isSelected} onClick={onSelect}>
      <Icon name={isSelected ? 'close' : 'folder'} size={18} />
      {isSelected ? 'rosbag ファイルを閉じる' : 'rosbag ファイルを選択'}
    </Button>
  );
}

export default OpenRosbagButton;
