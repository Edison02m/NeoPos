const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App operations
  quitApp: () => ipcRenderer.invoke('quitApp'),

  // Database operations
  dbInitialize: () => ipcRenderer.invoke('db-initialize'),
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  dbGetSingle: (query, params) => ipcRenderer.invoke('db-get-single', query, params),
  dbRun: (query, params) => ipcRenderer.invoke('db-run', query, params),

  // Authentication with bcrypt
  authenticateUser: (usuario, contrasena) => ipcRenderer.invoke('authenticate-user', usuario, contrasena),

  // Menu state handlers
    updateMenuAuthenticated: () => ipcRenderer.invoke('update-menu-authenticated'),
    updateMenuUnauthenticated: () => ipcRenderer.invoke('update-menu-unauthenticated'),
    
    // Window management
    openUsersWindow: () => ipcRenderer.invoke('open-users-window'),
    openEmpresaWindow: () => ipcRenderer.invoke('open-empresa-window'),
    openConfiguracionSistemaWindow: () => ipcRenderer.invoke('open-configuracion-sistema-window'),
    openClienteWindow: () => ipcRenderer.invoke('open-cliente-window'),
    openProveedorWindow: () => ipcRenderer.invoke('open-proveedor-window'),
    openProductoWindow: () => ipcRenderer.invoke('open-producto-window'),
    openInventarioWindow: () => ipcRenderer.invoke('open-inventario-window'),
    openVentasWindow: () => ipcRenderer.invoke('open-ventas-window'),
  openImpresionFacturaWindow: () => ipcRenderer.invoke('open-impresion-factura-window'),
  openCierreCajaWindow: () => ipcRenderer.invoke('open-cierre-caja-window'),
  openRecaudacionWindow: () => ipcRenderer.invoke('open-recaudacion-window'),
  // Reportes windows
  openReporteVentasWindow: () => ipcRenderer.invoke('open-reporte-ventas-window'),
  openReporteComprasWindow: () => ipcRenderer.invoke('open-reporte-compras-window'),
  openCreditoWindow: () => ipcRenderer.invoke('open-credito-window'),
  openReservasWindow: () => ipcRenderer.invoke('open-reservas-window'),
    closeWindow: (windowName) => ipcRenderer.invoke('close-window', windowName),
    closeCurrentWindow: () => ipcRenderer.invoke('close-current-window'),

  // Información de la aplicación
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
  },

  // Manejo de archivos
  getFilePath: async (file) => {
    // Para aplicaciones Electron, obtener la ruta completa del archivo
    try {
      if (file && file.path) {
        return file.path;
      }
      // Fallback para navegadores web
      return file.name;
    } catch (error) {
      console.error('Error obteniendo ruta del archivo:', error);
      return file.name;
    }
  },

  // Convertir imagen local a base64
  getImageAsBase64: (filePath) => ipcRenderer.invoke('get-image-base64', filePath),

  // Validar si un archivo existe
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  // Leer imagen como base64 para mostrar en la interfaz
  readImageAsBase64: (filePath) => ipcRenderer.invoke('read-image-as-base64', filePath),

  // Generación de reportes
  generateExcelReport: (data, filename, sheetName) => ipcRenderer.invoke('generate-excel-report', data, filename, sheetName),
  generatePDFReport: (reportData, filename) => ipcRenderer.invoke('generate-pdf-report', reportData, filename),
  openPDF: (filePath) => ipcRenderer.invoke('open-pdf', filePath),
  // Control del menú de Compras (checkbox Aplicar Descuento)
  setComprasDescuentoMenu: (checked) => ipcRenderer.invoke('compras-set-descuento', checked),
  // Control de radio buttons forma de pago en menú Compras
  setComprasFormaPagoMenu: (fpago) => ipcRenderer.invoke('compras-set-forma-pago', fpago),
  
  // Diálogos de archivo
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

    // Eventos del menú
  onMenuAction: (callback) => {
    const validActions = [
  // Ventas window specific
  'menu-nueva-venta',
  'menu-buscar-producto',
  'menu-historial-ventas',
  'menu-venta-contado',
  'menu-venta-credito',
  'menu-venta-plan',
  'menu-pago-efectivo',
  'menu-pago-cheque',
  'menu-pago-tarjeta-mastercard',
  'menu-pago-tarjeta-visa',
  'menu-pago-tarjeta-diners',
  'menu-pago-tarjeta-cuota-facil',
  'menu-pago-tarjeta-amex',
  'menu-editar-comprobante',
      'menu-new-sale',
      'menu-search-product',
      'menu-sales-history',
  'menu-reports',
  'menu-reports-sales',
  'menu-reports-purchases',
  'menu-reports-top-products',
  'menu-reports-sri-declarations',
      'menu-products',
      'menu-categories',
      'menu-suppliers',
      'menu-logout',
      'menu-config-user',
      'menu-config-company',
      'menu-config-sistema',
  'menu-config-invoice-printing',
      'menu-inventory-customers',
      'menu-inventory-suppliers',
      'menu-ver-personas',
      'menu-ver-empresas',
      'menu-ver-credito',
      'menu-ver-reservaciones',
      // Eventos específicos del menú de productos
      'menu-buscar-descripcion',
      'menu-inventory-customers',
      'menu-buscar-codigo-auxiliar',
      'menu-filtrar-productos',
      'menu-marcar-producto',
      'menu-productos-marcados',
      'menu-primer-registro',
      'menu-siguiente-registro',
      'menu-anterior-registro',
      'menu-ultimo-registro',
  'menu-ir-registro',
  'menu-reporte-productos',
  // Reporte de Ventas window specific
  'reporte-ventas-detalle-transaccion',
  'reporte-ventas-eliminar-transaccion',
  'reporte-ventas-crear-comprobante',
  'reporte-ventas-detalle-productos',
  'reporte-ventas-filtrar-fecha-todas',
  'reporte-ventas-filtrar-fecha-hoy',
  'reporte-ventas-filtrar-fecha-una',
  'reporte-ventas-filtrar-fecha-periodo',
  'reporte-ventas-filtrar-forma-todas',
  'reporte-ventas-filtrar-forma-efectivo',
  'reporte-ventas-filtrar-forma-cheque',
  'reporte-ventas-filtrar-forma-tarjeta',
  'reporte-ventas-totales-por-forma',
  // Reporte de Compras window specific
  'reporte-compras-detalle-transaccion',
  'reporte-compras-eliminar-transaccion',
  'reporte-compras-detalle-productos',
  'reporte-compras-filtrar-fecha-todas',
  'reporte-compras-filtrar-fecha-hoy',
  'reporte-compras-filtrar-fecha-una',
  'reporte-compras-filtrar-fecha-periodo',
  'reporte-compras-filtrar-total-mayor',
  'reporte-compras-filtrar-total-menor',
  'reporte-compras-filtrar-total-igual',
  'reporte-compras-filtrar-total-entre',
  'reporte-compras-totales-por-proveedor',
  // Reporte Productos Más Vendidos
  'reporte-top-fecha-todas',
  'reporte-top-fecha-hoy',
  'reporte-top-fecha-una',
  'reporte-top-fecha-periodo',
  'reporte-top-exportar-excel',
  'reporte-top-exportar-pdf',
  'reporte-top-limit-50',
  'reporte-top-limit-100',
  // Crédito window specific
  'menu-credito-registrar-abono',
  'menu-credito-imprimir',
  'menu-credito-ver-datos-cliente',
  'menu-credito-ver-detalle',
  'menu-credito-ver-abonos',
  'menu-credito-filtrar-fecha-hoy',
  'menu-credito-filtrar-fecha-30',
  'menu-credito-filtrar-saldo-pendiente',
  'menu-credito-filtrar-saldo-cancelado',
  // Reservas window specific
  'menu-reserva-imprimir',
  'menu-reserva-ver-datos-cliente',
  'menu-reserva-ver-detalle',
  'menu-reserva-convertir',
  'menu-reserva-cancelar',
  'menu-reserva-filtrar-todas',
  'menu-reserva-filtrar-activas',
  'menu-reserva-filtrar-completadas',
  'menu-reserva-filtrar-canceladas',
  // Compras window specific
  'menu-nueva-compra',
  'menu-guardar-compra',
  'menu-buscar-producto', // ya existe pero se reutiliza
  'menu-seleccionar-proveedor',
  'menu-historial-compras',
  'menu-compras-proveedor',
  'menu-pago-efectivo', // reutilizado
  'menu-pago-cheque',
  'menu-pago-credito',
  'menu-aplicar-iva',
  'menu-aplicar-descuento',
      // Eventos específicos del menú de inventario
      'menu-actualizar-inventario',
      'menu-filtrar-stock-bajo',
      'menu-filtrar-alto-valor',
      'menu-filtrar-bajo-valor',
      'menu-mostrar-todos',
      'menu-generar-pdf',
      'menu-exportar-excel',
      'menu-config-invoice-printing',
      'menu-buscar-producto'
    ];

    // El array tenía acciones duplicadas (p.ej. 'menu-config-invoice-printing') provocando doble disparo.
    // Lo normalizamos para que cada acción se registre solo una vez.
  const uniqueActions = [...new Set(validActions.concat(['menu-utilities-cash-closing','menu-utilities-recaudacion']))];
    uniqueActions.forEach(action => {
      const handler = () => {
        console.log(`[PRELOAD] Evento recibido: ${action}`);
        try {
          callback(action);
        } catch (e) {
          console.warn('[PRELOAD] Error ejecutando callback onMenuAction:', e);
        }
        // Cola temprana y CustomEvent para renderers que aún no montan
        try {
          if (!window.__pendingMenuActions) window.__pendingMenuActions = [];
          window.__pendingMenuActions.push({ action, ts: Date.now() });
          window.dispatchEvent(new CustomEvent('menu-action', { detail: action }));
        } catch (e) {
          console.warn('[PRELOAD] No se pudo despachar CustomEvent menu-action:', e);
        }
      };
      ipcRenderer.on(action, handler);
    });

    return () => {
      uniqueActions.forEach(action => {
        ipcRenderer.removeAllListeners(action);
      });
    };
  },

  // Función onMenuEvent para compatibilidad
  onMenuEvent: (callback) => {
    console.log('[PRELOAD] Registrando listeners de menú...');
    
  const validActions = [
  // Ventas window specific
  'menu-nueva-venta',
  'menu-buscar-producto',
  'menu-guardar-venta',
  'menu-buscar-cliente',
  'menu-nuevo-cliente',
  'menu-imprimir-comprobante',
  'menu-historial-ventas',
  'menu-venta-contado',
  'menu-venta-credito',
  'menu-venta-plan',
  'menu-pago-efectivo',
  'menu-pago-cheque',
  'menu-pago-tarjeta-mastercard',
  'menu-pago-tarjeta-visa',
  'menu-pago-tarjeta-diners',
  'menu-pago-tarjeta-cuota-facil',
  'menu-pago-tarjeta-amex',
  'menu-editar-comprobante',
      'menu-new-sale',
      'menu-search-product',
      'menu-sales-history',
  'menu-reports',
  'menu-reports-sales',
  'menu-reports-purchases',
  'menu-reports-top-products',
  'menu-reports-sri-declarations',
      'menu-products',
      'menu-categories',
      'menu-suppliers',
      'menu-logout',
      'menu-config-user',
      'menu-config-company',
      'menu-config-sistema',
      'menu-inventory-customers',
      'menu-inventory-suppliers',
      'menu-ver-personas',
      'menu-ver-empresas',
      'menu-ver-credito',
      'menu-ver-reservaciones',
      // Eventos específicos del menú de productos
      'menu-buscar-descripcion',
      'menu-buscar-codigo-barras',
      'menu-buscar-codigo-auxiliar',
      'menu-filtrar-productos',
      'menu-marcar-producto',
      'menu-productos-marcados',
      'menu-primer-registro',
      'menu-siguiente-registro',
      'menu-anterior-registro',
      'menu-ultimo-registro',
  'menu-ir-registro',
  'menu-reporte-productos',
  // Reporte de Ventas window specific
  'reporte-ventas-detalle-transaccion',
  'reporte-ventas-eliminar-transaccion',
  'reporte-ventas-crear-comprobante',
  'reporte-ventas-detalle-productos',
  'reporte-ventas-filtrar-fecha-todas',
  'reporte-ventas-filtrar-fecha-hoy',
  'reporte-ventas-filtrar-fecha-una',
  'reporte-ventas-filtrar-fecha-periodo',
  'reporte-ventas-filtrar-forma-todas',
  'reporte-ventas-filtrar-forma-efectivo',
  'reporte-ventas-filtrar-forma-cheque',
  'reporte-ventas-filtrar-forma-tarjeta',
  'reporte-ventas-totales-por-forma'
  , 'menu-nueva-compra','menu-guardar-compra','menu-seleccionar-proveedor','menu-historial-compras','menu-compras-proveedor','menu-aplicar-iva','menu-aplicar-descuento'
  // Crédito window specific
  ,'menu-credito-registrar-abono','menu-credito-imprimir','menu-credito-ver-datos-cliente','menu-credito-ver-detalle','menu-credito-ver-abonos','menu-credito-filtrar-fecha-hoy','menu-credito-filtrar-fecha-30','menu-credito-filtrar-saldo-pendiente','menu-credito-filtrar-saldo-cancelado'
  // Reservas window specific
  ,'menu-reserva-registrar-abono','menu-reserva-imprimir','menu-reserva-ver-datos-cliente','menu-reserva-ver-detalle','menu-reserva-ver-abonos','menu-reserva-filtrar-activas','menu-reserva-filtrar-completadas'
  ,'menu-reserva-convertir','menu-reserva-cancelar'
    ];

    console.log('[PRELOAD] Eventos válidos registrados:', validActions);

    validActions.forEach(action => {
      const handler = (event, message) => {
        console.log(`[PRELOAD] *** EVENTO RECIBIDO: ${action} ***`);
        console.log(`[PRELOAD] Event:`, event);
        console.log(`[PRELOAD] Message:`, message || action);
        callback(event, message || action);
      };
      ipcRenderer.on(action, handler);
      console.log(`[PRELOAD] Listener registrado para: ${action}`);
    });

    return () => {
      validActions.forEach(action => {
        ipcRenderer.removeAllListeners(action);
      });
    };
  },

  // Función para remover listener de menú
  removeMenuListener: (callback) => {
    // Esta función es para compatibilidad, pero no hace nada específico
    // ya que los listeners se manejan internamente
  },

  // Remover listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Canal simple para refrescar reservas
  reservas: {
    onRefresh: (callback) => {
      ipcRenderer.on('reservas:refresh', (_e, payload) => callback(payload));
      return () => ipcRenderer.removeAllListeners('reservas:refresh');
    },
    triggerRefresh: () => ipcRenderer.send('reservas:refresh', { ts: Date.now() })
  },

  // Inventario APIs
  inventario: {
    getAll: () => ipcRenderer.invoke('inventario-get-all'),
    search: (searchTerm) => ipcRenderer.invoke('inventario-search', searchTerm),
    getStockBajo: (minimo) => ipcRenderer.invoke('inventario-stock-bajo', minimo),
    getPorRangoPrecio: (precioMin, precioMax) => ipcRenderer.invoke('inventario-por-rango-precio', precioMin, precioMax),
    generarReporte: () => ipcRenderer.invoke('inventario-generar-reporte')
  },
  // Comprobantes APIs
  comprobantes: {
    listar: (codempresa = 1) => ipcRenderer.invoke('comprobante-listar', { codempresa }),
    actualizarPrefijos: (sigla, prefijo1, prefijo2, codempresa = 1) => ipcRenderer.invoke('comprobante-actualizar-prefijos', { sigla, prefijo1, prefijo2, codempresa }),
    actualizarContador: (sigla, contador, codempresa = 1) => ipcRenderer.invoke('comprobante-actualizar-contador', { sigla, contador, codempresa })
  }
});

// Deshabilitar el acceso directo a require en el renderer process
window.require = undefined;