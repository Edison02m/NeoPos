const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const DatabaseController = require('./controllers/DatabaseController');
const WindowManager = require('./windows/WindowManager');

class MainController {
  constructor() {
    this.mainWindow = null;
    this.databaseController = new DatabaseController();
    this.windowManager = new WindowManager();
  }

  async initializeApp() {
    try {
      await this.databaseController.initializeDatabase();
      this.createWindow();
      this.setupMenu(false); // Start with login menu
      this.setupIpcHandlers();
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/images/icon.png'),
      show: false,
      titleBarStyle: 'default'
    });

    const isDev = true; // Forzar modo desarrollo
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      // Desactivar DevTools en desarrollo para evitar que se abra la consola
      // this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupMenu(isAuthenticated = false) {
    let template;

    if (isAuthenticated) {
      // Menu para usuarios autenticados con nueva estructura
      template = [
        {
          label: 'Inventario',
          submenu: [
            {
              label: 'Productos',
              accelerator: 'CmdOrCtrl+P',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-products');
              }
            },
            {
              label: 'Inventario',
              accelerator: 'CmdOrCtrl+I',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-stock');
              }
            },
            {
              label: 'Clientes',
              accelerator: 'CmdOrCtrl+C',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-customers');
              }
            },
            {
              label: 'Proveedores',
              accelerator: 'CmdOrCtrl+S',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-suppliers');
              }
            }
          ]
        },
        {
          label: 'Transacciones',
          submenu: [
            {
              label: 'Ventas',
              accelerator: 'CmdOrCtrl+V',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-sales');
              }
            },
            {
              label: 'Compras',
              accelerator: 'CmdOrCtrl+B',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-purchases');
              }
            },
            {
              label: 'Crédito',
              accelerator: 'CmdOrCtrl+R',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-credit');
              }
            },
            {
              label: 'Reservaciones',
              accelerator: 'CmdOrCtrl+E',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-reservations');
              }
            }
          ]
        },
        {
          label: 'Reportes',
          submenu: [
            {
              label: 'Reporte de Ventas',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-sales');
              }
            },
            {
              label: 'Reportes de Compras',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-purchases');
              }
            },
            {
              label: 'Productos Más Vendidos',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-top-products');
              }
            },
            {
              label: 'Declaraciones SRI',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-sri-declarations');
              }
            }
          ]
        },
        {
          label: 'Configurar',
          submenu: [
            {
              label: 'Usuario',
              click: () => {
                this.mainWindow.webContents.send('menu-config-user');
              }
            },
            {
              label: 'Empresa',
              click: () => {
                this.mainWindow.webContents.send('menu-config-company');
              }
            },
            {
              label: 'Impresión de Facturas',
              click: () => {
                this.mainWindow.webContents.send('menu-config-invoice-printing');
              }
            }
          ]
        },
        {
          label: 'Utilitarios',
          submenu: [
            {
              label: 'Cierre de Caja',
              click: () => {
                this.mainWindow.webContents.send('menu-utilities-cash-closing');
              }
            },
            {
              label: 'Facturaciones',
              click: () => {
                this.mainWindow.webContents.send('menu-utilities-invoicing');
              }
            }
          ]
        },
        {
          label: 'Salir',
          submenu: [
            {
              label: 'Salir del Programa',
              accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
              click: () => {
                app.quit();
              }
            },
            {
              label: 'Cerrar Sesión',
              accelerator: 'CmdOrCtrl+L',
              click: () => {
                this.mainWindow.webContents.send('menu-logout');
              }
            }
          ]
        }
      ];
    } else {
      // Menu para usuarios no autenticados (solo login)
      template = [
        {
          label: 'Archivo',
          submenu: [
            {
              label: 'Salir',
              accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
              click: () => {
                app.quit();
              }
            }
          ]
        }
      ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    ipcMain.handle('db-initialize', async () => {
      try {
        await this.databaseController.initializeDatabase();
        return { success: true };
      } catch (error) {
        console.error('Error initializing database:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-query', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.executeQuery(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-single', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.getSingleRecord(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database single record error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-run', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.runQuery(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database run error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('quitApp', () => {
      app.quit();
    });

    // Menu state handlers
    ipcMain.handle('update-menu-authenticated', () => {
      this.setupMenu(true);
    });

    ipcMain.handle('update-menu-unauthenticated', () => {
      this.setupMenu(false);
    });

    // Window management handlers
    ipcMain.handle('open-users-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createUserWindow(this.mainWindow);
      return { success: true };
    });

    ipcMain.handle('open-empresa-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createEmpresaWindow(this.mainWindow);
      return { success: true };
    });

    // Agregar listener para debugging de eventos de menú
    ipcMain.handle('debug-menu-event', (event, menuEvent) => {
      console.log('Debug: Simulando evento de menú:', menuEvent);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(menuEvent);
        return { success: true };
      }
      return { success: false, error: 'Ventana no disponible' };
    });

    ipcMain.handle('close-window', (event, windowName) => {
      this.windowManager.closeWindow(windowName);
    });
  }
}

const mainController = new MainController();

app.whenReady().then(() => {
  mainController.initializeApp();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (mainController.databaseController) {
      mainController.databaseController.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainController.createWindow();
  }
});