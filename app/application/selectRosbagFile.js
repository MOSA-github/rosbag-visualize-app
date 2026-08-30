const path = require('node:path');
const { getRosbagTopics } = require('../domain/getRosbagTopics');
const { showRosbagFileDialog } = require('../platform/showRosbagFileDialog');

async function selectRosbagFile(
  parentWindow,
  {
    getTopics = getRosbagTopics,
    showFileDialog = showRosbagFileDialog,
  } = {},
) {
  const filePath = await showFileDialog(parentWindow);

  if (!filePath) {
    return null;
  }

  // 選択したrosbagから、表示対象として選べるトピックを取得する。
  const topics = await getTopics(filePath);

  return {
    name: path.basename(filePath),
    path: filePath,
    topics,
  };
}

module.exports = { selectRosbagFile };
