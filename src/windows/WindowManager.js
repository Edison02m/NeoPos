const { BrowserWindow, Menu, app } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  // Helper para detectar si estamos en desarrollo o producción
  isDevelopment() {
    return !app.isPackaged;
  }

  // Helper para cargar URL o archivo según el modo
  loadContent(window, route) {
    if (this.isDevelopment()) {
      window.loadURL(`http://localhost:3000/#${route}`);
    } else {
      // En producción, usar la misma ruta que la ventana principal
      // Buscar el index.html en varios lugares posibles
      const possiblePaths = [
        path.join(__dirname, '../build/index.html'),
        path.join(process.resourcesPath, 'app/build/index.html'),
        path.join(process.resourcesPath, 'build/index.html'),
        path.join(__dirname, '../../build/index.html')
      ];
      
      const fs = require('fs');
      let htmlPath = possiblePaths[0]; // default
      
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          htmlPath = testPath;
          break;
        }
      }
      
      window.loadFile(htmlPath, {
        hash: route
      });
    }
  }

  createUserWindow(parentWindow) {
    const userWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: parentWindow,
      modal: true,
      show: false,
      closable: true,
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

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(userWindow, '/users');

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

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(empresaWindow, '/empresa');

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

  // Cargar contenido según el modo de desarrollo/producción
  // Ruta correcta en React Router es '/cliente'
  this.loadContent(clienteWindow, '/cliente');

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
            type: 'separator'
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

  createProveedorWindow(parentWindow) {
    const proveedorWindow = new BrowserWindow({
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
      title: 'Gestión de Proveedores',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(proveedorWindow, '/proveedor');

    // Menú específico para la ventana de proveedores
    const menuTemplate = [
      {
        label: 'Cerrar ventana proveedores',
        click: () => {
          proveedorWindow.close();
        }
      }
    ];

    const proveedorMenu = Menu.buildFromTemplate(menuTemplate);
    proveedorWindow.setMenu(proveedorMenu);

    proveedorWindow.once('ready-to-show', () => {
      proveedorWindow.show();
    });

    proveedorWindow.on('closed', () => {
      this.windows.delete('proveedores');
    });

    this.windows.set('proveedores', proveedorWindow);
    return proveedorWindow;
  }

  createProductoWindow(parentWindow) {
    const productoWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Gestión de Productos',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(productoWindow, '/producto');

    // Menú específico para la ventana de productos
    const menuTemplate = [
      {
        label: 'Producto',
        submenu: [
          {
            label: 'Buscar productos',
            submenu: [
              {
                label: 'Buscar por descripción del producto',
                accelerator: 'Ctrl+H',
                click: () => {
                  productoWindow.webContents.send('menu-buscar-descripcion');
                }
              },
              {
                label: 'Buscar por código de barras',
                click: () => {
                  productoWindow.webContents.send('menu-buscar-codigo-barras');
                }
              },
              {
                label: 'Buscar por código auxiliar',
                click: () => {
                  productoWindow.webContents.send('menu-buscar-codigo-auxiliar');
                }
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            label: 'Filtrar productos',
            click: () => {
              console.log('[WINDOWMANAGER] Enviando evento menu-filtrar-productos');
              productoWindow.webContents.send('menu-filtrar-productos');
              console.log('[WINDOWMANAGER] Evento enviado');
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Marcar producto',
            click: () => {
              productoWindow.webContents.send('menu-marcar-producto');
            }
          },
          {
            label: 'Productos marcados',
            click: () => {
              productoWindow.webContents.send('menu-productos-marcados');
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Ir al primer registro',
            click: () => {
              productoWindow.webContents.send('menu-primer-registro');
            }
          },
          {
            label: 'Ir al último registro',
            click: () => {
              productoWindow.webContents.send('menu-ultimo-registro');
            }
          }
        ]
      },

      {
        label: 'Reportes del producto',
        submenu: [
          {
            label: 'Reporte de productos',
            click: () => {
              productoWindow.webContents.send('menu-reporte-productos');
            }
          }
        ]
      },
      {
        label: 'Cerrar ventana producto',
        click: () => {
          productoWindow.close();
        }
      }
    ];

    const productoMenu = Menu.buildFromTemplate(menuTemplate);
    productoWindow.setMenu(productoMenu);

    productoWindow.once('ready-to-show', () => {
      productoWindow.show();
    });

    productoWindow.on('closed', () => {
      this.windows.delete('productos');
    });

    this.windows.set('productos', productoWindow);
    return productoWindow;
  }

  createInventarioWindow(parentWindow) {
    const inventarioWindow = new BrowserWindow({
      width: 1400,
      height: 800,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Inventario de Existencias',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(inventarioWindow, '/inventario');

    // Menú específico para la ventana de inventario - simplificado
    const menuTemplate = [
      {
        label: 'Cerrar ventana inventario',
        click: () => {
          inventarioWindow.close();
        }
      }
    ];
    
    const inventarioMenu = Menu.buildFromTemplate(menuTemplate);
    inventarioWindow.setMenu(inventarioMenu);

    inventarioWindow.once('ready-to-show', () => {
      inventarioWindow.show();
    });

    inventarioWindow.on('closed', () => {
      this.windows.delete('inventario');
    });

    this.windows.set('inventario', inventarioWindow);
    return inventarioWindow;
  }

  closeWindow(windowName) {
    console.log(`Intentando cerrar ventana: ${windowName}`);
    console.log('Ventanas disponibles:', Array.from(this.windows.keys()));
    
    const window = this.windows.get(windowName);
    if (window && !window.isDestroyed()) {
      console.log(`Cerrando ventana ${windowName}...`);
      window.close();
      // Remover del Map después de cerrar
      this.windows.delete(windowName);
      console.log(`Ventana ${windowName} cerrada exitosamente`);
    } else {
      console.warn(`Ventana ${windowName} no encontrada o ya destruida`);
    }
  }

  closeAllWindows() {
    // Cerrar todas las ventanas secundarias
    for (const [windowName, window] of this.windows) {
      if (window && !window.isDestroyed()) {
        window.close();
      }
    }
    // Limpiar el Map
    this.windows.clear();
  }

  getWindow(windowName) {
    return this.windows.get(windowName);
  }
}

module.exports = WindowManager;