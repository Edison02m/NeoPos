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
    closeWindow: (windowName) => ipcRenderer.invoke('close-window', windowName),
    closeCurrentWindow: () => ipcRenderer.invoke('quitApp'),

  // Información de la aplicación
  app: {
    getVersion: () => ipcRenderer.invoke('get-app-version'),
  },

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
      'menu-ver-reservaciones'
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
      'menu-ver-reservaciones'
    ];

    validActions.forEach(action => {
      const handler = (event, message) => {
        console.log(`[PRELOAD] Menu event recibido: ${action}`);
        callback(event, message || action);
      };
      ipcRenderer.on(action, handler);
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