const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rosbagApi', {
  getTopicMessages: (filePath, topicId, options) => (
    ipcRenderer.invoke('rosbag:get-topic-messages', filePath, topicId, options)
  ),
  selectFile: () => ipcRenderer.invoke('rosbag:select-file'),
});
