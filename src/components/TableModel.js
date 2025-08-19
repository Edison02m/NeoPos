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
  rowClassName = 'cursor-pointer hover:bg-blue-50 transition-colors',
  selectedRowClassName = 'bg-blue-100',
  cellClassName = 'px-2 py-2 text-gray-500 border-r border-gray-100 truncate'
}) => {
  const getRowClassName = (row) => {
    let classes = rowClassName;
    if (selectedRow && selectedRow.cod === row.cod) {
      classes += ` ${selectedRowClassName}`;
    }
    return classes;
  };

  const getCellValue = (row, column) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
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
            <table className={`w-full text-xs ${tableClassName}`}>
              <thead className={headerClassName}>
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={column.key || index}
                      className={`px-2 py-2 text-left font-medium text-gray-600 border-r border-gray-200 ${
                        column.width ? `w-${column.width}` : ''
                      } ${column.headerClassName || ''}`}
                      style={column.width ? { width: column.width } : {}}
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, rowIndex) => (
                  <tr
                    key={row.cod || row.id || rowIndex}
                    onClick={() => onRowClick(row)}
                    className={getRowClassName(row)}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={`${rowIndex}-${column.key || colIndex}`}
                        className={getCellClassName(column)}
                        title={column.showTooltip ? getCellValue(row, column) : undefined}
                      >
                        {getCellValue(row, column)}
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
      )}
    </div>
  );
};

export default TableModel;