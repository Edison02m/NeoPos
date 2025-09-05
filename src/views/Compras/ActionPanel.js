import React from 'react';
import { Plus, Save, Undo2, Redo2, Trash2, X, Edit } from 'lucide-react';

const ActionPanel = ({
	onNuevo,
	onEditar,
	onRehacer,
	onEliminar,
	onGuardar,
	onCerrar,
	loading = false,
	disabled = false
}) => {
	const btnBase = 'w-8 h-8 flex items-center justify-center rounded text-white text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-black/40';
	return (
		<div className="w-12 h-full bg-white border-r border-gray-300 py-2 select-none">
			<div className="space-y-1 px-1">
				<button title="Nuevo" onClick={onNuevo} disabled={loading} className={`${btnBase} bg-gray-900 hover:bg-gray-800`}><Plus size={14} /></button>
				<button title="Editar" onClick={onEditar} disabled={loading || disabled} className={`${btnBase} bg-gray-700 hover:bg-gray-600`}><Edit size={14} /></button>
				<button title="Rehacer" onClick={onRehacer} disabled={loading || disabled} className={`${btnBase} bg-gray-500 hover:bg-gray-500`}><Redo2 size={14} /></button>
				<button title="Eliminar" onClick={onEliminar} disabled={loading || disabled} className={`${btnBase} bg-red-600 hover:bg-red-700`}><Trash2 size={14} /></button>
				<button title="Guardar" onClick={onGuardar} disabled={loading || disabled} className={`${btnBase} bg-green-600 hover:bg-green-700`}><Save size={14} /></button>
				<div className="h-2" />
				<button title="Cerrar ventana" onClick={onCerrar} className={`${btnBase} bg-gray-300 text-gray-800 hover:bg-gray-400`}><X size={14} /></button>
			</div>
		</div>
	);
};

export default ActionPanel;
