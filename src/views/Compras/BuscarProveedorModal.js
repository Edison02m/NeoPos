import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import TableModel from '../../components/TableModel';
import SearchFilter from '../../components/SearchFilter';
import ProveedorController from '../../controllers/ProveedorController';
import { FaSearch, FaTimes, FaPlus, FaEdit } from 'react-icons/fa';

const BuscarProveedorModal = ({ onClose, onSelect }) => {
  const [proveedores, setProveedores] = useState([]);
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  const proveedorController = new ProveedorController();

  // Configuración de columnas
  const columnas = [
    { key: 'id', title: 'ID', width: '80px' },
    { key: 'nombre', title: 'Nombre', flex: 1 },
    { key: 'ruc', title: 'RUC', width: '120px' },
    { key: 'telefono', title: 'Teléfono', width: '120px' },
    { key: 'ciudad', title: 'Ciudad', width: '120px' }
  ];

  // Cargar proveedores al abrir el modal
  useEffect(() => {
    loadProveedores();
  }, []);

  // Filtrar proveedores cuando cambie el filtro
  useEffect(() => {
    filtrarProveedores();
  }, [filtro, proveedores]);

  // Manejar teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && proveedoresFiltrados.length === 1) {
        e.preventDefault();
        handleSeleccionarProveedor(proveedoresFiltrados[0]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [proveedoresFiltrados]);

  // Cargar todos los proveedores
  const loadProveedores = async () => {
    try {
      setLoading(true);
      const result = await proveedorController.getAllProveedores();
      if (result.success) {
        setProveedores(result.data);
        setProveedoresFiltrados(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar proveedores
  const filtrarProveedores = () => {
    if (!filtro.trim()) {
      setProveedoresFiltrados(proveedores);
      return;
    }

    const filtroLower = filtro.toLowerCase().trim();
    const filtrados = proveedores.filter(proveedor =>
      proveedor.nombre?.toLowerCase().includes(filtroLower) ||
      proveedor.ruc?.toLowerCase().includes(filtroLower) ||
      proveedor.telefono?.toLowerCase().includes(filtroLower) ||
      proveedor.ciudad?.toLowerCase().includes(filtroLower)
    );

    setProveedoresFiltrados(filtrados);
  };

  // Seleccionar proveedor
  const handleSeleccionarProveedor = (proveedor) => {
    onSelect(proveedor);
  };

  // Manejar doble click en fila
  const handleRowDoubleClick = (proveedor) => {
    handleSeleccionarProveedor(proveedor);
  };

  // Exportar datos del proveedor (funcionalidad del menú original)
  const handleExportarDatos = (proveedor) => {
    handleSeleccionarProveedor(proveedor);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Buscar Proveedor"
      size="xl"
    >
      <div className="flex flex-col h-96">
        {/* Filtro de búsqueda */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center space-x-2">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar por nombre, RUC, teléfono o ciudad..."
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
              {proveedoresFiltrados.length} proveedor(es) encontrado(s)
            </div>
          )}
        </div>

        {/* Tabla de proveedores */}
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
              data={proveedoresFiltrados}
              columns={columnas}
              onRowDoubleClick={handleRowDoubleClick}
              emptyMessage="No se encontraron proveedores"
              maxHeight="300px"
              highlightOnHover={true}
            />
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Aquí se podría abrir un modal para crear nuevo proveedor
                alert('Funcionalidad para crear nuevo proveedor');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <FaPlus size={16} />
              <span>Nuevo</span>
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
            {proveedoresFiltrados.length === 1 && (
              <button
                onClick={() => handleExportarDatos(proveedoresFiltrados[0])}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Exportar Datos
              </button>
            )}
          </div>
        </div>

        {/* Ayuda */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>Haga doble click en un proveedor para exportar sus datos, o presione "Exportar Datos"</p>
        </div>
      </div>
    </Modal>
  );
};

export default BuscarProveedorModal;
