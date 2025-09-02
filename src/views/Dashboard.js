import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Empresa from '../models/Empresa';

const Dashboard = ({ user, onLogout }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [empresaData, setEmpresaData] = useState(null);
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
    window.addEventListener('user-updated', handleDataUpdate);
    window.addEventListener('focus', handleDataUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('empresa-updated', handleDataUpdate);
      window.removeEventListener('user-updated', handleDataUpdate);
      window.removeEventListener('focus', handleDataUpdate);
    };
  }, []);

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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">Neopos</h1>
          <p className="text-xl text-gray-600 mb-8">
            Bienvenido, {user?.alias || user?.usuario || 'Usuario'}
          </p>
          <div className="space-x-4">
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Cerrar Sesión
            </button>

          </div>
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
              <strong>Usuario:</strong> {user?.tipo === 1 ? 'Administrador' : 'Operador'}
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