import React from 'react';
import TableModel from '../../components/TableModel';

const ProductosList = ({ 
  productos, 
  selectedProducto, 
  onSelectProducto, 
  loading, 
  markedProducts 
}) => {
  const isProductMarked = (codigo) => {
    return markedProducts.some(p => p.codigo === codigo);
  };

  // Configuración de columnas para la tabla de productos
  const columns = [
    {
      key: 'codbarra',
      title: 'Cód. Barras',
      width: '120px',
      fontFamily: 'mono',
      render: (value) => value || '-'
    },
    {
      key: 'codaux',
      title: 'Cód. Auxiliar',
      width: '100px',
      fontFamily: 'mono',
      render: (value) => value || '-'
    },
    {
      key: 'producto',
      title: 'Descripción',
      width: '250px',
      fontWeight: 'bold',
      showTooltip: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {isProductMarked(row.codigo) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 mt-1">
              ★ Marcado
            </span>
          )}
        </div>
      )
    },
     {
      key: 'almacen',
      title: 'Almacén',
      width: '70px',
      align: 'center',
      render: (value) => parseInt(value) || 0
    },
    {
      key: 'bodega1',
      title: 'Bodega 1',
      width: '70px',
      align: 'center',
      render: (value) => parseInt(value) || 0
    },
    {
      key: 'bodega2',
      title: 'Bodega 2',
      width: '70px',
      align: 'center',
      render: (value) => parseInt(value) || 0
    },
    {
      key: 'maximo',
      title: 'Stock Máx',
      width: '80px',
      align: 'center',
      render: (value) => parseInt(value) || 0
    },
    {
      key: 'minimo',
      title: 'Stock Mín',
      width: '80px',
      align: 'center',
      render: (value) => parseInt(value) || 0
    },
    {
      key: 'peso',
      title: 'Peso',
      width: '70px',
      align: 'right',
      render: (value) => value ? parseFloat(value).toFixed(2) : '0.00'
    },
    {
      key: 'pcompra',
      title: 'P. Compra',
      width: '90px',
      align: 'right',
      type: 'currency'
    },
    {
      key: 'pvp',
      title: 'P.V.P.',
      width: '90px',
      align: 'right',
      type: 'currency'
    },
    {
      key: 'pmayorista',
      title: 'P. Mayorista',
      width: '100px',
      align: 'right',
      type: 'currency'
    },
    {
      key: 'pconsignacion',
      title: 'P. Consign.',
      width: '100px',
      align: 'right',
      type: 'currency'
    },
    {
      key: 'procedencia',
      title: 'Procedencia',
      width: '120px',
      render: (value) => value || '-'
    },
    {
      key: 'grabaiva',
      title: 'IVA',
      width: '50px',
      align: 'center',
      render: (value) => value === '1' ? '✓' : '✗',
      cellClassName: 'text-center'
    },
    {
      key: 'isservicio',
      title: 'Servicio',
      width: '70px',
      align: 'center',
      render: (value) => value === '1' ? 'Sí' : 'No'
    },
    {
      key: 'deducible',
      title: 'Deducible',
      width: '80px',
      align: 'right',
      type: 'currency'
    },
    {
      key: 'descripcion',
      title: 'Descripción Ext.',
      width: '150px',
      render: (value) => value || '-',
      showTooltip: true
    }
  ];

  return (
    <TableModel
      title="Lista de Productos"
      columns={columns}
      data={productos}
      loading={loading}
      selectedRow={selectedProducto}
      onRowClick={onSelectProducto}
      emptyMessage="No hay productos registrados"
      className="h-full bg-white border border-gray-200 rounded"
      tableClassName="text-xs"
      showRowNumbers={true}
    />
  );
};

export default ProductosList;
