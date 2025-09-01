import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { ExcelIcon, PdfIcon } from '../../components/Icons';

const ActionPanel = ({ 
  onBuscar, 
  onSalir,
  onRefresh,
  onExportExcel, 
  onExportPDF 
}) => {
  return (
    <div className="w-12 h-full bg-white border-r border-gray-200 py-2">
      <div className="space-y-1 px-1">
        {/* Botón de búsqueda */}
        <button
          onClick={onBuscar}
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          title="Buscar productos"
        >
          <Search size={14} />
        </button>

        {/* Botón de salir - ahora junto con los demás */}
        <button
          onClick={onSalir}
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          title="Salir"
        >
          <X size={14} />
        </button>

        {/* Separador */}
        <div className="border-t border-gray-200 my-1"></div>

        {/* Botones de reportes/exportación */}
        <button
          onClick={onRefresh}
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          title="Actualizar inventario"
        >
          <RotateCcw size={14} />
        </button>
        
        <button
          onClick={onExportExcel}
          className="w-8 h-8 flex items-center justify-center text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          title="Exportar a Excel"
        >
          <ExcelIcon size={14} />
        </button>
        
        <button
          onClick={onExportPDF}
          className="w-8 h-8 flex items-center justify-center text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          title="Generar reporte PDF"
        >
          <PdfIcon size={14} />
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
