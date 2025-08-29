import React, { useState, useEffect } from 'react';
import Producto from '../../models/Producto';

const ProductoForm = ({ 
  producto, 
  onSave, 
  onCancel, 
  loading,
  formActive = true
}) => {
  const [formData, setFormData] = useState({
    codigo: '',
    codbarra: '',
    codaux: '',
    producto: '',
    almacen: 0,
    bodega1: 0,
    bodega2: 0,
    pcompra: 0,
    pvp: 0,
    pmayorista: 0,
    pconsignacion: 0,
    foto: '',
    maximo: 0,
    minimo: 0,
    peso: 0,
    procedencia: '',
    grabaiva: '1',
    iva_percentage: 12.0,
    descripcion: '',
    sucursal: 0,
    isservicio: '0',
    deducible: 0
  });

  // Porcentajes configurables para cálculos automáticos
  const [porcentajes, setPorcentajes] = useState({
    margenPVP: 30, // + P Compra + 30%
    porcentajeMayorista: 10 // = PVP × 10%
  });

  const [calculatedValues, setCalculatedValues] = useState({
    utilidad: 0,
    utilidadPorcentaje: 0,
    pvpConIva: 0,
    pvpSugerido: 0,
    mayoristaCalculado: 0
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Cálculos automáticos cuando cambian los valores
  useEffect(() => {
    const pcompra = parseFloat(formData.pcompra) || 0;
    const pvp = parseFloat(formData.pvp) || 0;
    const ivaPercentage = parseFloat(formData.iva_percentage) || 12;
    
    // Calcular utilidad y porcentaje de utilidad
    const utilidad = pvp - pcompra;
    const utilidadPorcentaje = pcompra > 0 ? ((utilidad / pcompra) * 100) : 0;
    
    // Calcular PVP con IVA
    const pvpConIva = formData.grabaiva === '1' ? (pvp * (1 + ivaPercentage / 100)) : pvp;
    
    // Calcular PVP sugerido basado en precio de compra + margen
    const pvpSugerido = pcompra * (1 + porcentajes.margenPVP / 100);
    
    // Calcular precio mayorista (PVP × porcentaje)
    const mayoristaCalculado = pvp * (porcentajes.porcentajeMayorista / 100);
    
    setCalculatedValues({
      utilidad: utilidad.toFixed(5),
      utilidadPorcentaje: utilidadPorcentaje.toFixed(2),
      pvpConIva: pvpConIva.toFixed(5),
      pvpSugerido: pvpSugerido.toFixed(5),
      mayoristaCalculado: mayoristaCalculado.toFixed(5)
    });
  }, [formData.pcompra, formData.pvp, formData.grabaiva, formData.iva_percentage, porcentajes]);

  // Efecto para cargar la imagen cuando cambie la ruta
  useEffect(() => {
    const loadImagePreview = async () => {
      if (!formData.foto || !validateImagePath(formData.foto)) {
        setImagePreview(null);
        return;
      }

      // En navegador web, si es solo un nombre de archivo, no intentar cargar
      if (!window.electronAPI && !formData.foto.startsWith('data:')) {
        setImagePreview(null);
        return;
      }

      // Si es una ruta absoluta de Windows y tenemos Electron API
      if (formData.foto.match(/^[A-Za-z]:\\/) && window.electronAPI?.readImageAsBase64) {
        try {
          setImageLoading(true);
          const result = await window.electronAPI.readImageAsBase64(formData.foto);
          
          if (result.success) {
            setImagePreview(result.data);
          } else {
            console.warn('Error cargando imagen:', result.error);
            setImagePreview(null);
          }
        } catch (error) {
          console.error('Error cargando imagen:', error);
          setImagePreview(null);
        } finally {
          setImageLoading(false);
        }
      } else if (formData.foto.startsWith('data:')) {
        // Si ya es una imagen base64, usarla directamente
        setImagePreview(formData.foto);
      } else {
        // Para rutas relativas o URLs, intentar cargar directamente
        setImagePreview(getImageUrl(formData.foto));
      }
    };

    // Solo ejecutar si tenemos una foto
    if (formData.foto) {
      loadImagePreview();
    } else {
      setImagePreview(null);
    }
  }, [formData.foto]);

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo || '',
        codbarra: producto.codbarra || '',
        codaux: producto.codaux || '',
        producto: producto.producto || '',
        almacen: producto.almacen || 0,
        bodega1: producto.bodega1 || 0,
        bodega2: producto.bodega2 || 0,
        pcompra: producto.pcompra || 0,
        pvp: producto.pvp || 0,
        pmayorista: producto.pmayorista || 0,
        pconsignacion: producto.pconsignacion || 0,
        foto: producto.foto || '',
        maximo: producto.maximo || 0,
        minimo: producto.minimo || 0,
        peso: producto.peso || 0,
        procedencia: producto.procedencia || '',
        grabaiva: producto.grabaiva || '1',
        iva_percentage: producto.iva_percentage || 12.0,
        descripcion: producto.descripcion || '',
        sucursal: producto.sucursal || 0,
        isservicio: producto.isservicio || '0',
        deducible: producto.deducible || 0
      });
    } else {
      // Limpiar formulario para nuevo producto
      setFormData({
        codigo: '',
        codbarra: '',
        codaux: '',
        producto: '',
        almacen: 0,
        bodega1: 0,
        bodega2: 0,
        pcompra: 0,
        pvp: 0,
        pmayorista: 0,
        pconsignacion: 0,
        foto: '',
        maximo: 0,
        minimo: 0,
        peso: 0,
        procedencia: '',
        grabaiva: '1',
        iva_percentage: 12.0,
        descripcion: '',
        sucursal: 0,
        isservicio: '0',
        deducible: 0
      });
      setImagePreview(null);
    }
  }, [producto]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.producto.trim()) {
      newErrors.producto = 'El nombre del producto es requerido';
    }
    
    if (formData.almacen < 0) {
      newErrors.almacen = 'La existencia no puede ser negativa';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
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
            handleInputChange('foto', file.name);
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
        
        handleInputChange('foto', filePath);
        
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
        handleInputChange('foto', file.name);
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

  // Funciones para botones de atajo
  const aplicarFormulaPVP = () => {
    const pcompra = parseFloat(formData.pcompra) || 0;
    if (pcompra > 0) {
      const nuevoPVP = pcompra * (1 + porcentajes.margenPVP / 100);
      handleInputChange('pvp', nuevoPVP);
    }
  };

  const aplicarFormulaMayorista = () => {
    const pvp = parseFloat(formData.pvp) || 0;
    if (pvp > 0) {
      const nuevoMayorista = pvp * (porcentajes.porcentajeMayorista / 100);
      handleInputChange('pmayorista', nuevoMayorista);
    }
  };

  if (!formActive) {
    return (
      <div className="p-4 bg-white border-l border-gray-300">
        <div className="text-center text-gray-500">
          Seleccione un producto para ver los detalles
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-2 p-4 max-w-md mx-auto">
          {/* Código de barras */}
          <div>
            <label className="block text-xs text-gray-700">Código de barras</label>
            <input
              type="text"
              value={formData.codbarra}
              onChange={(e) => handleInputChange('codbarra', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Código auxiliar */}
          <div>
            <label className="block text-xs text-gray-700">Código auxiliar</label>
            <input
              type="text"
              value={formData.codaux}
              onChange={(e) => handleInputChange('codaux', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Producto */}
          <div>
            <label className="block text-xs text-gray-700">Producto *</label>
            <textarea
              value={formData.producto}
              onChange={(e) => handleInputChange('producto', e.target.value)}
              required
              disabled={!formActive}
              rows={2}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
            />
          </div>

          {/* Cantidades en dos columnas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700">Existencia almacén</label>
              <input
                type="number"
                min="0"
                value={formData.almacen}
                onChange={(e) => handleInputChange('almacen', parseInt(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Alm. mín.</label>
              <input
                type="number"
                min="0"
                value={formData.minimo}
                onChange={(e) => handleInputChange('minimo', parseInt(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700">Existencia bodega1</label>
              <input
                type="number"
                min="0"
                value={formData.bodega1}
                onChange={(e) => handleInputChange('bodega1', parseInt(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Alm. máx</label>
              <input
                type="number"
                min="0"
                value={formData.maximo}
                onChange={(e) => handleInputChange('maximo', parseInt(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-700">Existencia bodega2</label>
              <input
                type="number"
                min="0"
                value={formData.bodega2}
                onChange={(e) => handleInputChange('bodega2', parseInt(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Peso</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.peso}
                onChange={(e) => handleInputChange('peso', parseFloat(e.target.value) || 0)}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Precio de compra */}
          <div>
            <label className="block text-xs text-gray-700">Precio de compra</label>
            <input
              type="number"
              step="0.00001"
              min="0"
              value={formData.pcompra === 0 ? '' : formData.pcompra}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange('pcompra', value === '' ? 0 : value);
              }}
              onFocus={(e) => e.target.select()}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Utilidad */}
          <div>
            <label className="block text-xs text-gray-700">Utilidad {calculatedValues.utilidadPorcentaje}%</label>
            <input
              type="text"
              value={calculatedValues.utilidad}
              disabled={true}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-500"
            />
          </div>

          {/* P.V.P sin I.V.A */}
          <div>
            <label className="block text-xs text-gray-700">
              P.V.P sin I.V.A
              <span className="text-gray-400 ml-2">
                = P.Compra + 
                <input
                  type="number"
                  value={porcentajes.margenPVP}
                  onChange={(e) => setPorcentajes(prev => ({...prev, margenPVP: parseFloat(e.target.value) || 0}))}
                  className="w-11 mx-1 px-1 text-xs border-0 border-b border-gray-300 bg-transparent"
                  min="0"
                  step="1"
                  disabled={!formActive}
                />
                %
              </span>
            </label>
            <div className="mt-0.5 flex gap-1">
              <input
                type="number"
                step="0.00001"
                min="0"
                value={formData.pvp === 0 ? '' : formData.pvp}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange('pvp', value === '' ? 0 : value);
                }}
                onFocus={(e) => e.target.select()}
                disabled={!formActive}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
              {formActive && (
                <button
                  type="button"
                  onClick={() => aplicarFormulaPVP()}
                  className="px-3 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-500 text-gray-700 whitespace-nowrap"
                >
                  Aplicar
                </button>
              )}
            </div>
          </div>

          {/* P.V.P con I.V.A */}
          <div>
            <label className="block text-xs text-gray-700">P.V.P con I.V.A</label>
            <input
              type="text"
              value={calculatedValues.pvpConIva}
              disabled={true}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-100 text-gray-500"
            />
          </div>

          {/* Grava IVA */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.grabaiva === '1'}
                onChange={(e) => handleInputChange('grabaiva', e.target.checked ? '1' : '0')}
                disabled={!formActive}
                className="mr-2"
              />
              <span className="text-xs text-gray-700">Grava IVA</span>
            </label>
          </div>

          {/* Precio de venta mayorista */}
          <div>
            <label className="block text-xs text-gray-700">
              Precio de venta mayorista
              <span className="text-gray-400 ml-2">
                = PVP × 
                <input
                  type="number"
                  value={porcentajes.porcentajeMayorista}
                  onChange={(e) => setPorcentajes(prev => ({...prev, porcentajeMayorista: parseFloat(e.target.value) || 0}))}
                  className="w-11 mx-1 px-1 text-xs border-0 border-b border-gray-300 bg-transparent"
                  min="0"
                  step="1"
                  disabled={!formActive}
                />
                %
              </span>
            </label>
            <div className="mt-0.5 flex gap-1">
              <input
                type="number"
                step="0.00001"
                min="0"
                value={formData.pmayorista === 0 ? '' : formData.pmayorista}
                onChange={(e) => {
                  const value = e.target.value;
                  handleInputChange('pmayorista', value === '' ? 0 : value);
                }}
                onFocus={(e) => e.target.select()}
                disabled={!formActive}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
              {formActive && (
                <button
                  type="button"
                  onClick={() => aplicarFormulaMayorista()}
                  className="px-3 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-500 text-gray-700 whitespace-nowrap"
                >
                  Aplicar
                </button>
              )}
            </div>
          </div>

          {/* Precio consignación */}
          <div>
            <label className="block text-xs text-gray-700">Precio consignación</label>
            <input
              type="number"
              step="0.00001"
              min="0"
              value={formData.pconsignacion === 0 ? '' : formData.pconsignacion}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange('pconsignacion', value === '' ? 0 : value);
              }}
              onFocus={(e) => e.target.select()}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* IVA % */}
          <div>
            <label className="block text-xs text-gray-700">IVA %</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.iva_percentage}
              onChange={(e) => handleInputChange('iva_percentage', parseFloat(e.target.value) || 0)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Es Servicio */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isservicio === '1'}
                onChange={(e) => handleInputChange('isservicio', e.target.checked ? '1' : '0')}
                disabled={!formActive}
                className="mr-2"
              />
              <span className="text-xs text-gray-700">Es Servicio</span>
            </label>
          </div>

          {/* Procedencia */}
          <div>
            <label className="block text-xs text-gray-700">Procedencia</label>
            <input
              type="text"
              value={formData.procedencia}
              onChange={(e) => handleInputChange('procedencia', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Deducible */}
          <div>
            <label className="block text-xs text-gray-700">Deducible</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.deducible}
              onChange={(e) => handleInputChange('deducible', parseFloat(e.target.value) || 0)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs text-gray-700">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleInputChange('descripcion', e.target.value)}
              disabled={!formActive}
              rows={2}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-xs text-gray-700">Imagen</label>
            <div className="mt-0.5 space-y-2">
              {/* Campo de ruta de imagen */}
              <div className="flex gap-1">
                <input
                  type="text"
                  value={formData.foto}
                  onChange={(e) => handleInputChange('foto', e.target.value)}
                  disabled={!formActive}
                  placeholder="Ruta de la imagen (ej: C:\imagenes\producto.jpg)"
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                />
                {formActive && (
                  <>
                    <button
                      type="button"
                      onClick={() => document.getElementById('fileInput').click()}
                      className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 whitespace-nowrap"
                    >
                      Examinar
                    </button>
                  </>
                )}
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              
              {/* Vista previa de la imagen */}
              {formData.foto && validateImagePath(formData.foto) && (
                <div className="border border-gray-200 rounded p-2 bg-gray-50">
                  <div className="text-xs text-gray-600 mb-1">Vista previa:</div>
                  <div className="flex justify-center">
                    {imageLoading ? (
                      <div className="flex items-center justify-center h-20 text-xs text-gray-500">
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando imagen...
                      </div>
                    ) : imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Vista previa"
                        className="max-w-full max-h-20 object-contain border border-gray-200 rounded"
                        onError={(e) => {
                          console.error('Error cargando imagen en elemento img');
                          setImagePreview(null);
                        }}
                        onLoad={() => {
                          // Imagen cargada exitosamente
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-20 text-xs text-amber-600 text-center p-2">
                        <div>
                          <svg className="w-6 h-6 mx-auto mb-1 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <div className="font-semibold">Imagen detectada pero no se puede cargar</div>
                            <div className="mt-1 text-xs">
                              Ruta: <span className="font-mono break-all">{formData.foto}</span>
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
                  
                  {/* Información adicional de debug */}
                  <div className="mt-2 text-xs text-gray-400 border-t pt-1">
                    <div>Ruta completa: {formData.foto}</div>
                    <div>Electron API: {window.electronAPI?.readImageAsBase64 ? 'Disponible' : 'No disponible'}</div>
                    <div>Estado: {imageLoading ? 'Cargando...' : imagePreview ? 'Cargada' : 'Error'}</div>
                  </div>
                </div>
              )}
              
              {/* Información de ayuda */}
              {formActive && (
                <div className="text-xs text-gray-500">
                  Puede escribir la ruta manualmente o usar "Examinar" para seleccionar una imagen.
                  <br />
                  Formatos soportados: JPG, PNG, GIF, BMP, WebP
                </div>
              )}
            </div>
          </div>

          {formActive && (
             <div className="pt-2">
               <button
                 type="submit"
                 className="w-full bg-gray-900 text-white py-1 px-2 text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
                 {producto ? 'Actualizar' : 'Guardar'}
               </button>
               <button
                 type="button"
                 onClick={onCancel}
                 className="w-full mt-1 bg-gray-300 text-gray-700 py-1 px-2 text-xs rounded hover:bg-gray-400 transition-colors flex items-center justify-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
                 Cancelar
               </button>
             </div>
           )}
        </form>
    </div>
  );
};

export default ProductoForm;
