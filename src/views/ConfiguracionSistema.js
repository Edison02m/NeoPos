import React, { useState, useEffect } from 'react';

const ConfiguracionSistema = () => {
  // --- Menú contextual simulado para Electron ---
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = React.useRef(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e) => {
      if (menuButtonRef.current && !menuButtonRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Handler para abrir la ventana de dispositivos
  const handleConfigurarDispositivos = async () => {
    setMenuOpen(false);
    if (window.electronAPI && window.electronAPI.openDispositivosWindow) {
      await window.electronAPI.openDispositivosWindow();
    } else if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.invoke('open-dispositivos-window');
    } else {
      alert('Función solo disponible en la versión de escritorio');
    }
  };
  // document.title eliminado: el título se fija desde WindowManager

  const [formData, setFormData] = useState({
    nombre: '',
    trial272: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    loadSistemaData();
  }, []);

  // Efecto para cargar la imagen cuando cambie la ruta
  useEffect(() => {
    const loadImagePreview = async () => {
      if (!formData.nombre || !validateImagePath(formData.nombre)) {
        setImagePreview(null);
        return;
      }

      // En navegador web, si es solo un nombre de archivo, no intentar cargar
      if (!window.electronAPI && !formData.nombre.startsWith('data:')) {
        setImagePreview(null);
        return;
      }

      // Si es una ruta absoluta de Windows y tenemos Electron API
      if (formData.nombre.match(/^[A-Za-z]:\\/) && window.electronAPI?.readImageAsBase64) {
        try {
          setImageLoading(true);
          const result = await window.electronAPI.readImageAsBase64(formData.nombre);
          if (result.success && result.data) {
            setImagePreview(result.data);
          } else {
            console.warn('No se pudo cargar la imagen:', formData.nombre, result.error);
            setImagePreview(null);
          }
        } catch (error) {
          console.error('Error cargando imagen:', error);
          setImagePreview(null);
        } finally {
          setImageLoading(false);
        }
      } else if (formData.nombre.startsWith('data:')) {
        // Si ya es base64, usar directamente
        setImagePreview(formData.nombre);
      } else {
        // Fallback para otros casos
        setImagePreview(getImageUrl(formData.nombre));
      }
    };

    // Solo ejecutar si tenemos un logo
    if (formData.nombre) {
      loadImagePreview();
    }
  }, [formData.nombre]);

  const loadSistemaData = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.dbQuery(
        'SELECT nombre, trial272 FROM auxiliar1 LIMIT 1'
      );
      
      if (result.success && result.data && result.data.length > 0) {
        const sistemaData = result.data[0];
        setFormData({
          nombre: sistemaData.nombre || '',
          trial272: sistemaData.trial272 || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar configuración del sistema:', error);
      setMessage('Error al cargar la configuración del sistema');
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
    
    // Limpiar mensajes cuando el usuario empiece a escribir
    if (message) {
      setMessage('');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processLogoFile(file);
    }
  };

  // Procesa un archivo de imagen para el logo (soporta navegador y Electron)
  const processLogoFile = (file) => {
    try {
      // En navegador web, usar FileReader para crear una preview
      if (!window.electronAPI) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64String = event.target.result;
          setImagePreview(base64String);
          // Guardar solo el nombre del archivo en la BD para navegador
          setFormData(prev => ({ ...prev, nombre: file.name }));
        };
        reader.readAsDataURL(file);
        return;
      }

      // Para Electron: intentar obtener la ruta completa
      let filePath = '';

      if (file.path) {
        filePath = file.path;
      } else if (file.webkitRelativePath) {
        filePath = file.webkitRelativePath;
      } else {
        filePath = file.name;
      }

      // Normalizar separadores de ruta para Windows
      filePath = filePath.replace(/\//g, '\\');

      setFormData(prev => ({ ...prev, nombre: filePath }));
      setImagePreview(null);

      if (window.electronAPI?.fileExists && filePath.includes('\\')) {
        window.electronAPI.fileExists(filePath).then(result => {
          if (!result.exists) {
            console.warn('El archivo seleccionado puede no existir:', filePath);
          }
        });
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      setFormData(prev => ({ ...prev, nombre: file.name }));
      setImagePreview(null);
    }
  };

  // Evita que arrastrar/soltar imágenes sobre otros inputs pegue base64
  const handleFormDragOver = (e) => {
    e.preventDefault();
  };

  const handleFormDrop = (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const targetEl = e.target;
      const dropZone = targetEl.closest ? targetEl.closest('.logo-drop-zone-sistema') : null;
      if (dropZone) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) processLogoFile(file);
      } else {
        // Bloquear drops fuera de la zona del logo
        e.preventDefault();
      }
    } else {
      // Si es texto/HTML arrastrado, bloquear para que no pegue en inputs
      e.preventDefault();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Verificar si existe algún registro en auxiliar1
      const checkResult = await window.electronAPI.dbQuery(
        'SELECT COUNT(*) as count FROM auxiliar1'
      );
      
      const hasRecords = checkResult.success && 
                        checkResult.data && 
                        checkResult.data[0]?.count > 0;

      let result;
      if (hasRecords) {
        // Actualizar registro existente
        result = await window.electronAPI.dbRun(
          'UPDATE auxiliar1 SET nombre = ?, trial272 = ?',
          [formData.nombre, formData.trial272]
        );
      } else {
        // Insertar nuevo registro
        result = await window.electronAPI.dbRun(
          'INSERT INTO auxiliar1 (nombre, trial272) VALUES (?, ?)',
          [formData.nombre, formData.trial272]
        );
      }

      if (result && result.success) {
        setMessage('Configuración guardada exitosamente');
        setMessageType('success');
        
        // Emitir evento para actualizar el dashboard
        window.dispatchEvent(new CustomEvent('sistema-updated'));
      } else {
        throw new Error(result?.error || 'Error desconocido al guardar');
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setMessage('Error al guardar la configuración: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow();
    } else {
      window.close();
    }
  };

  return (
    <div className="bg-white min-h-screen p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración del Sistema</h1>
              <p className="text-sm text-gray-600">Configure el logo del sistema y otras opciones generales</p>
            </div>
          </div>
          {/* Botón de menú contextual */}
          <div className="relative">
            <button
              ref={menuButtonRef}
              type="button"
              className="px-4 py-2 bg-gray-100 border-2 border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <svg width="18" height="18" fill="none" stroke="#374151" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="2"/>
                <circle cx="12" cy="12" r="2"/>
                <circle cx="19" cy="12" r="2"/>
              </svg>
              Opciones
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-fade-in">
                <button
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 text-blue-700 font-medium flex items-center gap-2 rounded-t-lg"
                  onClick={handleConfigurarDispositivos}
                >
                  <svg width="18" height="18" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="7" width="18" height="10" rx="2"/>
                    <rect x="7" y="3" width="10" height="4" rx="1"/>
                    <rect x="9" y="17" width="6" height="2" rx="1"/>
                  </svg>
                  Configurar Dispositivos
                </button>
                <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                  Configura la impresora de facturas y el lector de barras
                </div>
              </div>
            )}
          </div>
        </div>

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

  <form onSubmit={handleSubmit} onDragOver={handleFormDragOver} onDrop={handleFormDrop}>
          {/* Logo del Sistema */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              Logo del Sistema (Dashboard)
            </label>
            <div className="space-y-2">
              {/* Campo de ruta de imagen */}
              <div className="flex gap-2 logo-drop-zone-sistema">
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ruta del logo del sistema (ej: C:\logos\sistema.jpg)"
                  className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('logoSistemaFileInput').click()}
                  className="px-4 py-2 text-sm bg-gray-100 border-2 border-gray-200 rounded-lg hover:bg-gray-200 whitespace-nowrap transition-colors"
                >
                  Examinar
                </button>
                <input
                  id="logoSistemaFileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              
              {/* Vista previa de la imagen */}
              {formData.nombre && validateImagePath(formData.nombre) && (
                <div className="border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="text-xs text-gray-600 mb-2 font-medium">Vista previa del logo del sistema:</div>
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
                        alt="Logo del sistema"
                        className="max-w-full max-h-32 object-contain border border-gray-200 rounded"
                        onError={(e) => {
                          console.error('Error cargando logo del sistema');
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
                              Ruta: <span className="font-mono break-all">{formData.nombre}</span>
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
                    <div>Archivo: <span className="font-mono">{formData.nombre.split('\\').pop() || formData.nombre}</span></div>
                    <div>Formatos soportados: JPG, PNG, GIF, BMP, WebP</div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Este logo se mostrará en el dashboard principal del sistema
            </div>
          </div>

          {/* Campo adicional (trial272) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <svg className="inline mr-2 align-middle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Configuración Adicional
            </label>
            <input
              type="text"
              name="trial272"
              value={formData.trial272}
              onChange={handleInputChange}
              placeholder="Campo adicional del sistema"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

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
              {loading ? 'Guardando...' : 'Guardar Configuración'}
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

export default ConfiguracionSistema;
