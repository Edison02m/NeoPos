import React from 'react';
import { Package, AlertTriangle, Gem, Tag, X, Search, BarChart3, Activity } from 'lucide-react';

const InventarioFilter = ({
  currentFilter,
  onFilterChange,
  stockMinimo,
  onStockMinimoChange,
  totales,
  productosCount,
  searchTerm,
  onClearSearch
}) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('es-EC').format(value);
  };

  const getFilterIcon = (value) => {
    switch (value) {
      case 'todos': return <Package size={14} />;
      case 'con_stock': return <BarChart3 size={14} />;
      case 'sin_stock': return <AlertTriangle size={14} />;
      case 'stock_minimo': return <Activity size={14} />;
      case 'stock_maximo': return <Gem size={14} />;
      default: return <Package size={14} />;
    }
  };

  const filterOptions = [
    { value: 'todos', label: 'Todos los productos' },
    { value: 'con_stock', label: 'Con existencias (>0)' },
    { value: 'sin_stock', label: 'Sin existencias (=0)' },
    { value: 'stock_minimo', label: `Stock mínimo (≤${stockMinimo})` },
    { value: 'stock_maximo', label: 'Stock máximo' }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Título y estadísticas principales */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Inventario de Existencias</h2>
        <div className="space-y-1 text-sm text-gray-600">
          <p>{totales.total_productos} productos • {totales.total_existencias} unidades</p>
          <p className="font-medium">Total invertido: ${totales.total_invertido.toLocaleString('es-EC', { minimumFractionDigits: 2 })}</p>
          {searchTerm && (
            <div className="flex items-center space-x-2 mt-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex items-center">
                <Search size={12} className="mr-1" />
                Búsqueda: "{searchTerm}"
              </span>
              <button
                onClick={onClearSearch}
                className="text-xs text-red-600 hover:text-red-800 flex items-center"
                title="Limpiar búsqueda"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Filtrar por
        </label>
        <div className="space-y-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center ${
                currentFilter === option.value
                  ? 'bg-gray-100 border-gray-300 text-gray-900 font-medium'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{getFilterIcon(option.value)}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>


      {/* Resumen actual */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-gray-800 text-sm">Resumen Actual</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Productos mostrados:</span>
            <span className="font-medium text-gray-900">
              {formatNumber(productosCount)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Total productos:</span>
            <span className="font-medium text-gray-900">
              {formatNumber(totales.total_productos)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Total unidades:</span>
            <span className="font-medium text-gray-900">
              {formatNumber(totales.total_existencias)}
            </span>
          </div>
          
          <div className="flex justify-between pt-2 border-t border-gray-200">
            <span className="text-gray-700 font-medium">Total invertido:</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(totales.total_invertido)}
            </span>
          </div>
        </div>
      </div>

      {/* Análisis estadístico */}
      <div className="bg-blue-50 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-blue-800 text-sm flex items-center">
          <BarChart3 size={14} className="mr-2" />
          Análisis Estadístico
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Inversión promedio:</span>
            <span className="font-medium text-blue-900">
              {formatCurrency(totales.total_productos > 0 ? totales.total_invertido / totales.total_productos : 0)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-700">Existencia promedio:</span>
            <span className="font-medium text-blue-900">
              {formatNumber(totales.total_productos > 0 ? totales.total_existencias / totales.total_productos : 0)} und
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-blue-700">Última actualización:</span>
            <span className="font-medium text-blue-900">
              {new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Indicadores de estado */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-800 text-sm">Indicadores</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span className="text-gray-600">Stock crítico (≤5)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
            <span className="text-gray-600">Stock bajo (≤10)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
            <span className="text-gray-600">Stock normal</span>
          </div>
        </div>
      </div>


    </div>
  );
};

export default InventarioFilter;
