import React from 'react';
import TableModel from '../../components/TableModel';

const EmpresasList = ({ 
  empresas, 
  loading, 
  selectedEmpresa, 
  onRowClick 
}) => {
  // Configuración de columnas para la tabla de empresas (igual que en el archivo original)
  const empresasColumns = [
    {
      key: 'id',
      title: 'Número',
      width: '16',
      fontFamily: 'mono',
      cellClassName: 'text-gray-600'
    },
    {
      key: 'nombre',
      title: 'Nombre',
      width: '40',
      fontWeight: 'bold',
      showTooltip: true
    },
    {
      key: 'ruc',
      title: 'RUC',
      width: '28',
      fontFamily: 'mono'
    },
    {
      key: 'razon_social',
      title: 'Razón Social',
      width: '40',
      showTooltip: true
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
      key: 'email',
      title: 'E-mail',
      width: '40',
      showTooltip: true
    },
    {
      key: 'pagina_web',
      title: 'Página Web',
      width: '40',
      showTooltip: true
    },
    {
      key: 'representante',
      title: 'Representante',
      width: '32',
      showTooltip: true
    }
  ];

  return (
    <TableModel
      title="Lista de Empresas"
      columns={empresasColumns}
      data={empresas}
      loading={loading}
      selectedRow={selectedEmpresa}
      onRowClick={onRowClick}
      emptyMessage="No hay empresas registradas"
    />
  );
};

export default EmpresasList;