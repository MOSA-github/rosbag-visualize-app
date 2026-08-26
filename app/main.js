const { app, BrowserWindow } = require('electron');

/**
 * Create the initial application window.
 *
 * The renderer and application modules will be added later. For now, loading
 * about:blank gives us an empty desktop window without introducing a UI layer.
 */
function createWindow() {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.loadURL('about:blank');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
