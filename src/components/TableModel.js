import React from 'react';

const TableModel = ({
  title = 'Tabla',
  columns = [],
  data = [],
  loading = false,
  selectedRow = null,
  onRowClick = () => {},
  emptyMessage = 'No hay datos disponibles',
  className = '',
  tableClassName = '',
  headerClassName = 'bg-gray-50 sticky top-0 z-10',
  rowClassName = 'cursor-pointer hover:bg-gray-100 transition-colors',
  selectedRowClassName = 'bg-gray-200 hover:bg-gray-200',
  cellClassName = 'px-2 py-2 text-gray-500 border-r border-gray-100 truncate',
  showRowNumbers = true
}) => {
  // Función simple para obtener la clase de la fila
  const getRowClassName = (row) => {
    const isSelected = selectedRow && (
      (selectedRow.codigo && selectedRow.codigo === row.codigo) ||
      (selectedRow.cod && selectedRow.cod === row.cod) ||
      (selectedRow.id && selectedRow.id === row.id) ||
      (selectedRow.fecha && selectedRow.fecha === row.fecha)
    );
    
    if (isSelected) {
      return `cursor-pointer ${selectedRowClassName} transition-colors`;
    }
    
    return `${rowClassName}`;
  };

  // Función para obtener los estilos inline del borde
  const getRowStyle = (row) => {
    const isSelected = selectedRow && (
      (selectedRow.codigo && selectedRow.codigo === row.codigo) ||
      (selectedRow.cod && selectedRow.cod === row.cod) ||
      (selectedRow.id && selectedRow.id === row.id) ||
      (selectedRow.fecha && selectedRow.fecha === row.fecha)
    );
    
    return {
      borderLeft: isSelected ? '4px solid #4B5563' : '4px solid transparent'
    };
  };

  // Crear columnas con numeración automática
  const columnsWithNumbers = showRowNumbers ? [
    {
      key: '__rowNumber__',
      title: '#',
      width: '50px',
      align: 'center',
      cellClassName: 'text-gray-500 font-mono',
      render: (value, row, index) => index + 1
    },
    ...columns
  ] : columns;

  const getCellValue = (row, column, rowIndex) => {
    // Manejar columna de numeración automática
    if (column.key === '__rowNumber__') {
      return column.render ? column.render(null, row, rowIndex) : rowIndex + 1;
    }
    
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row, rowIndex);
    }
    
    if (column.type === 'currency') {
      return value ? `$${parseFloat(value).toFixed(2)}` : '-';
    }
    
    if (column.type === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    return value || '-';
  };

  const getCellClassName = (column) => {
    let classes = cellClassName;
    
    if (column.align === 'center') {
      classes += ' text-center';
    } else if (column.align === 'right') {
      classes += ' text-right';
    }
    
    if (column.fontWeight === 'bold') {
      classes += ' font-medium';
    }
    
    if (column.fontFamily === 'mono') {
      classes += ' font-mono';
    }
    
    if (column.cellClassName) {
      classes += ` ${column.cellClassName}`;
    }
    
    return classes;
  };

  return (
    <div className={`bg-white border border-gray-200 h-full flex flex-col ${className}`}>
      <div className="border-b border-gray-200 px-3 py-2 flex-shrink-0">
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative">
          <div className="absolute inset-0 overflow-auto">
            <div className="min-w-max">
              <table className={`w-full text-xs ${tableClassName}`} style={{ minWidth: 'max-content' }}>
                <thead className={headerClassName}>
                  <tr>
                    {columnsWithNumbers.map((column, index) => (
                      <th
                        key={column.key || index}
                        className={`px-2 py-2 ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'} font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap ${
                          column.headerClassName || ''
                        }`}
                        style={{ 
                          width: column.width || 'auto',
                          minWidth: column.width || '80px'
                        }}
                      >
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((row, rowIndex) => (
                    <tr
                      key={`row-${row.codigo || row.cod || row.id || rowIndex}`}
                      onClick={() => onRowClick(row)}
                      className={getRowClassName(row)}
                      style={getRowStyle(row)}
                    >
                      {columnsWithNumbers.map((column, colIndex) => (
                        <td
                          key={`${rowIndex}-${column.key || colIndex}`}
                          className={`${getCellClassName(column)} whitespace-nowrap`}
                          style={{ 
                            width: column.width || 'auto',
                            minWidth: column.width || '80px'
                          }}
                          title={column.showTooltip ? getCellValue(row, column, rowIndex) : undefined}
                        >
                          <div className="truncate">
                            {getCellValue(row, column, rowIndex)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">{emptyMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableModel;