const { BrowserWindow, Menu, app } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.windows = new Map();
  }

  // Fuerza un título fijo aunque el renderer cambie document.title
  applyFixedTitle(win, fixedTitle){
    if(!win) return;
    try {
      win.setTitle(fixedTitle);
      // Bloquear futuros cambios desde el renderer (React cambiando document.title)
      win.on('page-title-updated', (e) => {
        e.preventDefault();
        if(!win.isDestroyed()) win.setTitle(fixedTitle);
      });
    } catch(err){
      console.warn('[WindowManager] No se pudo fijar título:', err?.message);
    }
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
      title: 'Usuarios',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(userWindow,'Usuarios');

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

  createImpresionFacturaWindow(parentWindow) {
    // Reutilizar si ya existe para evitar abrir dos veces la ventana
    let existing = this.windows.get('impresion-factura');
    if (existing && !existing.isDestroyed()) {
      existing.focus();
      return existing;
    }
    const impWindow = new BrowserWindow({
      width: 900,
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
      title: 'Impresión de Facturas',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(impWindow,'Impresión de Facturas');
    this.loadContent(impWindow, '/configuracion-impresion');
    const emptyMenu = Menu.buildFromTemplate([]);
    impWindow.setMenu(emptyMenu);
    impWindow.once('ready-to-show', () => { impWindow.show(); });
    impWindow.on('closed', () => { this.windows.delete('impresion-factura'); });
    this.windows.set('impresion-factura', impWindow);
    return impWindow;
  }

  createCierreCajaWindow(parentWindow){
    let existing = this.windows.get('cierre-caja');
    if(existing && !existing.isDestroyed()) { existing.focus(); return existing; }
    const win = new BrowserWindow({
      width: 900,
      height: 650,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences:{
        nodeIntegration:false,
        contextIsolation:true,
        enableRemoteModule:false,
        preload: path.join(__dirname,'../preload.js')
      },
      title:'Cierre de Caja',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable:true,
      minimizable:true,
      maximizable:true,
      frame:true,
      skipTaskbar:false
    });
    this.applyFixedTitle(win,'Cierre de Caja');
    this.loadContent(win, '/cierre-caja');
    const emptyMenu = Menu.buildFromTemplate([]);
    win.setMenu(emptyMenu);
    win.once('ready-to-show', ()=> win.show());
    win.on('closed', ()=> this.windows.delete('cierre-caja'));
    this.windows.set('cierre-caja', win);
    return win;
  }

  createRecaudacionWindow(parentWindow){
    let existing = this.windows.get('recaudacion');
    if(existing && !existing.isDestroyed()){ existing.focus(); return existing; }
    const win = new BrowserWindow({
      width: 750,
      height: 600,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences:{
        nodeIntegration:false,
        contextIsolation:true,
        enableRemoteModule:false,
        preload: path.join(__dirname,'../preload.js')
      },
      title:'Recaudación',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable:true,
      minimizable:true,
      maximizable:true,
      frame:true,
      skipTaskbar:false
    });
    this.applyFixedTitle(win,'Recaudación');
    this.loadContent(win, '/recaudacion');
    const emptyMenu = Menu.buildFromTemplate([]);
    win.setMenu(emptyMenu);
    win.once('ready-to-show', ()=> win.show());
    win.on('closed', ()=> this.windows.delete('recaudacion'));
    this.windows.set('recaudacion', win);
    return win;
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
      title: 'Empresa',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(empresaWindow,'Empresa');

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
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(sistemaWindow,'Configuración del Sistema');

    // Cargar contenido según el modo de desarrollo/producción
    this.loadContent(sistemaWindow, '/configuracion-sistema');


    // Menú nativo para configuración del sistema
    const menuTemplate = [
      {
        label: 'Opciones',
        submenu: [
          {
            label: 'Configurar Dispositivos',
            click: () => {
              this.createDispositivosWindow(sistemaWindow);
            }
          }
        ]
      }
    ];
    const sistemaMenu = Menu.buildFromTemplate(menuTemplate);
    sistemaWindow.setMenu(sistemaMenu);

    sistemaWindow.once('ready-to-show', () => {
      sistemaWindow.show();
    });

    sistemaWindow.on('closed', () => {
      this.windows.delete('configuracion-sistema');
    });

    this.windows.set('configuracion-sistema', sistemaWindow);
    return sistemaWindow;
  }
  
    createDispositivosWindow(parentWindow) {
      let existing = this.windows.get('dispositivos');
      if (existing && !existing.isDestroyed()) {
        existing.focus();
        return existing;
      }
      const win = new BrowserWindow({
        width: 600,
        height: 400,
        parent: parentWindow,
        modal: true,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          preload: path.join(__dirname, '../preload.js')
        },
        title: 'Configurar Dispositivos',
        icon: path.join(__dirname, '../icons', 'icon4.ico'),
        resizable: true,
        minimizable: true,
        maximizable: true,
        frame: true,
        skipTaskbar: false
      });
      this.applyFixedTitle(win, 'Configurar Dispositivos');
      this.loadContent(win, '/configurar-dispositivos');
      const emptyMenu = Menu.buildFromTemplate([]);
      win.setMenu(emptyMenu);
      win.once('ready-to-show', () => win.show());
      win.on('closed', () => this.windows.delete('dispositivos'));
      this.windows.set('dispositivos', win);
      return win;
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
      title: 'Clientes',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(clienteWindow,'Clientes');

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
              // Abrir directamente la ventana de créditos (reutilizar si ya existe)
              try {
                let existing = this.windows.get('credito');
                if (existing && !existing.isDestroyed()) {
                  existing.focus();
                } else if (this.createCreditoWindow) {
                  this.createCreditoWindow(clienteWindow);
                } else if (this.windowManager && this.windowManager.createCreditoWindow) {
                  this.windowManager.createCreditoWindow(clienteWindow);
                } else {
                  console.warn('[ClienteMenu] No se encontró createCreditoWindow');
                }
              } catch (e) {
                console.error('[ClienteMenu] Error abriendo ventana crédito', e);
              }
            }
          },
          {
            label: 'Ver reservaciones del cliente',
            click: () => {
              // Abrir directamente la ventana de reservas (reutilizar si ya existe)
              try {
                let existing = this.windows.get('reservas');
                if (existing && !existing.isDestroyed()) {
                  existing.focus();
                } else if (this.createReservasWindow) {
                  this.createReservasWindow(clienteWindow);
                } else if (this.windowManager && this.windowManager.createReservasWindow) {
                  this.windowManager.createReservasWindow(clienteWindow);
                } else {
                  console.warn('[ClienteMenu] No se encontró createReservasWindow');
                }
              } catch (e) {
                console.error('[ClienteMenu] Error abriendo ventana reservas', e);
              }
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

    // Asegurar que la ventana se muestra cuando el contenido está listo (sin auto DevTools)
    clienteWindow.once('ready-to-show', () => {
      try {
        clienteWindow.show();
      } catch (e) {
        console.error('[ClienteWindow] Error en ready-to-show', e);
      }
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
      title: 'Proveedores',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(proveedorWindow,'Proveedores');

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
      title: 'Productos',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(productoWindow,'Productos');

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
      title: 'Inventario',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(inventarioWindow,'Inventario');

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
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(reporteWindow,'Reporte de Ventas');

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

  createReporteComprasWindow(parentWindow) {
    const reporteComprasWindow = new BrowserWindow({
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
      title: 'Reporte de Compras',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(reporteComprasWindow,'Reporte de Compras');

    this.loadContent(reporteComprasWindow, '/reportes/compras');

    const menuTemplate = [
      {
        label: 'Transacción',
        submenu: [
          { label: 'Detalle de transacción', click: () => reporteComprasWindow.webContents.send('reporte-compras-detalle-transaccion') },
          { label: 'Eliminar transacción', click: () => reporteComprasWindow.webContents.send('reporte-compras-eliminar-transaccion') },
          { type: 'separator' },
          { label: 'Detalle de productos comprados', click: () => reporteComprasWindow.webContents.send('reporte-compras-detalle-productos') }
        ]
      },
      {
        label: 'Edición',
        submenu: [
          {
            label: 'Filtrar por fecha',
            submenu: [
              { label: 'Todas las transacciones', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-fecha-todas') },
              { label: 'Transacciones del día de hoy', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-fecha-hoy') },
              { label: 'Transacciones de una fecha…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-fecha-una') },
              { label: 'Transacciones de un periodo…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-fecha-periodo') }
            ]
          },
          {
            label: 'Filtrar por total',
            submenu: [
              { label: 'Mayor a…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-total-mayor') },
              { label: 'Menor a…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-total-menor') },
              { label: 'Igual a…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-total-igual') },
              { label: 'Entre…', click: () => reporteComprasWindow.webContents.send('reporte-compras-filtrar-total-entre') }
            ]
          },
          { type: 'separator' },
          { label: 'Totales por proveedor', click: () => reporteComprasWindow.webContents.send('reporte-compras-totales-por-proveedor') }
        ]
      },
      {
        label: 'Cerrar ventana reportes',
        click: () => reporteComprasWindow.close()
      }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    reporteComprasWindow.setMenu(menu);

    reporteComprasWindow.once('ready-to-show', () => reporteComprasWindow.show());
    reporteComprasWindow.on('closed', () => this.windows.delete('reporte-compras'));

    this.windows.set('reporte-compras', reporteComprasWindow);
    return reporteComprasWindow;
  }

  createReporteTopProductosWindow(parentWindow){
    const topWindow = new BrowserWindow({
      width: 1000,
      height: 760,
      parent: parentWindow,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration:false,
        contextIsolation:true,
        enableRemoteModule:false,
        preload: path.join(__dirname,'../preload.js')
      },
      title: 'Productos Más Vendidos',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable:true,
      minimizable:true,
      maximizable:true,
      frame:true,
      skipTaskbar:false
    });
    this.applyFixedTitle(topWindow,'Productos Más Vendidos');

    this.loadContent(topWindow, '/reportes/productos-mas-vendidos');

    const menuTemplate = [
      {
        label: 'Opciones',
        submenu: [
          { label: 'Filtrar todas las fechas', click: () => topWindow.webContents.send('reporte-top-fecha-todas') },
          { label: 'De hoy', click: () => topWindow.webContents.send('reporte-top-fecha-hoy') },
          { label: 'De una fecha…', click: () => topWindow.webContents.send('reporte-top-fecha-una') },
          { label: 'De un periodo…', click: () => topWindow.webContents.send('reporte-top-fecha-periodo') }
        ]
      },
      {
        label: 'Límites',
        submenu: [
          { label: 'Top 50', click: () => topWindow.webContents.send('reporte-top-limit-50') },
          { label: 'Top 100', click: () => topWindow.webContents.send('reporte-top-limit-100') }
        ]
      },
      { label: 'Cerrar ventana', click: ()=> topWindow.close() }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    topWindow.setMenu(menu);

    topWindow.once('ready-to-show', ()=> topWindow.show());
    topWindow.on('closed', ()=> this.windows.delete('reporte-top-productos'));
    this.windows.set('reporte-top-productos', topWindow);
    return topWindow;
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
      title: 'Ventas',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(ventasWindow,'Ventas');

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
      title: 'Compras',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(comprasWindow,'Compras');

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
      title: 'Créditos',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(creditoWindow,'Créditos');

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
      title: 'Reservas',
      icon: path.join(__dirname, '../icons', 'icon4.ico'),
      resizable: true,
      minimizable: true,
      maximizable: true,
      frame: true,
      skipTaskbar: false
    });
    this.applyFixedTitle(reservasWindow,'Reservas');

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