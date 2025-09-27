import React from 'react';

const ActionPanel = ({
  selectedItem,
  onNewClick,
  onEditClick,
  onDeleteClick,
  onSearchClick,
  onSaveClick,
  onExitClick,
  loading,
  canSave
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
          +
        </button>
        <button
          onClick={onEditClick}
          disabled={!hasSelection || loading}
          title="Editar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          ✎
        </button>
        <button
          onClick={onDeleteClick}
          disabled={!hasSelection || loading}
          title="Eliminar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          🗑
        </button>
        <button
          onClick={onSearchClick}
          title="Buscar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          🔍
        </button>
        <button
          onClick={onSaveClick}
          disabled={!canSave || loading}
          title="Guardar"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-900 text-white rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          💾
        </button>
        <button
          onClick={onExitClick}
          title="Salir"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={loading}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
