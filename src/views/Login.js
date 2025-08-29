import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Usuario from '../models/Usuario';
import { FaUser, FaLock, FaSignOutAlt } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await Usuario.authenticate(usuario, contrasena);
      
      if (user) {
        // Update menu to show authenticated options
        if (window.electronAPI?.updateMenuAuthenticated) {
          await window.electronAPI.updateMenuAuthenticated();
        }
        onLogin(user);
        navigate('/dashboard');
      } else {
        setError('Usuario o contraseña incorrectos');
      }
    } catch (err) {
      setError('Error al conectar con la base de datos');
      console.error('Error de autenticación:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 rounded-lg border border-gray-200 shadow-lg max-w-md w-full space-y-8 transform transition-all hover:shadow-xl">
        <div className="text-center">
          <img
            src="/logo.png"
            alt="NeoPOS Logo"
            className="mx-auto h-16 w-auto mb-4"
          />
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            NeoPOS
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de Punto de Venta
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FaUser />
              </div>
              <input
                id="usuario"
                name="usuario"
                type="text"
                required
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FaLock />
              </div>
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                required
                className="pl-10 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.electronAPI?.quitApp) {
                  window.electronAPI.quitApp();
                } else {
                  window.close();
                }
              }}
              className="w-full flex items-center justify-center py-3 px-4 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
            >
              <FaSignOutAlt className="mr-2" />
              Salir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;