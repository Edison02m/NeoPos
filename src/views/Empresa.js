import React, { useState, useEffect } from 'react';
import EmpresaModel from '../models/Empresa';

const Empresa = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    razonSocial: '',
    direccion: '',
    telefono: '',
    fax: '',
    email: '',
    paginaWeb: '',
    representante: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [errors, setErrors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadEmpresaData();
  }, []);

  const loadEmpresaData = async () => {
    try {
      setLoading(true);
      const empresa = await EmpresaModel.getEmpresa();
      if (empresa) {
        setFormData({
          nombre: empresa.nombre || '',
          ruc: empresa.ruc || '',
          razonSocial: empresa.razonSocial || '',
          direccion: empresa.direccion || '',
          telefono: empresa.telefono || '',
          fax: empresa.fax || '',
          email: empresa.email || '',
          paginaWeb: empresa.paginaWeb || '',
          representante: empresa.representante || ''
        });
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error al cargar datos de empresa:', error);
      setMessage('Error al cargar los datos de la empresa');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar errores cuando el usuario empiece a escribir
    if (errors.length > 0) {
      setErrors([]);
    }
    if (message) {
      setMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.nombre.trim()) {
      newErrors.push('El nombre de la empresa es requerido');
    }

    if (!formData.ruc.trim()) {
      newErrors.push('El RUC es requerido');
    } else if (!/^\d{10}001$/.test(formData.ruc)) {
      newErrors.push('El RUC debe tener 13 dígitos y terminar en 001');
    }

    if (!formData.razonSocial.trim()) {
      newErrors.push('La razón social es requerida');
    }

    if (!formData.direccion.trim()) {
      newErrors.push('La dirección es requerida');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('El email no tiene un formato válido');
    }

    if (formData.paginaWeb && !/^https?:\/\/.+/.test(formData.paginaWeb)) {
      newErrors.push('La página web debe comenzar con http:// o https://');
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors([]);
      setMessage('');

      const empresa = await EmpresaModel.save(formData);
      setMessage(isEditing ? 'Empresa actualizada correctamente' : 'Empresa creada correctamente');
      setMessageType('success');
      setIsEditing(true);
      
      // Emitir evento para notificar que los datos de empresa se actualizaron
      window.dispatchEvent(new CustomEvent('empresa-updated', { detail: empresa }));
    } catch (error) {
      console.error('Error al guardar empresa:', error);
      setErrors([error.message || 'Error al guardar la empresa']);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Cerrar la ventana actual
    if (window.electronAPI && window.electronAPI.closeWindow) {
      window.electronAPI.closeWindow('empresa');
    } else {
      // Fallback: cerrar la ventana usando window.close()
      window.close();
    }
  };

  return (
    <div className="bg-white min-h-screen p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración de Empresa</h1>
          <p className="text-sm text-red-600 mt-2 font-medium">Los campos marcados con <span className="text-red-600">*</span> son obligatorios</p>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 border-2 border-red-200 rounded-lg text-sm">
            <ul className="m-0 pl-5">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
                Nombre de la empresa <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Ingresa el nombre de la empresa"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                R.U.C. <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="ruc"
                value={formData.ruc}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Ej: 1234567891001"
                maxLength="13"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Razón social <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="razonSocial"
                value={formData.razonSocial}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Razón social de la empresa"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Dirección <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Dirección completa"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                Teléfono <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Número de teléfono"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Fax
              </label>
              <input
                type="text"
                name="fax"
                value={formData.fax}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Número de fax"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Correo electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="correo@empresa.com"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Representante <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="representante"
                value={formData.representante}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Nombre del representante"
                required
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Página Web
            </label>
            <input
              type="url"
              name="paginaWeb"
              value={formData.paginaWeb}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="www.empresa.com"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-3 text-white border-none rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 transform hover:bg-gray-200 hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cerrar
            </button>
          </div>
        </form>
        
        {message && (
          <div className={`mt-6 p-4 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2 ${
            messageType === 'success' 
              ? 'bg-green-50 text-green-800 border-2 border-green-200' 
              : 'bg-red-50 text-red-800 border-2 border-red-200'
          }`}>
            {messageType === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Empresa;