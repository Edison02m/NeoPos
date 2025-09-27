import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Empresa from '../models/Empresa';

const Dashboard = ({ user, onLogout }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [empresaData, setEmpresaData] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadEmpresaData = async () => {
      try {
        const empresa = await Empresa.getEmpresa();
        setEmpresaData(empresa);
        
        // Cargar logo del sistema desde auxiliar1
        const sistemaResult = await window.electronAPI.dbQuery(
          'SELECT nombre FROM auxiliar1 LIMIT 1'
        );
        
        if (sistemaResult.success && sistemaResult.data && sistemaResult.data.length > 0) {
          const sistemaData = sistemaResult.data[0];
          if (sistemaData.nombre && validateImagePath(sistemaData.nombre)) {
            await loadLogoPreview(sistemaData.nombre);
          }
        }
      } catch (error) {
        console.error('Error al cargar datos de empresa:', error);
      }
    };

    loadEmpresaData();

    // Escuchar eventos de actualización de datos
    const handleDataUpdate = () => {
      loadEmpresaData();
    };

    // Agregar event listeners para actualización automática
    window.addEventListener('empresa-updated', handleDataUpdate);
    window.addEventListener('sistema-updated', handleDataUpdate);
    window.addEventListener('user-updated', handleDataUpdate);
    window.addEventListener('focus', handleDataUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('empresa-updated', handleDataUpdate);
      window.removeEventListener('sistema-updated', handleDataUpdate);
      window.removeEventListener('user-updated', handleDataUpdate);
      window.removeEventListener('focus', handleDataUpdate);
    };
  }, []);

  // Listener de acciones de menú para abrir configuración de impresión
  useEffect(() => {
    function handleMenuAction(e){
      const action = e.detail;
      if(action === 'menu-config-invoice-printing'){
        if(window.electronAPI?.openImpresionFacturaWindow){
          window.electronAPI.openImpresionFacturaWindow();
        } else {
          navigate('/configuracion-impresion');
        }
      } else if(action === 'menu-utilities-cash-closing'){
        if(window.electronAPI?.openCierreCajaWindow){
          window.electronAPI.openCierreCajaWindow();
        } else {
          navigate('/cierre-caja');
        }
      } else if(action === 'menu-utilities-invoicing' || action === 'menu-utilities-recaudacion'){
        if(window.electronAPI?.openRecaudacionWindow){
          window.electronAPI.openRecaudacionWindow();
        } else {
          navigate('/recaudacion');
        }
      }
    }
    window.addEventListener('menu-action', handleMenuAction);
    return () => window.removeEventListener('menu-action', handleMenuAction);
  }, [navigate]);

  const loadLogoPreview = async (logoPath) => {
    if (!logoPath || !validateImagePath(logoPath)) {
      setLogoPreview(null);
      return;
    }

    // En navegador web, si es solo un nombre de archivo, no intentar cargar
    if (!window.electronAPI && !logoPath.startsWith('data:')) {
      setLogoPreview(null);
      return;
    }

    // Si es una ruta absoluta de Windows y tenemos Electron API
    if (logoPath.match(/^[A-Za-z]:\\/) && window.electronAPI?.readImageAsBase64) {
      try {
        setLogoLoading(true);
        const result = await window.electronAPI.readImageAsBase64(logoPath);
        if (result.success && result.data) {
          setLogoPreview(result.data);
        } else {
          console.warn('No se pudo cargar el logo:', logoPath, result.error);
          setLogoPreview(null);
        }
      } catch (error) {
        console.error('Error cargando logo:', error);
        setLogoPreview(null);
      } finally {
        setLogoLoading(false);
      }
    } else if (logoPath.startsWith('data:')) {
      // Si ya es base64, usar directamente
      setLogoPreview(logoPath);
    } else {
      // Fallback para otros casos
      setLogoPreview(getImageUrl(logoPath));
    }
  };

  // Función para validar si la imagen existe y es válida
  const validateImagePath = (path) => {
    if (!path || typeof path !== 'string') {
      return false;
    }
    
    // Verificar extensiones válidas
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lastDotIndex = path.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return false;
    }
    
    const extension = path.toLowerCase().slice(lastDotIndex);
    const isValid = validExtensions.includes(extension);
    
    return isValid;
  };

  // Función para convertir ruta de Windows a URL para vista previa
  const getImageUrl = (path) => {
    if (!path) return '';
    
    // Si es una ruta absoluta de Windows (ej: C:\...), intentar convertir a file:// URL como fallback
    if (path.match(/^[A-Za-z]:\\/)) {
      return `file:///${path.replace(/\\/g, '/')}`;
    }
    
    // Si es una ruta relativa o ya es una URL, usarla directamente
    return path;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header con botón de cerrar sesión */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-lg font-semibold text-gray-800">NeoPos</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Bienvenido, {user?.alias || user?.usuario || 'Usuario'}
            </span>
            <button 
              onClick={onLogout}
              className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          {/* Logo de la empresa en pantalla completa */}
          {logoLoading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-20 w-20 text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo de la empresa"
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: '80vw',
                maxHeight: '80vh'
              }}
              onError={(e) => {
                console.error('Error cargando logo en Dashboard');
                setLogoPreview(null);
              }}
            />
          ) : (
            <div className="text-center text-gray-400">
              <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg">No hay logo configurado</p>
              <p className="text-sm">Configure el logo de la empresa en Configuración</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center space-x-6">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <strong>Usuario:</strong> {user?.alias || user?.usuario || 'Usuario'} ({user?.tipo === 1 ? 'Administrador' : 'Operador'})
            </span>


          </div>
          
          <div className="flex items-center">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <strong>Empresa:</strong> {empresaData?.nombre || 'NeoPos'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
               <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2zM16 3v4M8 3v4M4 11h16" />
               </svg>
               {formatDate(currentDateTime)}
             </span>
            <span className="flex items-center font-mono">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(currentDateTime)}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;