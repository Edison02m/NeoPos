const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App operations
  quitApp: () => ipcRenderer.invoke('quitApp'),

  // Database operations
  dbInitialize: () => ipcRenderer.invoke('db-initialize'),
  dbQuery: (query, params) => ipcRenderer.invoke('db-query', query, params),
  dbGetSingle: (query, params) => ipcRenderer.invoke('db-get-single', query, params),
  dbRun: (query, params) => ipcRenderer.invoke('db-run', query, params),

  // Menu state handlers
    updateMenuAuthenticated: () => ipcRenderer.invoke('update-menu-authenticated'),
    updateMenuUnauthenticated: () => ipcRenderer.invoke('update-menu-unauthenticated'),
    
    // Window management
    openUsersWindow: () => ipcRenderer.invoke('open-users-window'),
    openEmpresaWindow: () => ipcRenderer.invoke('open-empresa-window'),
    openClienteWindow: () => ipcRenderer.invoke('open-cliente-window'),
    openProveedorWindow: () => ipcRenderer.invoke('open-proveedor-window'),
    openProductoWindow: () => ipcRenderer.invoke('open-producto-window'),
    closeWindow: (windowName) => ipcRenderer.invoke('close-window', windowName),
    closeCurrentWindow: () => ipcRenderer.invoke('quitApp'),

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

  // Validar si un archivo existe
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),

  // Leer imagen como base64 para mostrar en la interfaz
  readImageAsBase64: (filePath) => ipcRenderer.invoke('read-image-as-base64', filePath),

  // Eventos del menú
  onMenuAction: (callback) => {
    const validActions = [
      'menu-new-sale',
      'menu-search-product',
      'menu-sales-history',
      'menu-reports',
      'menu-products',
      'menu-categories',
      'menu-suppliers',
      'menu-logout',
      'menu-config-user',
      'menu-config-company',
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
      'menu-reporte-inventario',
      'menu-reporte-productos'
    ];

    validActions.forEach(action => {
      const handler = () => {
        console.log(`[PRELOAD] Evento recibido: ${action}`);
        callback(action);
      };
      ipcRenderer.on(action, handler);
    });

    return () => {
      validActions.forEach(action => {
        ipcRenderer.removeAllListeners(action);
      });
    };
  },

  // Función onMenuEvent para compatibilidad
  onMenuEvent: (callback) => {
    console.log('[PRELOAD] Registrando listeners de menú...');
    
    const validActions = [
      'menu-new-sale',
      'menu-search-product',
      'menu-sales-history',
      'menu-reports',
      'menu-products',
      'menu-categories',
      'menu-suppliers',
      'menu-logout',
      'menu-config-user',
      'menu-config-company',
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
      'menu-reporte-inventario',
      'menu-reporte-productos'
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
  }
});

// Deshabilitar el acceso directo a require en el renderer process
window.require = undefined;