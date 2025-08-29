import React from 'react';
import TableModel from '../../components/TableModel';

const ClientesList = ({ clientes, loading, selectedCliente, onRowClick }) => {
  // Configuración de columnas para la tabla de clientes (igual que en el archivo original)
  const columns = [
    {
      key: 'tratamiento',
      title: 'Trat.',
      width: '16'
    },
    {
      key: 'apellidos',
      title: 'Apellidos',
      width: '32',
      fontWeight: 'bold'
    },
    {
      key: 'nombres',
      title: 'Nombres',
      width: '32',
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
      key: 'cedula',
      title: 'Cédula/RUC',
      width: '28',
      fontFamily: 'mono'
    },
    {
      key: 'tipo',
      title: 'Tipo',
      width: '16',
      align: 'center'
    },
    {
      key: 'limite',
      title: 'Límite',
      width: '20',
      type: 'currency',
      align: 'right'
    },
    {
      key: 'referencias',
      title: 'Referencias',
      width: '32',
      showTooltip: true
    },
    {
      key: 'email',
      title: 'E-mail',
      width: '40',
      showTooltip: true
    }
  ];

  return (
    <TableModel
      title="Lista de Clientes"
      columns={columns}
      data={clientes}
      loading={loading}
      selectedRow={selectedCliente}
      onRowClick={onRowClick}
      emptyMessage="No hay clientes registrados"
      showRowNumbers={true}
    />
  );
};

export default ClientesList;