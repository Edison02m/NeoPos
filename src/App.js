import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Users from './views/Users';

function AppContent() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    
        
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

    
    
    

        // Verificar disponibilidad de APIs
    
        
        // Usar el método de preload.js que ya está configurado
        if (window.electronAPI?.onMenuAction) {
            // Método original con la abstracción
            const removeListener = window.electronAPI.onMenuAction((action) => {
          
                
                if (action === 'menu-logout') {
            
                    handleMenuLogout();
                } else if (action === 'menu-config-user') {
            
                    handleMenuUserConfig();
                } else {
              
                }
            });

        
            
            return () => {
                if (removeListener) removeListener();
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
      <Routes>
        <Route 
          path="/" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
          } 
        />
        <Route path="/users" element={<Users />} />
      </Routes>
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