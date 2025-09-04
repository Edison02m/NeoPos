import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import TableModel from '../../components/TableModel';
import SearchFilter from '../../components/SearchFilter';
import ProductoController from '../../controllers/ProductoController';
import { FaSearch, FaTimes } from 'react-icons/fa';

const BuscarProductoModal = ({ onClose, onSelect }) => {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('descripcion'); // descripcion, codigobarra, codigoaux

  const productoController = new ProductoController();

  // Configuración de columnas
  const columnas = [
    { key: 'codigobarra', title: 'Código Barra', width: '120px' },
    { key: 'codigoaux', title: 'Código Aux', width: '100px' },
    { key: 'descripcion', title: 'Descripción', flex: 1 },
    { key: 'precio_compra', title: 'P. Compra', width: '100px' },
    { key: 'precio', title: 'P. Venta', width: '100px' },
    { key: 'stock', title: 'Stock', width: '80px' }
  ];

  // Cargar productos al abrir el modal
  useEffect(() => {
    loadProductos();
  }, []);

  // Filtrar productos cuando cambie el filtro
  useEffect(() => {
    filtrarProductos();
  }, [filtro, tipoFiltro, productos]);

  // Manejar tecla F2 y Enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        // F2 ya está abierto este modal
      } else if (e.key === 'Enter' && productosFiltrados.length === 1) {
        e.preventDefault();
        handleSeleccionarProducto(productosFiltrados[0]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productosFiltrados]);

  // Cargar todos los productos
  const loadProductos = async () => {
    try {
      setLoading(true);
      const result = await productoController.getAllProductos();
      if (result.success) {
        setProductos(result.data);
        setProductosFiltrados(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar productos según el tipo de búsqueda
  const filtrarProductos = () => {
    if (!filtro.trim()) {
      setProductosFiltrados(productos);
      return;
    }

    const filtroLower = filtro.toLowerCase().trim();
    const filtrados = productos.filter(producto => {
      switch (tipoFiltro) {
        case 'descripcion':
          return producto.descripcion?.toLowerCase().includes(filtroLower);
        case 'codigobarra':
          return producto.codigobarra?.toLowerCase().includes(filtroLower);
        case 'codigoaux':
          return producto.codigoaux?.toLowerCase().includes(filtroLower);
        default:
          return producto.descripcion?.toLowerCase().includes(filtroLower) ||
                 producto.codigobarra?.toLowerCase().includes(filtroLower) ||
                 producto.codigoaux?.toLowerCase().includes(filtroLower);
      }
    });

    setProductosFiltrados(filtrados);
  };

  // Seleccionar producto
  const handleSeleccionarProducto = (producto) => {
    onSelect(producto);
  };

  // Manejar doble click en fila
  const handleRowDoubleClick = (producto) => {
    handleSeleccionarProducto(producto);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Buscar Producto"
      size="xl"
    >
      <div className="flex flex-col h-96">
        {/* Filtros de búsqueda */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Buscar por:</label>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="descripcion">Descripción</option>
              <option value="codigobarra">Código de Barras</option>
              <option value="codigoaux">Código Auxiliar</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder={`Buscar por ${tipoFiltro}...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {filtro && (
              <button
                onClick={() => setFiltro('')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={16} />
              </button>
            )}
          </div>

          {filtro && (
            <div className="text-sm text-gray-600">
              {productosFiltrados.length} producto(s) encontrado(s)
            </div>
          )}
        </div>

        {/* Tabla de productos */}
        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : (
            <TableModel
              data={productosFiltrados}
              columns={columnas}
              onRowDoubleClick={handleRowDoubleClick}
              emptyMessage="No se encontraron productos"
              maxHeight="300px"
              highlightOnHover={true}
            />
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Cancelar
          </button>
          {productosFiltrados.length === 1 && (
            <button
              onClick={() => handleSeleccionarProducto(productosFiltrados[0])}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Seleccionar
            </button>
          )}
        </div>

        {/* Ayuda */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>Presione Enter cuando haya un solo resultado, Esc para cancelar, o haga doble click en un producto</p>
        </div>
      </div>
    </Modal>
  );
};

export default BuscarProductoModal;
