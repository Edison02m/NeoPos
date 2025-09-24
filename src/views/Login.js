import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Usuario from '../models/Usuario';
import { FaUser, FaLock, FaSignOutAlt } from 'react-icons/fa';

const Login = ({ onLogin }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [empresaLogo, setEmpresaLogo] = useState('/logo.png'); // Logo por defecto
  const [empresaNombre, setEmpresaNombre] = useState('NeoPOS'); // Nombre por defecto
  const [empresaRazonSocial, setEmpresaRazonSocial] = useState('Sistema de Punto de Venta'); // Descripción por defecto
  const [logoError, setLogoError] = useState(false); // Para evitar bucle infinito
  const navigate = useNavigate();

  // Cargar logo de la empresa al montar el componente
  useEffect(() => {
    const loadEmpresaData = async () => {
      try {
        const result = await window.electronAPI.dbGetSingle(
          'SELECT logo, empresa, rsocial FROM empresa LIMIT 1'
        );
        
        // Verificar la estructura correcta de la respuesta
        const empresaData = result?.data || result;
        
        if (empresaData) {
          // Establecer nombre de la empresa
          if (empresaData.empresa && empresaData.empresa.trim() !== '') {
            setEmpresaNombre(empresaData.empresa);
          }
          
          // Establecer razón social
          if (empresaData.rsocial && empresaData.rsocial.trim() !== '') {
            setEmpresaRazonSocial(empresaData.rsocial);
          }
          
          // Cargar logo si existe
          if (empresaData.logo && empresaData.logo.trim() !== '') {
            const imageResult = await window.electronAPI.getImageAsBase64(empresaData.logo);
            
            if (imageResult.success) {
              setEmpresaLogo(imageResult.data);
              setLogoError(false);
            } else {
              setEmpresaLogo('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzY5NzU4MSIvPgo8dGV4dCB4PSIzMiIgeT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TG9nbzwvdGV4dD4KPHN2Zz4=');
            }
          } else {
            setEmpresaLogo('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzY5NzU4MSIvPgo8dGV4dCB4PSIzMiIgeT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TG9nbzwvdGV4dD4KPHN2Zz4=');
          }
        } else {
          setEmpresaLogo('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzY5NzU4MSIvPgo8dGV4dCB4PSIzMiIgeT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TG9nbzwvdGV4dD4KPHN2Zz4=');
        }
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error);
        setEmpresaLogo('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzY5NzU4MSIvPgo8dGV4dCB4PSIzMiIgeT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TG9nbzwvdGV4dD4KPHN2Zz4=');
      }
    };

    if (window.electronAPI) {
      loadEmpresaData();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Pequeño delay para mitigar brute force rápido
      await new Promise(res => setTimeout(res, 250));
      const user = await Usuario.authenticate(usuario.trim(), contrasena);
      if (user) {
        // Update menu to show authenticated options
        if (window.electronAPI?.updateMenuAuthenticated) {
          await window.electronAPI.updateMenuAuthenticated();
        }
        onLogin(user);
        navigate('/dashboard');
      } else {
        setIntentos(prev => prev + 1);
        setError('Credenciales inválidas');
      }
    } catch (err) {
      console.error('Error técnico de autenticación:', err);
      setError('Error interno de autenticación. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="p-8 rounded-lg border border-gray-200 shadow-lg max-w-md w-full space-y-8 transform transition-all hover:shadow-xl">
        <div className="text-center">
          <img
            src={empresaLogo}
            alt="Logo Empresa"
            className="mx-auto h-16 w-auto mb-4"
            onError={(e) => {
              if (!logoError) {
                setLogoError(true);
                setEmpresaLogo('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iOCIgZmlsbD0iIzY5NzU4MSIvPgo8dGV4dCB4PSIzMiIgeT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+TG9nbzwvdGV4dD4KPHN2Zz4=');
              }
            }}
          />
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            {empresaNombre}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {empresaRazonSocial}
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
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center space-y-1">
              <div>{error}</div>
              {intentos > 0 && intentos < 5 && (
                <div className="text-xs text-gray-500">Intentos: {intentos}</div>
              )}
              {intentos >= 5 && (
                <div className="text-xs text-gray-500">Demasiados intentos. Considere verificar mayúsculas/BloqMayús.</div>
              )}
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