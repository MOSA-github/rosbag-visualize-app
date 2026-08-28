const path = require('node:path');
const { showRosbagFileDialog } = require('../platform/showRosbagFileDialog');

async function selectRosbagFile(parentWindow) {
  const filePath = await showRosbagFileDialog(parentWindow);

  if (!filePath) {
    return null;
  }

  return {
    name: path.basename(filePath),
    path: filePath,
  };
}

module.exports = { selectRosbagFile };
