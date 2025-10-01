import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, Package } from 'lucide-react';

const BuscarProductoModal = ({ 
  isOpen, 
  onClose, 
  busquedaProducto, 
  setBusquedaProducto, 
  catalogoProductos = [],
  agregarProducto 
}) => {
  const [loading] = useState(false);

  // Filtrado local en memoria sobre el catálogo completo
  const resultadosFiltrados = useMemo(() => {
    const term = (busquedaProducto || '').trim().toLowerCase();
    if (!term) return catalogoProductos;
    return (catalogoProductos || []).filter(p => {
      const campos = [
        p.codigo,
        p.producto,
        p.descripcion,
        p.codbarra,
        p.codaux
      ].map(v => (v == null ? '' : String(v).toLowerCase()));
      return campos.some(v => v.includes(term));
    });
  }, [catalogoProductos, busquedaProducto]);

  const handleAgregarProducto = (producto) => {
    agregarProducto(producto);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Buscar Producto</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Buscando productos...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              {resultadosFiltrados && resultadosFiltrados.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {resultadosFiltrados.map((producto) => (
                    <div 
                      key={producto.codigo}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleAgregarProducto(producto)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {producto.producto || producto.descripcion || producto.nombre || 'Producto'}
                              </h3>
                              <p className="text-sm text-gray-500 truncate">
                                Código: {producto.codigo}
                              </p>
                              {producto.nombre && (
                                <p className="text-xs text-gray-400 truncate">
                                  {producto.nombre}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ${ (typeof producto.precio === 'number' ? producto.precio : (parseFloat(producto.pvp) || 0)).toFixed(2) }
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              Stock: {producto.stock ?? producto.almacen ?? 0}
                            </span>
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                !(producto.stock ?? producto.almacen) || (producto.stock ?? producto.almacen) === 0 
                                  ? 'bg-red-400' 
                                  : (producto.stock ?? producto.almacen) < 10 
                                  ? 'bg-yellow-400' 
                                  : 'bg-green-400'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : busquedaProducto.trim() ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Package className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm">No se encontraron productos</p>
                  <p className="text-xs">Intenta con otro término de búsqueda</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Search className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-sm">Escribe para buscar productos</p>
                  <p className="text-xs">Puedes buscar por código o descripción</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {resultadosFiltrados?.length > 0 ? (
                `${resultadosFiltrados.length} producto${resultadosFiltrados.length !== 1 ? 's' : ''} encontrado${resultadosFiltrados.length !== 1 ? 's' : ''}`
              ) : (
                'Escribe en el campo de búsqueda para encontrar productos'
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuscarProductoModal;
