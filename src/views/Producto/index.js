import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Producto from '../../models/Producto';
import ProductoController from '../../controllers/ProductoController';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';

// Componentes de la vista de productos
import ProductosList from './ProductosList';
import ProductoForm from './ProductoForm';
import ProductoDetails from './ProductoDetails';
import ActionPanel from './ActionPanel';
import SearchFilter from '../../components/SearchFilter';

const ProductosView = () => {  
  const navigate = useNavigate();

  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Gestión de Productos';
  }, []);

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
  
  // Hook para modales
  const { modalState, showConfirm, showAlert, closeModal } = useModal();
  
  // Controlador
  const productoController = new ProductoController();

  // Cargar datos iniciales
  useEffect(() => {
    loadProductos();
  }, []);

  // Manejar eventos del menú
  useEffect(() => {
    const handleMenuEvent = (event, message) => {
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
          if (productos.length > 0) {
            setSelectedProducto(productos[0]);
          }
          break;
        case 'menu-siguiente-registro':
          if (selectedProducto && productos.length > 0) {
            const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
            if (currentIndex < productos.length - 1) {
              setSelectedProducto(productos[currentIndex + 1]);
            }
          }
          break;
        case 'menu-anterior-registro':
          if (selectedProducto && productos.length > 0) {
            const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
            if (currentIndex > 0) {
              setSelectedProducto(productos[currentIndex - 1]);
            }
          }
          break;
        case 'menu-ultimo-registro':
          if (productos.length > 0) {
            setSelectedProducto(productos[productos.length - 1]);
          }
          break;
        case 'menu-ir-registro':
          // Implementar prompt para número de registro
          break;
          
        // Reportes
        case 'menu-reporte-inventario':
          // Implementar reporte
          break;
        case 'menu-reporte-productos':
          // Implementar reporte
          break;
          
        default:
          // Evento de menú no manejado
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
  }, []); // Sin dependencias para que solo se registre una vez

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
        showAlert('Error', result.message || 'Error al cargar productos');
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      showAlert('Error', 'Error inesperado al cargar productos');
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
      showAlert('Atención', 'Debe seleccionar un producto para editar');
      return;
    }
    setShowForm(true);
  };

  const handleDeleteProducto = () => {
    if (!selectedProducto) {
      showAlert('Atención', 'Debe seleccionar un producto para eliminar');
      return;
    }

    showConfirm(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el producto "${selectedProducto.producto}"?`,
      async () => {
        try {
          setFormLoading(true);
          const result = await productoController.deleteProducto(selectedProducto.codigo);
          
          if (result.success) {
            showAlert('Éxito', result.message);
            await loadProductos();
            setSelectedProducto(null);
            setShowForm(false);
          } else {
            showAlert('Error', result.message);
          }
        } catch (error) {
          console.error('Error al eliminar producto:', error);
          showAlert('Error', 'Error inesperado al eliminar producto');
        } finally {
          setFormLoading(false);
        }
      }
    );
  };

  // Funciones unificadas de búsqueda y filtrado
  const handleSearchFilterExecute = async () => {
    if (!searchFilterValue.trim()) {
      showAlert('Atención', `Por favor ingrese un valor para ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'}`);
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
          showAlert('Información', 
            result.data && result.data.length > 0 
              ? `Se encontraron ${result.data.length} producto(s)` 
              : 'No se encontraron productos con esa búsqueda'
          );
        } else {
          showAlert('Error', result.message || 'Error al buscar productos');
        }
      } else {
        // Lógica de filtrado
        const result = await productoController.filterProductos(searchFilterType, searchFilterValue.trim(), searchFilterExactMatch);
        
        if (result.success) {
          setProductos(result.data || []);
          setCurrentFilter({ type: searchFilterType, value: searchFilterValue.trim(), exact: searchFilterExactMatch });
          setSelectedProducto(null);
          showAlert('Información', 
            result.data && result.data.length > 0 
              ? `Se encontraron ${result.data.length} producto(s)` 
              : 'No se encontraron productos con ese filtro'
          );
        } else {
          showAlert('Error', result.message || 'Error al filtrar productos');
        }
      }
    } catch (error) {
      console.error(`Error al ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'} productos:`, error);
      showAlert('Error', `Error inesperado al ${searchFilterMode === 'search' ? 'buscar' : 'filtrar'} productos`);
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
    showAlert('Información', 'Filtro limpiado - Mostrando todos los productos');
  };

  const handleSearch = () => {
    setSearchFilterMode('search');
    setSearchFilterVisible(!searchFilterVisible);
  };

  const handleMarcarProducto = async () => {
    if (!selectedProducto) {
      showAlert('Atención', 'Debe seleccionar un producto para marcar');
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
          showAlert('Información', 'Producto desmarcado');
        } else {
          // Agregar a la lista local
          setMarkedProducts([...markedProducts, selectedProducto]);
          showAlert('Información', 'Producto marcado');
        }
      } else {
        showAlert('Error', result.message || 'Error al marcar/desmarcar producto');
      }
    } catch (error) {
      console.error('Error al marcar producto:', error);
      showAlert('Error', 'Error inesperado al marcar producto');
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
          showAlert('Información', 'No hay productos marcados');
          return;
        }
        
        setShowMarkedOnly(!showMarkedOnly);
        if (!showMarkedOnly) {
          setProductos(marcados);
        } else {
          loadProductos();
        }
      } else {
        showAlert('Error', result.message || 'Error al cargar productos marcados');
      }
    } catch (error) {
      console.error('Error al cargar productos marcados:', error);
      showAlert('Error', 'Error inesperado al cargar productos marcados');
    }
  };

  const handleLimpiarMarcados = async () => {
    if (markedProducts.length === 0) {
      showAlert('Información', 'No hay productos marcados para limpiar');
      return;
    }

    const confirmed = await showConfirm(
      'Confirmar',
      `¿Está seguro de que desea desmarcar todos los productos (${markedProducts.length} productos)?`
    );

    if (confirmed) {
      try {
        const result = await productoController.clearAllMarks();
        
        if (result.success) {
          setMarkedProducts([]);
          setShowMarkedOnly(false);
          showAlert('Información', 'Todas las marcas han sido eliminadas');
          await loadProductos(); // Recargar para reflejar los cambios
        } else {
          showAlert('Error', result.message || 'Error al limpiar marcas');
        }
      } catch (error) {
        console.error('Error al limpiar marcas:', error);
        showAlert('Error', 'Error inesperado al limpiar marcas');
      }
    }
  };

  const handleExit = () => {
    navigate('/dashboard');
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
        showAlert('Éxito', result.message);
        await loadProductos();
        setShowForm(false);
        setSelectedProducto(null);
      } else {
        showAlert('Error', result.message);
      }
    } catch (error) {
      console.error('Error al guardar producto:', error);
      showAlert('Error', 'Error inesperado al guardar producto');
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
      showAlert('Información', 'Navegado al primer registro');
    }
  };

  const handleGoToNext = () => {
    if (!selectedProducto || productos.length === 0) return;
    
    const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
    if (currentIndex < productos.length - 1) {
      setSelectedProducto(productos[currentIndex + 1]);
      showAlert('Información', 'Navegado al siguiente registro');
    } else {
      showAlert('Información', 'Ya está en el último registro');
    }
  };

  const handleGoToPrevious = () => {
    if (!selectedProducto || productos.length === 0) return;
    
    const currentIndex = productos.findIndex(p => p.codigo === selectedProducto.codigo);
    if (currentIndex > 0) {
      setSelectedProducto(productos[currentIndex - 1]);
      showAlert('Información', 'Navegado al registro anterior');
    } else {
      showAlert('Información', 'Ya está en el primer registro');
    }
  };

  const handleGoToLast = () => {
    if (productos.length > 0) {
      setSelectedProducto(productos[productos.length - 1]);
      showAlert('Información', 'Navegado al último registro');
    }
  };

  const handleGoToRecord = () => {
    const recordNumber = prompt('Ingrese el número de registro (1 - ' + productos.length + '):');
    if (recordNumber) {
      const index = parseInt(recordNumber) - 1;
      if (index >= 0 && index < productos.length) {
        setSelectedProducto(productos[index]);
        showAlert('Información', `Navegado al registro ${recordNumber}`);
      } else {
        showAlert('Error', 'Número de registro inválido');
      }
    }
  };

  // Funciones de reportes
  const handleReporteInventario = () => {
    showAlert('Información', 'Función de reporte de inventario en desarrollo');
    // Aquí se implementaría la generación del reporte de inventario
  };

  const handleReporteProductos = () => {
    showAlert('Información', 'Función de reporte de productos en desarrollo');
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

      {/* Modal */}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        onClose={closeModal}
      />
    </div>
  );
};

export default ProductosView;
