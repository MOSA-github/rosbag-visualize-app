const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rosbagApi', {
  selectFile: () => ipcRenderer.invoke('rosbag:select-file'),
});
