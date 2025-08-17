const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  createUserWindow(parentWindow) {
    const userWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Gestión de Usuarios',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false,
      autoHideMenuBar: true,
      menuBarVisible: false
    });

    const isDev = true;
    
    if (isDev) {
      userWindow.loadURL('http://localhost:3000/#/users');
    } else {
      userWindow.loadFile(path.join(__dirname, '../build/index.html'), {
        hash: '/users'
      });
    }

    userWindow.once('ready-to-show', () => {
      userWindow.show();
    });

    userWindow.on('closed', () => {
      this.windows.delete('users');
    });

    this.windows.set('users', userWindow);
    return userWindow;
  }

  closeWindow(windowName) {
    const window = this.windows.get(windowName);
    if (window && !window.isDestroyed()) {
      window.close();
    }
  }

  getWindow(windowName) {
    return this.windows.get(windowName);
  }
}

module.exports = WindowManager;