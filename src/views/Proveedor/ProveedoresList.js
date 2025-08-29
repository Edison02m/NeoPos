import React from 'react';
import TableModel from '../../components/TableModel';

const ProveedoresList = ({ proveedores, loading, selectedProveedor, onRowClick }) => {
  // Configuración de columnas para la tabla de proveedores
  const columns = [
    {
      key: 'empresa',
      title: 'Empresa',
      width: '40',
      fontWeight: 'bold'
    },
    {
      key: 'direccion',
      title: 'Dirección',
      width: '40',
      showTooltip: true
    },
    {
      key: 'telefono',
      title: 'Teléfono',
      width: '24'
    },
    {
      key: 'fax',
      title: 'Fax',
      width: '24'
    },
    {
      key: 'ciudad',
      title: 'Ciudad',
      width: '24'
    },
    {
      key: 'representante',
      title: 'Representante',
      width: '32'
    },
    {
      key: 'mail',
      title: 'E-mail',
      width: '40',
      showTooltip: true
    },
    {
      key: 'ruc',
      title: 'RUC',
      width: '28',
      fontFamily: 'mono'
    },
    {
      key: 'tipoid',
      title: 'Tipo ID',
      width: '16'
    },
    {
      key: 'relacionado',
      title: 'Relacionado',
      width: '16'
    },
    {
      key: 'trial279',
      title: 'Trial279',
      width: '16'
    }
  ];

  return (
    <TableModel
      title="Lista de Proveedores"
      columns={columns}
      data={proveedores}
      loading={loading}
      selectedRow={selectedProveedor}
      onRowClick={onRowClick}
      emptyMessage="No hay proveedores registrados"
      showRowNumbers={true}
    />
  );
};

export default ProveedoresList;