const { dialog } = require('electron');

const rosbagFileFilters = [
  { name: 'rosbag files', extensions: ['db3', 'mcap', 'bag'] },
  { name: 'All files', extensions: ['*'] },
];

async function showRosbagFileDialog(parentWindow) {
  const options = {
    title: 'rosbag ファイルを選択',
    buttonLabel: '選択',
    filters: rosbagFileFilters,
    properties: ['openFile'],
  };

  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

module.exports = { showRosbagFileDialog };
