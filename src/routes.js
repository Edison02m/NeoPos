import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import Users from './views/Users';
import Empresa from './views/Empresa';

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
    </Routes>
  );
};

export default AppRoutes;