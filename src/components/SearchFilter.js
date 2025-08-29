import React from 'react';

const SearchFilter = ({ 
  isVisible, 
  mode, // 'search' o 'filter'
  type, 
  value, 
  exactMatch, 
  onTypeChange, 
  onValueChange, 
  onExactMatchChange, 
  onExecute, 
  onClear,
  loading = false 
}) => {
  if (!isVisible) return null;

  const getTypeOptions = () => {
    if (mode === 'search') {
      return [
        { value: 'producto', label: 'Descripción' },
        { value: 'codbarra', label: 'Código de Barras' },
        { value: 'codaux', label: 'Código Auxiliar' }
      ];
    } else {
      return [
        { value: 'producto', label: 'Descripción' },
        { value: 'codbarra', label: 'Código de Barras' },
        { value: 'codaux', label: 'Código Auxiliar' },
        { value: 'categoria', label: 'Categoría' },
        { value: 'marca', label: 'Marca' },
        { value: 'precio', label: 'Precio' },
        { value: 'stock', label: 'Stock' }
      ];
    }
  };

  const getPlaceholder = () => {
    const typeLabels = {
      'producto': 'descripción del producto',
      'codbarra': 'código de barras',
      'codaux': 'código auxiliar',
      'categoria': 'categoría',
      'marca': 'marca',
      'precio': 'precio',
      'stock': 'cantidad en stock'
    };
    
    const action = mode === 'search' ? 'buscar' : 'filtrar';
    return `Ingrese ${typeLabels[type] || 'valor'} para ${action}...`;
  };

  const getTitle = () => {
    return mode === 'search' ? 'Buscar Productos' : 'Filtrar Productos';
  };

  const getButtonText = () => {
    return mode === 'search' ? 'Buscar' : 'Filtrar';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">{getTitle()}</h3>
        <button
          onClick={onClear}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
          disabled={loading}
        >
          Limpiar
        </button>
      </div>
      
      <div className="flex flex-col gap-3">
        {/* Selector de tipo */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            {mode === 'search' ? 'Buscar por:' : 'Filtrar por:'}
          </label>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            disabled={loading}
          >
            {getTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Campo de entrada */}
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={getPlaceholder()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            onKeyPress={(e) => e.key === 'Enter' && onExecute()}
            disabled={loading}
          />
          <button
            onClick={onExecute}
            disabled={loading || !value.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Cargando...' : getButtonText()}
          </button>
        </div>

        {/* Checkbox de coincidencia exacta solo para filtros */}
        {mode === 'filter' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="exactMatch"
              checked={exactMatch}
              onChange={(e) => onExactMatchChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              disabled={loading}
            />
            <label htmlFor="exactMatch" className="text-sm text-gray-600">
              Coincidencia exacta
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;
