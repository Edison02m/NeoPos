import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Users from './views/Users';
import Empresa from './views/Empresa';
import Cliente from './views/Client';
import ProveedoresView from './views/Proveedor/index';


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
        element={<Users />} 
      />
      <Route 
        path="/empresa" 
        element={<Empresa />} 
      />
      <Route 
        path="/cliente" 
        element={<Cliente />} 
      />
      <Route 
        path="/proveedor" 
        element={<ProveedoresView />} 
      />
      <Route 
        path="/proveedor/index" 
        element={<ProveedoresView />} 
      />
    </Routes>
  );
};

export default AppRoutes;