import React, { useState, useEffect } from 'react';
import EmpresaModel from '../models/Empresa';

const Empresa = () => {
  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Configuración de Empresa';
  }, []);
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    direccion: '',
    telefono: '',
    fax: '',
    email: '',
    web: '',
    representante: '',
    rsocial: '',
    logo: '',
    ciudad: '',
    codestab: '',
    codemi: '',
    direstablec: '',
    resolucion: '',
    contabilidad: '',
    trial275: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [validFields, setValidFields] = useState(new Set());
  const [errors, setErrors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    loadEmpresaData();
  }, []);

  // Efecto para cargar la imagen cuando cambie la ruta
  useEffect(() => {
    const loadImagePreview = async () => {
      if (!formData.logo || !validateImagePath(formData.logo)) {
        setImagePreview(null);
        return;
      }

      // En navegador web, si es solo un nombre de archivo, no intentar cargar
      if (!window.electronAPI && !formData.logo.startsWith('data:')) {
        setImagePreview(null);
        return;
      }

      // Si es una ruta absoluta de Windows y tenemos Electron API
      if (formData.logo.match(/^[A-Za-z]:\\/) && window.electronAPI?.readImageAsBase64) {
        try {
          setImageLoading(true);
          const result = await window.electronAPI.readImageAsBase64(formData.logo);
          if (result.success && result.data) {
            setImagePreview(result.data);
          } else {
            console.warn('No se pudo cargar la imagen:', formData.logo, result.error);
            setImagePreview(null);
          }
        } catch (error) {
          console.error('Error cargando imagen:', error);
          setImagePreview(null);
        } finally {
          setImageLoading(false);
        }
      } else if (formData.logo.startsWith('data:')) {
        // Si ya es base64, usar directamente
        setImagePreview(formData.logo);
      } else {
        // Fallback para otros casos
        setImagePreview(getImageUrl(formData.logo));
      }
    };

    // Solo ejecutar si tenemos un logo
    if (formData.logo) {
      loadImagePreview();
    }
  }, [formData.logo]);

  const loadEmpresaData = async () => {
    try {
      setLoading(true);
      const empresa = await EmpresaModel.getEmpresa();
      if (empresa) {
        const empresaData = {
          nombre: empresa.nombre || '',
          ruc: empresa.ruc || '',
          direccion: empresa.direccion || '',
          telefono: empresa.telefono || '',
          fax: empresa.fax || '',
          email: empresa.email || '',
          web: empresa.web || '',
          representante: empresa.representante || '',
          rsocial: empresa.rsocial || '',
          logo: empresa.logo || '',
          ciudad: empresa.ciudad || '',
          codestab: empresa.codestab || '',
          codemi: empresa.codemi || '',
          direstablec: empresa.direstablec || '',
          resolucion: empresa.resolucion || '',
          contabilidad: empresa.contabilidad || '',
          trial275: empresa.trial275 || ''
        };
        
        setFormData(empresaData);
        setIsEditing(true);
        
        // Validar todos los campos cargados
        Object.entries(empresaData).forEach(([fieldName, value]) => {
          validateField(fieldName, value);
        });
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
    
    // Validar campo individual y marcarlo como válido si cumple los criterios
    validateField(name, value);
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (errors.length > 0) {
      setErrors([]);
    }
    if (message) {
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // En navegador web, usar FileReader para crear una preview
        if (!window.electronAPI) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target.result;
            setImagePreview(base64String);
            // Guardar solo el nombre del archivo en la BD para navegador
            setFormData(prev => ({ ...prev, logo: file.name }));
          };
          reader.readAsDataURL(file);
          return;
        }

        // Para Electron: intentar obtener la ruta completa
        let filePath = '';
        
        // En algunos navegadores y Electron, 'path' está disponible
        if (file.path) {
          filePath = file.path;
        } 
        // En otros casos, usar webkitRelativePath si está disponible
        else if (file.webkitRelativePath) {
          filePath = file.webkitRelativePath;
        }
        // Fallback: solo el nombre del archivo
        else {
          filePath = file.name;
        }
        
        // Normalizar separadores de ruta para Windows
        filePath = filePath.replace(/\//g, '\\');
        
        setFormData(prev => ({ ...prev, logo: filePath }));
        
        // Limpiar vista previa anterior
        setImagePreview(null);
        
        // Si tenemos API de Electron, verificar que el archivo existe
        if (window.electronAPI?.fileExists && filePath.includes('\\')) {
          window.electronAPI.fileExists(filePath).then(result => {
            if (!result.exists) {
              console.warn('El archivo seleccionado puede no existir:', filePath);
            }
          });
        }
      } catch (error) {
        console.error('Error procesando archivo:', error);
        setFormData(prev => ({ ...prev, logo: file.name }));
        setImagePreview(null);
      }
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
    // Si ya tenemos una vista previa cargada, usarla
    if (imagePreview) {
      return imagePreview;
    }

    if (!path) return '';
    
    // Si es una ruta absoluta de Windows (ej: C:\...), intentar convertir a file:// URL como fallback
    if (path.match(/^[A-Za-z]:\\/)) {
      return `file:///${path.replace(/\\/g, '/')}`;
    }
    
    // Si es una ruta relativa o ya es una URL, usarla directamente
    return path;
  };

  const validateField = (fieldName, value) => {
    let isValid = false;
    
    switch (fieldName) {
      case 'nombre':
      case 'rsocial':
      case 'ruc':
        isValid = value && value.trim().length > 0;
        break;
      case 'direccion':
      case 'telefono':
      case 'email':
      case 'representante':
        isValid = value && value.trim().length > 0;
        break;
      default:
        isValid = true; // Campos opcionales siempre válidos
        break;
    }
    
    setValidFields(prev => {
      const newSet = new Set(prev);
      if (isValid) {
        newSet.add(fieldName);
      } else {
        newSet.delete(fieldName);
      }
      return newSet;
    });
  };

   // Función para obtener las clases CSS del campo con indicador visual
   const getFieldClasses = (fieldName) => {
     const baseClasses = "w-full px-3 py-2 border-2 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:ring-4";
     const isValid = validFields.has(fieldName);
     
     if (isValid) {
       return `${baseClasses} border-green-500 focus:border-green-600 focus:ring-green-100 pr-10`;
     }
     return `${baseClasses} border-gray-200 focus:border-blue-500 focus:ring-blue-100`;
   };

   // Función para renderizar el icono de check verde
   const renderCheckIcon = (fieldName) => {
     if (validFields.has(fieldName)) {
       return (
         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
           <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
           </svg>
         </div>
       );
     }
     return null;
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

    if (!formData.rsocial.trim()) {
      newErrors.push('La razón social es requerida');
    }

    if (!formData.direccion.trim()) {
      newErrors.push('La dirección es requerida');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.push('El email no tiene un formato válido');
    }

    if (formData.web && !/^https?:\/\/.+/.test(formData.web)) {
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
      
      // Scroll al top para mostrar el mensaje
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
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

        {/* Mensaje de éxito en la parte superior */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2 ${
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
              <div className="relative">
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={getFieldClasses('nombre')}
                  placeholder="Ingresa el nombre de la empresa"
                  required
                />
                {renderCheckIcon('nombre')}
              </div>
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
              <div className="relative">
                <input
                  type="text"
                  name="ruc"
                  value={formData.ruc}
                  onChange={handleInputChange}
                  className={getFieldClasses('ruc')}
                  placeholder="Ej: 1234567891001"
                  maxLength="13"
                  required
                />
                {renderCheckIcon('ruc')}
              </div>
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
              <div className="relative">
                <input
                  type="text"
                  name="rsocial"
                  value={formData.rsocial}
                  onChange={handleInputChange}
                  className={getFieldClasses('rsocial')}
                  placeholder="Razón social de la empresa"
                  required
                />
                {renderCheckIcon('rsocial')}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Dirección <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className={getFieldClasses('direccion')}
                  placeholder="Dirección completa"
                  required
                />
                {renderCheckIcon('direccion')}
              </div>
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
              <div className="relative">
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className={getFieldClasses('telefono')}
                  placeholder="Número de teléfono"
                  required
                />
                {renderCheckIcon('telefono')}
              </div>
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
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={getFieldClasses('email')}
                  placeholder="correo@empresa.com"
                />
                {renderCheckIcon('email')}
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Representante <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="representante"
                  value={formData.representante}
                  onChange={handleInputChange}
                  className={getFieldClasses('representante')}
                  placeholder="Nombre del representante"
                  required
                />
                {renderCheckIcon('representante')}
              </div>
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
              name="web"
              value={formData.web}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              placeholder="www.empresa.com"
            />
          </div>

          {/* Logo de la Empresa */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              Logo de la Empresa
            </label>
            <div className="space-y-2">
              {/* Campo de ruta de imagen */}
              <div className="flex gap-2">
                <input
                  type="text"
                  name="logo"
                  value={formData.logo}
                  onChange={handleInputChange}
                  placeholder="Ruta del logo (ej: C:\logos\empresa.jpg)"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('logoFileInput').click()}
                  className="px-4 py-2 text-sm bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-gray-200 whitespace-nowrap transition-colors"
                >
                  Examinar
                </button>
                <input
                  id="logoFileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              
              {/* Vista previa de la imagen */}
              {formData.logo && validateImagePath(formData.logo) && (
                <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-xs text-gray-600 mb-2 font-medium">Vista previa del logo:</div>
                  <div className="flex justify-center">
                    {imageLoading ? (
                      <div className="flex items-center justify-center h-24 text-sm text-gray-500">
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando logo...
                      </div>
                    ) : imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Logo de la empresa"
                        className="max-w-full max-h-24 object-contain border border-gray-200 rounded"
                        onError={(e) => {
                          console.error('Error cargando logo en elemento img');
                          setImagePreview(null);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-24 text-sm text-amber-600 text-center p-3">
                        <div>
                          <svg className="w-8 h-8 mx-auto mb-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className="font-semibold">Logo detectado pero no se puede cargar</div>
                            <div className="mt-1 text-xs">
                              Ruta: <span className="font-mono break-all">{formData.logo}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              • Verifique que la imagen existe<br/>
                              • Verifique que tiene permisos de lectura<br/>
                              • Intente con una ruta sin acentos o espacios
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Información adicional */}
                  <div className="mt-2 text-xs text-gray-500">
                    <div>Archivo: <span className="font-mono">{formData.logo.split('\\').pop() || formData.logo}</span></div>
                    <div>Formatos soportados: JPG, PNG, GIF, BMP, WebP</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Campos adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Ciudad"
                maxLength="100"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                </svg>
                Código Establecimiento
              </label>
              <input
                type="text"
                name="codestab"
                value={formData.codestab}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Código establecimiento"
                maxLength="3"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
                Contabilidad
              </label>
              <select
                name="contabilidad"
                value={formData.contabilidad}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Seleccionar</option>
                <option value="S">Sí</option>
                <option value="N">No</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-3 text-white border-none rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
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
      </div>
    </div>
  );
};

export default Empresa;