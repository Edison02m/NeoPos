import React, { useState } from 'react';

const ProductoFilter = ({ onFilter, onClose, isVisible }) => {
  const [filterType, setFilterType] = useState('descripcion');
  const [filterValue, setFilterValue] = useState('');
  const [exactMatch, setExactMatch] = useState(false);

  const filterOptions = [
    { value: 'descripcion', label: 'Descripción' },
    { value: 'codigo', label: 'Código' },
    { value: 'codbarra', label: 'Código de Barras' },
    { value: 'codaux', label: 'Código Auxiliar' },
    { value: 'pvp', label: 'PVP' },
    { value: 'pcompra', label: 'Precio Compra' },
    { value: 'pmayorista', label: 'Precio Mayorista' },
    { value: 'procedencia', label: 'Procedencia' }
  ];

  const handleFilter = () => {
    if (!filterValue.trim()) {
      alert('Por favor ingrese un valor para filtrar');
      return;
    }
    onFilter(filterType, filterValue.trim(), exactMatch);
  };

  const handleClear = () => {
    setFilterValue('');
    setExactMatch(false);
    onFilter('', '', false); // Esto debería mostrar todos los productos
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filtrar Productos</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Selector de tipo de filtro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor a buscar:
            </label>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ingrese ${filterOptions.find(opt => opt.value === filterType)?.label.toLowerCase()}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Checkbox para frase exacta */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="exactMatch"
              checked={exactMatch}
              onChange={(e) => setExactMatch(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="exactMatch" className="ml-2 block text-sm text-gray-700">
              Frase exacta
            </label>
          </div>

          {/* Información de ayuda */}
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Nota:</strong> Para campos numéricos como PVP, se recomienda activar "Frase exacta" 
              para obtener resultados precisos. Para descripción, puede buscar palabras parciales.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductoFilter;
