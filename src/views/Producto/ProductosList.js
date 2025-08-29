import React, { useEffect, useMemo, useState } from 'react';
import TableModel from '../../components/TableModel';

const ProductosList = ({ 
  productos, 
  selectedProducto, 
  onSelectProducto, 
  loading, 
  markedProducts 
}) => {
  // Paginación: 20 por página
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);

  // Resetear a la primera página cuando cambia el listado
  useEffect(() => {
    setPage(1);
  }, [productos]);

  const total = productos?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);

  const pageData = useMemo(() => {
    return productos.slice(startIndex, endIndex);
  }, [productos, startIndex, endIndex]);

  const isProductMarked = (codigo) => {
    return markedProducts.some(p => p.codigo === codigo);
  };

  // Configuración de columnas para la tabla de productos
  const columns = useMemo(() => ([
    // Numeración global considerando paginación
    {
      key: '__num',
      title: '#',
      width: '50px',
      align: 'center',
      render: (value, row, index) => startIndex + index + 1,
      cellClassName: 'text-gray-500 font-mono'
    },
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
  ]), [startIndex, markedProducts]);

  return (
    <div className="h-full flex flex-col">
      <TableModel
        title="Lista de Productos"
        columns={columns}
        data={pageData}
        loading={loading}
        selectedRow={selectedProducto}
        onRowClick={onSelectProducto}
        emptyMessage="No hay productos registrados"
        className="flex-1 bg-white border border-gray-200 rounded"
        tableClassName="text-xs"
        showRowNumbers={false}
      />

      {/* Paginación */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-700">
        <div>
          {total > 0 ? (
            <span>
              Mostrando {startIndex + 1}-{endIndex} de {total}
            </span>
          ) : (
            <span>Sin resultados</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setPage(1)}
            disabled={currentPage <= 1}
            title="Primera página"
          >
            «
          </button>
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            title="Anterior"
          >
            ‹
          </button>
          <span className="px-2">
            Página {currentPage} de {totalPages}
          </span>
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            title="Siguiente"
          >
            ›
          </button>
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
            onClick={() => setPage(totalPages)}
            disabled={currentPage >= totalPages}
            title="Última página"
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductosList;
