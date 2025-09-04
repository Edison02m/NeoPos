import React from 'react';
import { Save, Search, Trash2, Printer, X, Plus, Undo2 } from 'lucide-react';

const ActionPanel = ({
  onNuevo,
  onDeshacer,
  onGuardar,
  onLimpiar,
  onBuscar,
  onImprimir,
  onSalir,
  loading = false
}) => {
  return (
    <div className="w-12 h-full bg-white border-r border-gray-200 py-2">
      <div className="space-y-1 px-1">
        {/* Nuevo */}
        <button
          onClick={onNuevo}
          title="Nueva Compra"
          className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          disabled={loading}
        >
          <Plus size={14} />
        </button>
        {/* Deshacer */}
        <button
          onClick={onDeshacer}
          title="Deshacer"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          disabled={loading}
        >
          <Undo2 size={14} />
        </button>
        {/* Guardar */}
        <button
          onClick={onGuardar}
          title={loading ? 'Guardando…' : 'Guardar Compra'}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          <Save size={14} />
        </button>
        
        {/* Buscar Producto F2 */}
        <button
          onClick={onBuscar}
          title="Buscar Producto (F2)"
          className="w-8 h-8 flex items-center justify-center text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          disabled={loading}
        >
          <Search size={14} />
        </button>
        
        {/* Limpiar */}
        <button
          onClick={onLimpiar}
          title="Limpiar compra"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          disabled={loading}
        >
          <Trash2 size={14} />
        </button>
        {/* Imprimir */}
        <button
          onClick={onImprimir}
          title="Imprimir comprobante"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          <Printer size={14} />
        </button>
        {/* Salir */}
        <button
          onClick={onSalir}
          title="Salir"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
