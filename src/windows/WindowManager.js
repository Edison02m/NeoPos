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
      const targetUrl = `http://localhost:3000/#${route}`;
      console.log(`[WindowManager] Cargando URL (dev): ${targetUrl}`);
      window.loadURL(targetUrl);

      // Diagnósticos de carga en desarrollo
      window.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('[WindowManager] did-fail-load:', { errorCode, errorDescription, validatedURL });
      });
      window.webContents.on('did-finish-load', () => {
        console.log('[WindowManager] did-finish-load OK:', targetUrl);
      });
      window.webContents.on('console-message', (event, level, message, line, sourceId) => {
        // Reenviar mensajes de consola del renderer al proceso principal para depuración
        console.log(`[Renderer][lvl:${level}] ${message} (${sourceId}:${line})`);
      });
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

  createConfiguracionSistemaWindow(parentWindow) {
    const sistemaWindow = new BrowserWindow({
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
      title: 'Configuración del Sistema',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(sistemaWindow, '/configuracion-sistema');

    // Establecer menú vacío para esta ventana específica
    const emptyMenu = Menu.buildFromTemplate([]);
    sistemaWindow.setMenu(emptyMenu);

    sistemaWindow.once('ready-to-show', () => {
      sistemaWindow.show();
    });

    sistemaWindow.on('closed', () => {
      this.windows.delete('configuracion-sistema');
    });

    this.windows.set('configuracion-sistema', sistemaWindow);
    return sistemaWindow;
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

  createReporteVentasWindow(parentWindow) {
    const reporteWindow = new BrowserWindow({
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
      title: 'Reporte de Ventas',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido a la ruta del reporte
    this.loadContent(reporteWindow, '/reportes/ventas');

    // Menú completo para Reporte de Ventas (similar al legacy)
    const menuTemplate = [
      {
        label: 'Transacción',
        submenu: [
          { label: 'Detalle de transacción', click: () => reporteWindow.webContents.send('reporte-ventas-detalle-transaccion') },
          { label: 'Eliminar transacción', click: () => reporteWindow.webContents.send('reporte-ventas-eliminar-transaccion') },
          { type: 'separator' },
          { label: 'Crear comprobante', click: () => reporteWindow.webContents.send('reporte-ventas-crear-comprobante') },
          { type: 'separator' },
          { label: 'Detalle de productos vendidos', click: () => reporteWindow.webContents.send('reporte-ventas-detalle-productos') }
        ]
      },
      {
        label: 'Edición',
        submenu: [
          {
            label: 'Filtrar por fecha',
            submenu: [
              { label: 'Todas las transacciones', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-fecha-todas') },
              { label: 'Transacciones del día de hoy', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-fecha-hoy') },
              { label: 'Transacciones de una fecha…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-fecha-una') },
              { label: 'Transacciones de un periodo…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-fecha-periodo') }
            ]
          },
          {
            label: 'Filtrar por total',
            submenu: [
              { label: 'Mayor a…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-total-mayor') },
              { label: 'Menor a…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-total-menor') },
              { label: 'Igual a…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-total-igual') },
              { label: 'Entre…', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-total-entre') }
            ]
          },
          {
            label: 'Filtrar por forma de pago',
            submenu: [
              { label: 'Todas', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-forma-todas') },
              { label: 'Efectivo', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-forma-efectivo') },
              { label: 'Cheque', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-forma-cheque') },
              { label: 'Tarjeta', click: () => reporteWindow.webContents.send('reporte-ventas-filtrar-forma-tarjeta') }
            ]
          },
          { type: 'separator' },
          { label: 'Totales por forma de pago', click: () => reporteWindow.webContents.send('reporte-ventas-totales-por-forma') }
        ]
      },
      {
        label: 'Cerrar ventana reportes',
        click: () => reporteWindow.close()
      }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    reporteWindow.setMenu(menu);

    reporteWindow.once('ready-to-show', () => reporteWindow.show());
    reporteWindow.on('closed', () => this.windows.delete('reporte-ventas'));

    this.windows.set('reporte-ventas', reporteWindow);
    return reporteWindow;
  }

  createVentasWindow(parentWindow) {
    const ventasWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Punto de Venta',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(ventasWindow, '/ventas');

    // Logs adicionales de diagnóstico específicos para Ventas
    ventasWindow.webContents.on('dom-ready', () => {
      console.log('[VentasWindow] dom-ready');
    });
    ventasWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[VentasWindow] did-fail-load:', { errorCode, errorDescription, validatedURL });
    });
    ventasWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[VentasWindow][lvl:${level}] ${message} (${sourceId}:${line})`);
    });

    // Menú específico para la ventana de ventas
    const menuTemplate = [
      {
        label: 'Ventas',
        submenu: [
          {
            label: 'Nueva Venta',
            accelerator: 'Ctrl+N',
            click: () => {
              ventasWindow.webContents.send('menu-nueva-venta');
            }
          },
          {
            label: 'Guardar Venta',
            accelerator: 'Ctrl+S',
            click: () => {
              ventasWindow.webContents.send('menu-guardar-venta');
            }
          },
          { type: 'separator' },
          {
            label: 'Imprimir Comprobante',
            accelerator: 'Ctrl+P',
            click: () => {
              ventasWindow.webContents.send('menu-imprimir-comprobante');
            }
          }
        ]
      },
      {
        label: 'Cliente',
        submenu: [
          {
            label: 'Nuevo Cliente',
            accelerator: 'Ctrl+Alt+N',
            click: () => {
              // Abrir la ventana de clientes para registrar uno nuevo
              if (this.windowManager && this.windowManager.createClienteWindow) {
                this.windowManager.createClienteWindow(ventasWindow);
              } else if (this.createClienteWindow) {
                this.createClienteWindow(ventasWindow);
              } else {
                ventasWindow.webContents.send('menu-nuevo-cliente');
              }
            }
          }
        ]
      },
      {
        label: 'Ver',
        submenu: [
          {
            label: 'Historial de Ventas',
            accelerator: 'Ctrl+H',
            click: () => {
              ventasWindow.webContents.send('menu-historial-ventas');
            }
          }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          {
            label: 'Tipo de venta',
            submenu: [
              {
                label: 'Venta al contado',
                type: 'radio',
                checked: true,
                click: () => ventasWindow.webContents.send('menu-venta-contado')
              },
              {
                label: 'Venta a crédito',
                type: 'radio',
                click: () => ventasWindow.webContents.send('menu-venta-credito')
              },
              {
                label: 'Venta con plan acumulativo',
                type: 'radio',
                click: () => ventasWindow.webContents.send('menu-venta-plan')
              }
            ]
          },
          { type: 'separator' },
          {
            label: 'Editar comprobantes',
            accelerator: 'Ctrl+Shift+E',
            click: () => ventasWindow.webContents.send('menu-editar-comprobante')
          },
          { type: 'separator' },
          {
            label: 'Pago en efectivo',
            click: () => ventasWindow.webContents.send('menu-pago-efectivo')
          },
          {
            label: 'Pago con cheque',
            click: () => ventasWindow.webContents.send('menu-pago-cheque')
          },
          {
            label: 'Pago con tarjeta de crédito',
            submenu: [
              { label: 'Mastercard', click: () => ventasWindow.webContents.send('menu-pago-tarjeta-mastercard') },
              { label: 'Visa', click: () => ventasWindow.webContents.send('menu-pago-tarjeta-visa') },
              { label: 'Diners Club', click: () => ventasWindow.webContents.send('menu-pago-tarjeta-diners') },
              { label: 'Cuota Fácil', click: () => ventasWindow.webContents.send('menu-pago-tarjeta-cuota-facil') },
              { label: 'American Express', click: () => ventasWindow.webContents.send('menu-pago-tarjeta-amex') }
            ]
          }
        ]
      },
      {
        label: 'Ventana',
        submenu: [
          {
            label: 'Cerrar ventana',
            accelerator: 'Ctrl+W',
            click: () => {
              ventasWindow.close();
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    ventasWindow.setMenu(menu);

    ventasWindow.once('ready-to-show', () => {
      ventasWindow.show();
    });

    ventasWindow.on('closed', () => {
      this.windows.delete('ventas');
    });

    this.windows.set('ventas', ventasWindow);
    return ventasWindow;
  }

  createComprasWindow(parentWindow) {
    const comprasWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../preload.js')
      },
      title: 'Gestión de Compras',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(comprasWindow, '/compras');

    // Logs adicionales de diagnóstico específicos para Compras
    comprasWindow.webContents.on('dom-ready', () => {
      console.log('[ComprasWindow] dom-ready');
    });
    comprasWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[ComprasWindow] did-fail-load:', { errorCode, errorDescription, validatedURL });
    });
    comprasWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[ComprasWindow][lvl:${level}] ${message} (${sourceId}:${line})`);
    });

    // Menú específico para la ventana de compras
    const menuTemplate = [
      {
        label: 'Compras',
        submenu: [
          {
            label: 'Nueva Compra',
            accelerator: 'Ctrl+N',
            click: () => {
              comprasWindow.webContents.send('menu-nueva-compra');
            }
          },
          {
            label: 'Guardar Compra',
            accelerator: 'Ctrl+S',
            click: () => {
              comprasWindow.webContents.send('menu-guardar-compra');
            }
          },
          { type: 'separator' },
          {
            label: 'Buscar Producto',
            accelerator: 'F2',
            click: () => {
              comprasWindow.webContents.send('menu-buscar-producto');
            }
          },
          {
            label: 'Seleccionar Proveedor',
            accelerator: 'Ctrl+P',
            click: () => {
              comprasWindow.webContents.send('menu-seleccionar-proveedor');
            }
          }
        ]
      },
      {
        label: 'Proveedor',
        submenu: [
          {
            label: 'Nuevo Proveedor',
            accelerator: 'Ctrl+Alt+N',
            click: () => {
              // Abrir la ventana de proveedores para registrar uno nuevo
              if (this.createProveedorWindow) {
                this.createProveedorWindow(comprasWindow);
              } else {
                comprasWindow.webContents.send('menu-nuevo-proveedor');
              }
            }
          }
        ]
      },
      {
        label: 'Ver',
        submenu: [
          {
            label: 'Historial de Compras',
            accelerator: 'Ctrl+H',
            click: () => {
              comprasWindow.webContents.send('menu-historial-compras');
            }
          },
          {
            label: 'Compras por Proveedor',
            click: () => {
              comprasWindow.webContents.send('menu-compras-proveedor');
            }
          }
        ]
      },
      {
        label: 'Editar',
        submenu: [
          {
            label: 'Forma de pago',
            submenu: [
              {
                label: 'Pago en efectivo',
                type: 'radio',
                checked: true,
                id: 'compras-pago-efectivo',
                click: () => comprasWindow.webContents.send('menu-pago-efectivo')
              },
              {
                label: 'Pago con cheque',
                type: 'radio',
                id: 'compras-pago-cheque',
                click: () => comprasWindow.webContents.send('menu-pago-cheque')
              },
              {
                label: 'Pago a crédito',
                type: 'radio',
                id: 'compras-pago-credito',
                click: () => comprasWindow.webContents.send('menu-pago-credito')
              }
            ]
          },
          { type: 'separator' },
          {
            label: 'Aplicar IVA',
            type: 'checkbox',
            checked: true,
            click: () => comprasWindow.webContents.send('menu-aplicar-iva')
          },
          {
            label: 'Aplicar Descuento',
            type: 'checkbox',
            checked: false,
            id: 'compras-aplicar-descuento',
            click: (menuItem) => {
              // Alterna modo descuento en renderer
              comprasWindow.webContents.send('menu-aplicar-descuento');
            }
          }
        ]
      },
      {
        label: 'Ventana',
        submenu: [
          {
            label: 'Cerrar ventana',
            accelerator: 'Ctrl+W',
            click: () => {
              comprasWindow.close();
            }
          }
        ]
      }
    ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  // Guardar referencia para poder actualizar estado de checkboxes vía IPC
  comprasWindow._menu = menu;
  comprasWindow.setMenu(menu);

    comprasWindow.once('ready-to-show', () => {
      comprasWindow.show();
    });

    comprasWindow.on('closed', () => {
      this.windows.delete('compras');
    });

    this.windows.set('compras', comprasWindow);
    return comprasWindow;
  }

  createCreditoWindow(parentWindow) {
    const creditoWindow = new BrowserWindow({
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
      title: 'Créditos de Clientes',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    this.loadContent(creditoWindow, '/credito');

    creditoWindow.webContents.on('dom-ready', () => {
      console.log('[CreditoWindow] dom-ready');
    });

    const menuTemplate = [
      {
        label: 'Crédito',
        submenu: [
          {
            label: 'Registrar abono',
            accelerator: 'Ctrl+N',
            click: () => creditoWindow.webContents.send('menu-credito-registrar-abono')
          },
          { type: 'separator' },
          {
            label: 'Imprimir',
            click: () => creditoWindow.webContents.send('menu-credito-imprimir')
          }
        ]
      },
      {
        label: 'Edición',
        submenu: [
          {
            label: 'Ver datos del cliente',
            click: () => creditoWindow.webContents.send('menu-credito-ver-datos-cliente')
          },
            {
              label: 'Ver detalle del Crédito',
              click: () => creditoWindow.webContents.send('menu-credito-ver-detalle')
            },
            {
              label: 'Ver abonos realizados',
              click: () => creditoWindow.webContents.send('menu-credito-ver-abonos')
            },
            { type: 'separator' },
            {
              label: 'Filtrar por Fecha',
              submenu: [
                {
                  label: 'Hoy',
                  click: () => creditoWindow.webContents.send('menu-credito-filtrar-fecha-hoy')
                },
                {
                  label: 'Últimos 30 días',
                  click: () => creditoWindow.webContents.send('menu-credito-filtrar-fecha-30')
                }
              ]
            },
            {
              label: 'Filtrar por Saldo',
              submenu: [
                {
                  label: 'Con saldo pendiente',
                  click: () => creditoWindow.webContents.send('menu-credito-filtrar-saldo-pendiente')
                },
                {
                  label: 'Cancelados',
                  click: () => creditoWindow.webContents.send('menu-credito-filtrar-saldo-cancelado')
                }
              ]
            }
        ]
      },
      {
        label: 'Ventana',
        submenu: [
          {
            label: 'Cerrar la ventana Crédito',
            accelerator: 'Ctrl+W',
            click: () => creditoWindow.close()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    creditoWindow.setMenu(menu);

    creditoWindow.once('ready-to-show', () => creditoWindow.show());
    creditoWindow.on('closed', () => this.windows.delete('credito'));
    this.windows.set('credito', creditoWindow);
    return creditoWindow;
  }

  createReservasWindow(parentWindow) {
    const reservasWindow = new BrowserWindow({
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
      title: 'Reservaciones de Clientes',
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });

    this.loadContent(reservasWindow, '/reservaciones');

    reservasWindow.webContents.on('dom-ready', () => {
      console.log('[ReservasWindow] dom-ready');
    });

    const menuTemplate = [
      {
        label: 'Reservaciones',
        submenu: [
          // Opción de registrar abono removida
          {
            label: 'Convertir a Venta',
            accelerator: 'Ctrl+Shift+V',
            click: () => reservasWindow.webContents.send('menu-reserva-convertir')
          },
          {
            label: 'Cancelar Reserva',
            accelerator: 'Ctrl+Shift+X',
            click: () => reservasWindow.webContents.send('menu-reserva-cancelar')
          },
          { type: 'separator' },
          {
            label: 'Imprimir',
            click: () => reservasWindow.webContents.send('menu-reserva-imprimir')
          }
        ]
      },
      {
        label: 'Edición',
        submenu: [
          {
            label: 'Ver datos del cliente',
            click: () => reservasWindow.webContents.send('menu-reserva-ver-datos-cliente')
          },
          {
            label: 'Ver detalle de Reservación',
            click: () => reservasWindow.webContents.send('menu-reserva-ver-detalle')
          },
          // Opción ver abonos removida
          {
            label: 'Filtrar por Estado',
            submenu: [
              { label: 'Todas', click: () => reservasWindow.webContents.send('menu-reserva-filtrar-todas') },
              { label: 'Activas', click: () => reservasWindow.webContents.send('menu-reserva-filtrar-activas') },
              { label: 'Completadas', click: () => reservasWindow.webContents.send('menu-reserva-filtrar-completadas') },
              { label: 'Canceladas', click: () => reservasWindow.webContents.send('menu-reserva-filtrar-canceladas') }
            ]
          }
        ]
      },
      {
        label: 'Ventana',
        submenu: [
          {
            label: 'Cerrar la ventana Reservaciones',
            accelerator: 'Ctrl+W',
            click: () => reservasWindow.close()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    reservasWindow.setMenu(menu);

    reservasWindow.once('ready-to-show', () => reservasWindow.show());
    reservasWindow.on('closed', () => this.windows.delete('reservaciones'));
    this.windows.set('reservaciones', reservasWindow);
    return reservasWindow;
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