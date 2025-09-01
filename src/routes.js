import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import UsuariosView from './views/Usuario';
import Empresa from './views/Empresa';
import ClientesView from './views/Client/index';
import ProveedoresView from './views/Proveedor/index';
import ProductosView from './views/Producto/index';
import InventarioView from './views/Inventario/index';


const AppRoutes = ({ user, onLogin, onLogout }) => {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          user ? <Navigate to="/dashboard" /> : <Login onLogin={onLogin} />
        } 
      />
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/dashboard" /> : <Login onLogin={onLogin} />
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          user ? <Dashboard user={user} onLogout={onLogout} /> : <Navigate to="/login" />
        } 
      />
      <Route 
        path="/users" 
        element={<UsuariosView />} 
      />
      <Route 
        path="/empresa" 
        element={<Empresa />} 
      />
      <Route 
        path="/cliente" 
        element={<ClientesView />} 
      />
      {/* Alias para compatibilidad con rutas antiguas */}
      <Route 
        path="/client" 
        element={<Navigate to="/cliente" replace />} 
      />
      <Route 
        path="/proveedor" 
        element={<ProveedoresView />} 
      />
      <Route 
        path="/proveedor/index" 
        element={<ProveedoresView />} 
      />
      <Route 
        path="/productos" 
        element={<ProductosView />} 
      />
      <Route 
        path="/producto" 
        element={<ProductosView />} 
      />
      <Route 
        path="/inventario" 
        element={<InventarioView />} 
      />
    </Routes>
  );
};

export default AppRoutes;