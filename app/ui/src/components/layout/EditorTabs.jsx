import Icon from '../ui/Icon';

function EditorTabs() {
  return (
    <div className="editor-tabs" role="tablist" aria-label="エディタータブ">
      <div className="editor-tab is-active" role="tab" aria-selected="true">
        <Icon name="file" size={15} />
        <span>Welcome</span>
        <Icon name="close" size={13} />
      </div>
    </div>
  );
}

export default EditorTabs;
