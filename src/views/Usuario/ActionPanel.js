import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActionPanel = ({ 
  selectedUser, 
  onNew, 
  onEdit, 
  onDelete 
}) => {
  const navigate = useNavigate();

  const handleExit = () => {
    navigate('/dashboard');
  };

  return (
    <div className="w-12 bg-white border-r border-gray-200 py-2">
      <div className="space-y-1 px-1">
        <button
          onClick={onNew}
          title="Nuevo Usuario"
          className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          +
        </button>
        
        <button
          onClick={onEdit}
          disabled={!selectedUser}
          title="Editar Usuario"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          ✎
        </button>
        
        <button
          onClick={onDelete}
          disabled={!selectedUser}
          title="Eliminar Usuario"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
        >
          🗑
        </button>
        
        <div className="h-px bg-gray-200 mx-1 my-2"></div>
        
        <button
          onClick={handleExit}
          title="Volver al Dashboard"
          className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ActionPanel;
