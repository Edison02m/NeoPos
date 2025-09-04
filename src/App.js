import React, { useState, useEffect } from 'react';
import { HashRouter as Router, useNavigate } from 'react-router-dom';
import './index.css';

import AppRoutes from './routes';
import startScanGuard from './utils/scanGuard';

function AppContent() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Start the global scan guard to block scanner keystrokes outside ventas/productos routes
    const stopScanGuard = startScanGuard();
    
        
        // Handle menu logout event
        const handleMenuLogout = () => {
      
            handleLogout();
        };

        // Handle menu user config event
        const handleMenuUserConfig = async () => {
        
            if (window.electronAPI?.openUsersWindow) {
          
                try {
                    const result = await window.electronAPI.openUsersWindow();
              
                } catch (error) {
              
                }
            } else {
          
          
            }
        };

        // Handle menu company config event
        const handleMenuCompanyConfig = async () => {
            try {
                const result = await window.electronAPI.openEmpresaWindow();
                if (!result.success) {
                    console.error('Error al abrir ventana de empresa:', result.error);
                }
            } catch (error) {
                console.error('Error al abrir ventana de empresa:', error);
            }
        };

        // Handle menu sistema config event
        const handleMenuSistemaConfig = async () => {
            try {
                const result = await window.electronAPI.openConfiguracionSistemaWindow();
                if (!result.success) {
                    console.error('Error al abrir ventana de sistema:', result.error);
                }
            } catch (error) {
                console.error('Error al abrir ventana de sistema:', error);
            }
        };

        // Handle menu client config event
        const handleMenuClientConfig = async () => {
            try {
                const result = await window.electronAPI.openClienteWindow();
                if (!result.success) {
                    console.error('Error al abrir ventana de clientes:', result.error);
                }
            } catch (error) {
                console.error('Error al abrir ventana de clientes:', error);
            }
        };

        // Handle menu supplier config event
        const handleMenuSupplierConfig = async () => {
            try {
                const result = await window.electronAPI.openProveedorWindow();
                if (!result.success) {
                    console.error('Error al abrir ventana de proveedores:', result.error);
                }
            } catch (error) {
                console.error('Error al abrir ventana de proveedores:', error);
            }
        };

        // Handle navigation messages from menu
        const handleMenuNavigation = (event) => {
            if (event.data && event.data.type === 'NAVIGATE_TO') {
                navigate(event.data.path);
            }
        };

        // Listen for navigation messages
        window.addEventListener('message', handleMenuNavigation);

    
    
    

        // Verificar disponibilidad de APIs
    
        
        // Usar el método de preload.js que ya está configurado
        if (window.electronAPI?.onMenuAction) {
            // Método original con la abstracción
            const removeListener = window.electronAPI.onMenuAction((action) => {
          
                
                if (action === 'menu-logout') {
            
                    handleMenuLogout();
                } else if (action === 'menu-config-user') {
            
                    handleMenuUserConfig();
                } else if (action === 'menu-config-company') {
            
                    handleMenuCompanyConfig();
                } else if (action === 'menu-config-sistema') {
            
                    handleMenuSistemaConfig();
                } else if (action === 'menu-inventory-customers') {
            
                    handleMenuClientConfig();
                } else if (action === 'menu-inventory-suppliers') {
            
                    handleMenuSupplierConfig();
                } else {
              
                }
            });

        
            
            return () => {
                if (removeListener) removeListener();
                window.removeEventListener('message', handleMenuNavigation);
                if (stopScanGuard) stopScanGuard();
            };
        } else {
        
        }

    }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    // Update menu to show authenticated options
    if (window.electronAPI?.updateMenuAuthenticated) {
      await window.electronAPI.updateMenuAuthenticated();
    }
  };

  const handleLogout = async () => {
    // Update menu to show unauthenticated options
    if (window.electronAPI?.updateMenuUnauthenticated) {
      await window.electronAPI.updateMenuUnauthenticated();
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="App">
      <AppRoutes 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;