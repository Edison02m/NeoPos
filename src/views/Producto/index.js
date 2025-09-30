import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Producto from '../../models/Producto';
import ProductoController from '../../controllers/ProductoController';
import ExportModal from '../../components/ExportModal';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
import * as ReportGenerator from '../../utils/reportGenerator';

// Utilidad: resolver el export real del módulo de reportes (named o default)
function getReportGenerator() {
  try {
    const mod = ReportGenerator;
    const hasNamed = mod && typeof mod.generateProductsExcel === 'function';
    const hasDefault = mod && mod.default && typeof mod.default.generateProductsExcel === 'function';
    return hasNamed ? mod : (hasDefault ? mod.default : mod);
  } catch (e) {
    console.error('[REPORT] Error resolviendo módulo ReportGenerator:', e);
    return ReportGenerator;
  }
}

// Componentes de la vista de productos
import ProductosList from './ProductosList';
import ProductoForm from './ProductoForm';
import ProductoDetails from './ProductoDetails';
import ActionPanel from './ActionPanel';
import SearchFilter from '../../components/SearchFilter';

const ProductosView = () => {  
  const navigate = useNavigate();
  const { modalState, showConfirm, showAlert, closeModal } = useModal();

  // Fallbacks locales por si el módulo de reportes no expone las funciones correctamente
  const fallbackGenerateProductsExcel = async (productos, filename) => {
    try {
      
      const data = productos.map(producto => ({
        'Código': producto.codigo,
        'Producto': producto.producto,
        'Código de Barras': producto.codbarra || '',
        'Precio Compra': producto.pcompra || 0,
        'Precio Venta': producto.pvp || 0,
        'Precio Mayorista': producto.pmayorista || 0,
        'Stock Almacén': producto.almacen || 0,
        'Stock Bodega 1': producto.bodega1 || 0,
        'Stock Bodega 2': producto.bodega2 || 0,
  // Total de existencias sumando todas las ubicaciones
  'Stock Total': (producto.almacen || 0) + (producto.bodega1 || 0) + (producto.bodega2 || 0),
        'Mínimo': producto.minimo || 0,
        'Máximo': producto.maximo || 0,
        'Peso': producto.peso || 0,
        'IVA %': producto.iva_percentage || 0,
        'Graba IVA': producto.grabaiva === '1' ? 'Sí' : 'No',
        'Es Servicio': producto.isservicio === '1' ? 'Sí' : 'No'
      }));
      if (!window?.electronAPI?.generateExcelReport) {
        return { success: false, error: 'electronAPI.generateExcelReport no disponible' };
      }
      return await window.electronAPI.generateExcelReport(data, filename, 'Productos');
    } catch (e) {
      console.error('[FALLBACK] Error generateProductsExcel:', e);
      return { success: false, error: e?.message || String(e) };
    }
  };

  const fallbackGenerateProductsPDF = async (productos, filename) => {
    try {
      // Formato productos: Código | Producto | Cod. Barras | P. Venta | IVA | Existencia
      let sumaExistencia = 0;
      const headers = ['Código', 'Producto', 'Cod. Barras', 'P. Venta', 'IVA', 'Existencia'];
      const rows = productos.map(p => {
        const existencia = (p.almacen || 0) + (p.bodega1 || 0) + (p.bodega2 || 0);
        sumaExistencia += existencia;
        return [
          p.codigo,
          (p.producto || '').substring(0, 60),
          p.codbarra || '',
          Number(p.pvp || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          p.grabaiva === '1' ? 'Sí' : 'No',
          existencia
        ];
      });

      const reportData = {
        title: 'REPORTE DE PRODUCTOS',
        headers,
        data: rows,
        stats: [
          `Total de productos: ${productos.length}`,
          `Existencia total: ${sumaExistencia}`,
          `Fecha: ${new Date().toLocaleDateString('es-EC')}`
        ]
      };
      if (!window?.electronAPI?.generatePDFReport) {
        return { success: false, error: 'electronAPI.generatePDFReport no disponible' };
      }
      return await window.electronAPI.generatePDFReport(reportData, filename);
    } catch (e) {
      console.error('[FALLBACK] Error generateProductsPDF:', e);
      return { success: false, error: e?.message || String(e) };
    }
  };

  // (Eliminado) Reportes de inventario: esta vista ahora solo maneja reportes de productos.

  // document.title eliminado: título controlado por WindowManager

  // Estados principales
  const [productos, setProductos] = useState([]);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de búsqueda y filtros unificados
  const [searchFilterVisible, setSearchFilterVisible] = useState(false);
  const [searchFilterMode, setSearchFilterMode] = useState('search'); // 'search' o 'filter'
  const [searchFilterType, setSearchFilterType] = useState('producto');
  const [searchFilterValue, setSearchFilterValue] = useState('');
  const [searchFilterExactMatch, setSearchFilterExactMatch] = useState(false);
  const [currentFilter, setCurrentFilter] = useState({ type: '', value: '', exact: false });
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Estados de productos marcados
  const [markedProducts, setMarkedProducts] = useState([]);
  const [showMarkedOnly, setShowMarkedOnly] = useState(false);
  
  // Estados para el modal de exportación
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Helpers: diálogos nativos con restauración de foco robusta (fallback a alert/confirm)
  const tryFocus = (el) => {
    if (!el) return false;
    if (el.disabled || el.readOnly) return false;
    if (el.offsetParent === null && el !== document.body) return false; // oculto
    if (typeof el.focus === 'function') {
      el.focus();
      try {
        if (el.setSelectionRange && typeof el.value === 'string') {
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      } catch (_) {}
      return document.activeElement === el;
    }
    return false;
  };

  const getFirstFocusable = (root = document) => {
    const sel = 'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable="true"], button:not([disabled])';
    const list = Array.from(root.querySelectorAll(sel));
    return list.find(el => el.offsetParent !== null) || null;
  };

  const restoreFocus = (last) => {
    try { window?.focus?.(); } catch (_) {}
    const container = (last && last.closest && last.closest('form')) || document;
    const candidate = (last && document.contains(last) && !last.disabled && last.offsetParent !== null) ? last : getFirstFocusable(container);
    const fallbackSelector = '#codbarra, input[name="codbarra"], input, textarea, select, [contenteditable="true"]';
    const doRestore = () => {
      if (tryFocus(candidate)) return;
      const fromContainer = container.querySelector ? container.querySelector(fallbackSelector) : null;
      if (tryFocus(fromContainer)) return;
      if (tryFocus(getFirstFocusable(document))) return;
      const fromDoc = document.querySelector(fallbackSelector);
      tryFocus(fromDoc);
    };
    // Intentos en 0ms, 50ms y 120ms para cubrir timings de Electron
    setTimeout(doRestore, 0);
    setTimeout(doRestore, 50);
    setTimeout(doRestore, 120);
    // Notificar a formularios por si quieren autoenfocar un campo específico
    try { window.dispatchEvent(new CustomEvent('cascade-restore-focus', { detail: { scope: 'productos' } })); } catch (_) {}
  };

  const nativeAlert = async (message, title = 'Información') => {
    const last = typeof document !== 'undefined' ? document.activeElement : null;
    try {
      await showAlert(message, title);
    } catch (_e) {
      // fallback
      alert(`${title}: ${message}`);
    } finally {
      restoreFocus(last);
    }
  };

  const nativeConfirm = async (message, title = 'Confirmación') => {
    const last = typeof document !== 'undefined' ? document.activeElement : null;
    try {
      return await showConfirm(message, title);
    } catch (_e) {
      return window.confirm(`${title}: ${message}`);
    } finally {
      restoreFocus(last);
    }
  };
  
  // Controlador
  const productoController = new ProductoController();

  // Cargar datos iniciales
  useEffect(() => {
    loadProductos();
  }, []);

  // Manejar eventos del menú
  useEffect(() => {
    const handleMenuEvent = async (event, message) => {
      
      switch (message) {
        // Búsquedas
        case 'menu-buscar-descripcion':
          setSearchFilterType('producto');
          setSearchFilterMode('search');
          setSearchFilterVisible(true);
          break;
        case 'menu-buscar-codigo-barras':
          setSearchFilterType('codbarra');
          setSearchFilterMode('search');
          setSearchFilterVisible(true);
          break;
        case 'menu-buscar-codigo-auxiliar':
          setSearchFilterType('codaux');
          setSearchFilterMode('search');
          setSearchFilterVisible(true);
          break;
        case 'menu-filtrar-productos':
          setSearchFilterMode('filter');
          setSearchFilterVisible(true);
          break;
          
        // Marcado de productos
        case 'menu-marcar-producto':
          if (selectedProducto) {
            const isMarked = markedProducts.some(p => p.codigo === selectedProducto.codigo);
            if (isMarked) {
              setMarkedProducts(prev => prev.filter(p => p.codigo !== selectedProducto.codigo));
            } else {
              setMarkedProducts(prev => [...prev, selectedProducto]);
            }
          }
          break;
        case 'menu-productos-marcados':
          setShowMarkedOnly(prev => !prev);
          break;
          
        // Navegación
        case 'menu-primer-registro':
          
          try {
            const primerProducto = await Producto.getFirstRecord();
            if (primerProducto) {
              setSelectedProducto(primerProducto);
              
            }
          } catch (error) {
            console.error('[PRODUCTOS] Error al obtener primer registro:', error);
          }
          break;
        case 'menu-ultimo-registro':
          
          try {
            const ultimoProducto = await Producto.getLastRecord();
            if (ultimoProducto) {
              setSelectedProducto(ultimoProducto);
              
            }
          } catch (error) {
            console.error('[PRODUCTOS] Error al obtener último registro:', error);
          }
          break;
          
  // Reportes (solo productos)
  case 'menu-reporte-productos':
          
          try {
            const todosLosProductos = await productoController.getAllProductos();
            if (todosLosProductos.success && todosLosProductos.data?.length > 0) {
              setExportModalOpen(true);
            } else {
              nativeAlert('No hay productos para generar el reporte', 'Información');
            }
          } catch (error) {
            console.error('[PRODUCTOS] Error al verificar productos para reporte:', error);
            nativeAlert('No se pudo obtener los datos para el reporte', 'Error');
          }
          break;
          
        default:
          
          break;
      }
    };

    // Registrar el listener para eventos del menú
    if (window.electronAPI?.onMenuEvent) {
      
      const removeListener = window.electronAPI.onMenuEvent(handleMenuEvent);
      return () => {
        if (removeListener) removeListener();
      };
    }
  }, [productos, selectedProducto, markedProducts, productoController]); // Incluir dependencias necesarias

  // Cargar productos
  const loadProductos = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los productos
      const result = await productoController.getAllProductos();
      
      if (result.success) {
        setProductos(result.data || []);
        
        // Cargar productos marcados desde la base de datos
        const markedResult = await productoController.getMarkedProducts();
        if (markedResult.success) {
          setMarkedProducts(markedResult.data || []);
        }
      } else {
        console.error('Error al cargar productos:', result.message);
        nativeAlert(result.message || 'Error al cargar productos', 'Error');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      nativeAlert('Error inesperado al cargar productos', 'Error');
    } finally {
      setLoading(false);
    }
  };

  // Funciones de manejo de productos
  const handleNewProducto = () => {
    setSelectedProducto(null);
    setShowForm(true);
  };

  const handleEditProducto = () => {
    if (!selectedProducto) {
      nativeAlert('Debe seleccionar un producto para editar', 'Atención');
      return;
    }
    setShowForm(true);
  };

  const handleDeleteProducto = () => {
    if (!selectedProducto) {
      nativeAlert('Debe seleccionar un producto para eliminar', 'Atención');
      return;
    }
    (async () => {
      const ok = await nativeConfirm(`¿Está seguro de que desea eliminar el producto "${selectedProducto.producto}"?`, 'Confirmar eliminación');
      if (!ok) return;
      try {
        setFormLoading(true);
        const result = await productoController.deleteProducto(selectedProducto.codigo);
        if (result.success) {
          await nativeAlert(result.message || 'Producto eliminado', 'Éxito');
          await loadProductos();
          setSelectedProducto(null);
          setShowForm(false);
        } else {
          await nativeAlert(result.message || 'No se pudo eliminar el producto', 'Error');
        }
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        await nativeAlert('Error inesperado al eliminar producto', 'Error');
      } finally {
        setFormLoading(false);
      }
    })();
  };

  // Funciones unificadas de búsqueda y filtrado
  const handleSearchFilterExecute = async () => {
    if (!searchFilterValue.trim()) {
      nativeAlert(`Por favor ingrese un valor para ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'}`, 'Atención');
      return;
    }

    try {
      setLoading(true);
      
      if (searchFilterMode === 'search') {
        // Lógica de búsqueda
        const result = await productoController.searchProductos(searchFilterValue.trim(), searchFilterType);
        
        if (result.success) {
          setProductos(result.data || []);
          setSelectedProducto(null);
          nativeAlert(result.data && result.data.length > 0 
              ? `Se encontraron ${result.data.length} producto(s)` 
              : 'No se encontraron productos con esa búsqueda', 'Información');
        } else {
          nativeAlert(result.message || 'Error al buscar productos', 'Error');
        }
      } else {
        // Lógica de filtrado
        const result = await productoController.filterProductos(searchFilterType, searchFilterValue.trim(), searchFilterExactMatch);
        
        if (result.success) {
          setProductos(result.data || []);
          setCurrentFilter({ type: searchFilterType, value: searchFilterValue.trim(), exact: searchFilterExactMatch });
          setSelectedProducto(null);
          nativeAlert(result.data && result.data.length > 0 
              ? `Se encontraron ${result.data.length} producto(s)` 
              : 'No se encontraron productos con ese filtro', 'Información');
        } else {
          nativeAlert(result.message || 'Error al filtrar productos', 'Error');
        }
      }
    } catch (error) {
      console.error(`Error al ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'} productos:`, error);
      nativeAlert(`Error inesperado al ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'} productos`, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchFilterClear = async () => {
    setSearchFilterValue('');
    setSearchFilterExactMatch(false);
    setCurrentFilter({ type: '', value: '', exact: false });
    setSearchFilterVisible(false);
    await loadProductos();
    nativeAlert('Filtro limpiado - Mostrando todos los productos', 'Información');
  };

  const handleSearch = () => {
    setSearchFilterMode('search');
    setSearchFilterVisible(!searchFilterVisible);
  };

  const handleMarcarProducto = async () => {
    if (!selectedProducto) {
      nativeAlert('Debe seleccionar un producto para marcar', 'Atención');
      return;
    }

    try {
      const isMarked = markedProducts.some(p => p.codigo === selectedProducto.codigo);
      
      // Marcar/desmarcar en la base de datos
      const result = await productoController.markProduct(selectedProducto.codigo, !isMarked);
      
      if (result.success) {
        if (isMarked) {
          // Remover de la lista local
          setMarkedProducts(markedProducts.filter(p => p.codigo !== selectedProducto.codigo));
          nativeAlert('Producto desmarcado', 'Información');
        } else {
          // Agregar a la lista local
          setMarkedProducts([...markedProducts, selectedProducto]);
          nativeAlert('Producto marcado', 'Información');
        }
      } else {
        nativeAlert(result.message || 'Error al marcar/desmarcar producto', 'Error');
      }
    } catch (error) {
      console.error('Error al marcar producto:', error);
      nativeAlert('Error inesperado al marcar producto', 'Error');
    }
  };

  const handleVerMarcados = async () => {
    try {
      // Cargar productos marcados desde la base de datos
      const result = await productoController.getMarkedProducts();
      
      if (result.success) {
        const marcados = result.data || [];
        setMarkedProducts(marcados);
        
        if (marcados.length === 0) {
          nativeAlert('No hay productos marcados', 'Información');
          return;
        }
        
        setShowMarkedOnly(!showMarkedOnly);
        if (!showMarkedOnly) {
          setProductos(marcados);
        } else {
          loadProductos();
        }
      } else {
        nativeAlert(result.message || 'Error al cargar productos marcados', 'Error');
      }
    } catch (error) {
      console.error('Error al cargar productos marcados:', error);
      nativeAlert('Error inesperado al cargar productos marcados', 'Error');
    }
  };

  const handleLimpiarMarcados = async () => {
    if (markedProducts.length === 0) {
      nativeAlert('No hay productos marcados para limpiar', 'Información');
      return;
    }

    const confirmed = await nativeConfirm(`¿Está seguro de que desea desmarcar todos los productos (${markedProducts.length} productos)?`, 'Confirmar');

    if (confirmed) {
      try {
        const result = await productoController.clearAllMarks();
        
        if (result.success) {
          setMarkedProducts([]);
          setShowMarkedOnly(false);
          nativeAlert('Todas las marcas han sido eliminadas', 'Información');
          await loadProductos(); // Recargar para reflejar los cambios
        } else {
          nativeAlert(result.message || 'Error al limpiar marcas', 'Error');
        }
      } catch (error) {
        console.error('Error al limpiar marcas:', error);
        nativeAlert('Error inesperado al limpiar marcas', 'Error');
      }
    }
  };

  const handleExit = () => {
    try {
      if (window?.electronAPI?.closeWindow) {
        // Cerrar únicamente la ventana de Productos
        window.electronAPI.closeWindow('productos');
      } else {
        // Fallback: cerrar la ventana actual del navegador (solo esta)
        window.close();
      }
    } catch (e) {
      console.error('Error al cerrar la ventana de productos:', e);
    }
  };

  // Guardar producto
  const handleSaveProducto = async (productoData) => {
    try {
      setFormLoading(true);
      let result;

      if (selectedProducto) {
        // Actualizar producto existente
        result = await productoController.updateProducto(selectedProducto.codigo, productoData);
      } else {
        // Crear nuevo producto
        result = await productoController.createProducto(productoData);
      }

      if (result.success) {
        await nativeAlert(result.message || 'Producto guardado', 'Éxito');
        await loadProductos();
        setShowForm(false);
        setSelectedProducto(null);
      } else {
        await nativeAlert(result.message || 'Error al guardar producto', 'Error');
      }
    } catch (error) {
      console.error('Error al guardar producto:', error);
      await nativeAlert('Error inesperado al guardar producto', 'Error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setSelectedProducto(null);
  };

  const handleSelectProducto = (producto) => {
    setSelectedProducto(producto);
    // No cerrar el formulario si está en modo edición, solo actualizarlo
    // El formulario se actualizará automáticamente via useEffect en ProductoForm
  };

  // Nuevas funciones para manejar eventos del menú

  // Funciones de navegación
  const handleGoToFirst = () => {
    if (productos.length > 0) {
      setSelectedProducto(productos[0]);
      nativeAlert('Navegado al primer registro', 'Información');
    }
  };

  const handleGoToNext = () => {
    if (!selectedProducto || productos.length === 0) return;
    
    const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
    if (currentIndex < productos.length - 1) {
      setSelectedProducto(productos[currentIndex + 1]);
      nativeAlert('Navegado al siguiente registro', 'Información');
    } else {
      nativeAlert('Ya está en el último registro', 'Información');
    }
  };

  const handleGoToPrevious = () => {
    if (!selectedProducto || productos.length === 0) return;
    
    const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
    if (currentIndex > 0) {
      setSelectedProducto(productos[currentIndex - 1]);
      nativeAlert('Navegado al registro anterior', 'Información');
    } else {
      nativeAlert('Ya está en el primer registro', 'Información');
    }
  };

  const handleGoToLast = () => {
    if (productos.length > 0) {
      setSelectedProducto(productos[productos.length - 1]);
      nativeAlert('Navegado al último registro', 'Información');
    }
  };

  const handleGoToRecord = () => {
    const recordNumber = prompt('Ingrese el número de registro (1 - ' + productos.length + '):');
    if (recordNumber) {
      const index = parseInt(recordNumber) - 1;
      if (index >= 0 && index < productos.length) {
        setSelectedProducto(productos[index]);
        nativeAlert(`Navegado al registro ${recordNumber}`, 'Información');
      } else {
        nativeAlert('Número de registro inválido', 'Error');
      }
    }
  };

  // Funciones de reportes mejoradas
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const todosLosProductos = await productoController.getAllProductos();
      if (!todosLosProductos.success || !todosLosProductos.data?.length) {
        nativeAlert('No se pudieron obtener los datos para el reporte', 'Error');
        return;
      }

      const timestamp = new Date().toISOString().slice(0,10);
      let result;

      const RG = getReportGenerator();
      const hasProdExcel = RG && typeof RG.generateProductsExcel === 'function';
      result = hasProdExcel
        ? await RG.generateProductsExcel(
        todosLosProductos.data, 
        `productos_${timestamp}`
      )
        : await fallbackGenerateProductsExcel(todosLosProductos.data, `productos_${timestamp}`);

      if (result.success) {
        // En éxito, cerramos el modal sin mostrar alerta
        setExportModalOpen(false);
      } else {
        nativeAlert(result.error || 'No se pudo generar el reporte Excel', 'Error');
      }
    } catch (error) {
      console.error('Error generando Excel:', error);
      nativeAlert(`Error inesperado al generar el reporte Excel: ${error?.message || error}`, 'Error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const todosLosProductos = await productoController.getAllProductos();
      if (!todosLosProductos.success || !todosLosProductos.data?.length) {
        nativeAlert('No se pudieron obtener los datos para el reporte', 'Error');
        return;
      }

      const timestamp = new Date().toISOString().slice(0,10);
      let result;

      const RG = getReportGenerator();
      const hasProdPDF = RG && typeof RG.generateProductsPDF === 'function';
      result = hasProdPDF
        ? await RG.generateProductsPDF(
        todosLosProductos.data, 
        `productos_${timestamp}`
      )
        : await fallbackGenerateProductsPDF(todosLosProductos.data, `productos_${timestamp}`);

      if (result.success) {
        // En éxito, cerramos el modal sin mostrar alerta
        setExportModalOpen(false);
      } else {
        nativeAlert(result.error || 'No se pudo generar el reporte PDF', 'Error');
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      nativeAlert(`Error inesperado al generar el reporte PDF: ${error?.message || error}`, 'Error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleCloseExportModal = () => {
    if (!exportLoading) {
      setExportModalOpen(false);
    }
  };

  // Funciones de reportes (mantener por compatibilidad)
  const handleReporteInventario = () => {
    nativeAlert('Función de reporte de inventario en desarrollo', 'Información');
    // Aquí se implementaría la generación del reporte de inventario
  };

  const handleReporteProductos = () => {
    nativeAlert('Función de reporte de productos en desarrollo', 'Información');
    // Aquí se implementaría la generación del reporte de productos
  };

  // Funciones de filtrado (para el modal - mantenemos por compatibilidad)
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Contenido principal */}
      <div className="flex flex-1 min-h-0">
        {/* Panel izquierdo - Acciones */}
        <div className="flex-shrink-0">
          <ActionPanel
            selectedItem={selectedProducto}
            onNewClick={handleNewProducto}
            onEditClick={handleEditProducto}
            onDeleteClick={handleDeleteProducto}
            onSearchClick={handleSearch}
            onMarcarClick={handleMarcarProducto}
            onMarcadosClick={handleVerMarcados}
            onExitClick={handleExit}
            markedCount={markedProducts.length}
            showingMarked={showMarkedOnly}
            loading={loading || formLoading}
          />
        </div>

        {/* Área central - Tabla */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          {/* Componente unificado de búsqueda y filtros */}
          <SearchFilter
            isVisible={searchFilterVisible}
            mode={searchFilterMode}
            type={searchFilterType}
            value={searchFilterValue}
            exactMatch={searchFilterExactMatch}
            onTypeChange={setSearchFilterType}
            onValueChange={setSearchFilterValue}
            onExactMatchChange={setSearchFilterExactMatch}
            onExecute={handleSearchFilterExecute}
            onClear={handleSearchFilterClear}
            loading={loading}
          />

          {/* Lista de productos con scroll */}
          <div className="flex-1 min-h-0">
            <ProductosList
              productos={showMarkedOnly ? markedProducts : productos}
              selectedProducto={selectedProducto}
              onSelectProducto={handleSelectProducto}
              loading={loading}
              markedProducts={markedProducts}
            />
          </div>
        </div>

        {/* Panel derecho - Formulario o Detalles */}
        <div className="w-96 p-2 flex flex-col min-h-0 flex-shrink-0">
          <div className="flex-1 bg-white rounded border border-gray-200 overflow-hidden min-h-0">
            {showForm ? (
              <ProductoForm
                producto={selectedProducto}
                onSave={handleSaveProducto}
                onCancel={handleCancelForm}
                loading={formLoading}
                formActive={true}
              />
            ) : (
              <ProductoDetails
                producto={selectedProducto}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal de exportación */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={handleCloseExportModal}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
        title="Exportar Reporte de Productos"
        loading={exportLoading}
      />
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onClose}
      />
    </div>
  );
};

export default ProductosView;
