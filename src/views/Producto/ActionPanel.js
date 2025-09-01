import React from 'react';
import { Plus, Edit, Trash2, Search, Star, Eye, X } from 'lucide-react';

const ActionPanel = ({
  selectedItem,
  onNewClick,
  onEditClick,
  onDeleteClick,
  onSearchClick,
  onMarcarClick,
  onMarcadosClick,
  onExitClick,
  markedCount,
  showingMarked,
  loading
}) => {
  const hasSelection = selectedItem !== null;

  return (
    <div className="w-12 h-full bg-white border-r border-gray-200 py-2">
      <div className="space-y-1 px-1">
        <button
          onClick={onNewClick}
          title="Nuevo"
          className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          disabled={loading}
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onEditClick}
          disabled={!hasSelection || loading}
          title="Editar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={onDeleteClick}
          disabled={!hasSelection || loading}
          title="Eliminar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={onSearchClick}
          title="Buscar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          <Search size={14} />
        </button>
        <button
          onClick={onMarcarClick}
          disabled={!hasSelection || loading}
          title="Marcar producto"
          className="w-8 h-8 flex items-center justify-center text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          <Star size={14} />
        </button>
        <button
          onClick={onMarcadosClick}
          title={showingMarked ? "Ver todos" : `Marcados (${markedCount})`}
          className={`w-8 h-8 flex items-center justify-center text-xs rounded transition-colors ${
            showingMarked 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-orange-200 text-orange-800 hover:bg-orange-300'
          }`}
          disabled={loading}
        >
          {showingMarked ? <Eye size={12} /> : markedCount}
        </button>
        <button
          onClick={onExitClick}
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
