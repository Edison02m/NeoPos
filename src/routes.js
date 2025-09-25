import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './views/Login';
import Dashboard from './views/Dashboard';
import UsuariosView from './views/Usuario';
import Empresa from './views/Empresa';
import ConfiguracionSistema from './views/ConfiguracionSistema';
import ClientesView from './views/Client/index';
import ProveedoresView from './views/Proveedor/index';
import ProductosView from './views/Producto/index';
import InventarioView from './views/Inventario/index';
import VentasView from './views/Ventas/index';
import ComprasView from './views/Compras';
import CreditoView from './views/Credito';
import ReservacionesView from './views/Reservaciones';
import VentasReporteView from './views/Reportes/VentasReporte';
import ComprasReporteView from './views/Reportes/ComprasReporte';
import ProductosMasVendidosView from './views/Reportes/ProductosMasVendidos';


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
        path="/configuracion-sistema" 
        element={<ConfiguracionSistema />} 
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
      <Route 
        path="/ventas" 
        element={<VentasView />} 
      />
      <Route 
        path="/compras" 
        element={<ComprasView />} 
      />
      <Route
        path="/credito"
        element={<CreditoView />}
      />
      <Route
        path="/reservaciones"
        element={<ReservacionesView />}
      />
      <Route
        path="/reportes/ventas"
        element={<VentasReporteView />}
      />
      <Route
        path="/reportes/compras"
        element={<ComprasReporteView />}
      />
      <Route 
        path="/reportes/productos-mas-vendidos" 
        element={<ProductosMasVendidosView />} 
      />
    </Routes>
  );
};

export default AppRoutes;