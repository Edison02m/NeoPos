const { BrowserWindow, Menu } = require('electron');
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
      skipTaskbar: false
    });

    const isDev = true;
    
    if (isDev) {
      userWindow.loadURL('http://localhost:3000/#/users');
    } else {
      userWindow.loadFile(path.join(__dirname, '../build/index.html'), {
        hash: '/users'
      });
    }

    // Establecer menú vacío para esta ventana específica
    const emptyMenu = Menu.buildFromTemplate([]);
    userWindow.setMenu(emptyMenu);

    userWindow.once('ready-to-show', () => {
      userWindow.show();
    });

    userWindow.on('closed', () => {
      this.windows.delete('users');
    });

    this.windows.set('users', userWindow);
    return userWindow;
  }

  createEmpresaWindow(parentWindow) {
    const empresaWindow = new BrowserWindow({
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
      title: 'Configuración de Empresa',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    const isDev = true;
    
    if (isDev) {
      empresaWindow.loadURL('http://localhost:3000/#/empresa');
    } else {
      empresaWindow.loadFile(path.join(__dirname, '../build/index.html'), {
        hash: '/empresa'
      });
    }

    // Establecer menú vacío para esta ventana específica
    const emptyMenu = Menu.buildFromTemplate([]);
    empresaWindow.setMenu(emptyMenu);

    empresaWindow.once('ready-to-show', () => {
      empresaWindow.show();
    });

    empresaWindow.on('closed', () => {
      this.windows.delete('empresa');
    });

    this.windows.set('empresa', empresaWindow);
    return empresaWindow;
  }

  createClienteWindow(parentWindow) {
    const clienteWindow = new BrowserWindow({
      width: 1000,
      height: 700,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Gestión de Clientes',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    const isDev = true;
    
    if (isDev) {
      clienteWindow.loadURL('http://localhost:3000/#/cliente');
    } else {
      clienteWindow.loadFile(path.join(__dirname, '../build/index.html'), {
        hash: '/cliente'
      });
    }

    // Menú específico para la ventana de clientes basado en las imágenes
    const menuTemplate = [
      {
        label: 'Ver',
        submenu: [
          {
            label: 'Personas',
            click: () => {
              clienteWindow.webContents.send('menu-ver-personas');
            }
          },
          {
            label: 'Empresas',
            click: () => {
              clienteWindow.webContents.send('menu-ver-empresas');
            }
          },

          {
            label: 'Ver crédito otorgado al cliente',
            click: () => {
              clienteWindow.webContents.send('menu-ver-credito');
            }
          },
          {
            label: 'Ver reservaciones del cliente',
            click: () => {
              clienteWindow.webContents.send('menu-ver-reservaciones');
            }
          }
        ]
      },
      {
        label: 'Cerrar ventana clientes',
        click: () => {
          clienteWindow.close();
        }
      }
    ];

    const clienteMenu = Menu.buildFromTemplate(menuTemplate);
    clienteWindow.setMenu(clienteMenu);

    clienteWindow.once('ready-to-show', () => {
      clienteWindow.show();
    });

    clienteWindow.on('closed', () => {
      this.windows.delete('clientes');
    });

    this.windows.set('clientes', clienteWindow);
    return clienteWindow;
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