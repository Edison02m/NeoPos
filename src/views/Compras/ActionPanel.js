import React from 'react';
import { Plus, Save, Undo2, Redo2, Trash2, X, Edit, ScanBarcode, RotateCcw } from 'lucide-react';

const ActionPanel = ({
	onNuevo,
	onEditar,
	onRehacer, // ahora usado como Deshacer
	onEliminar,
	onGuardar,
	onAbrirImei,
	onDevolucion,
	onCerrar,
	undoAvailable = false,
	loading = false,
	disabled = false,
	canGuardar = true
}) => {
	const base = 'w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500/40';
	return (
		<div className="w-12 h-full bg-white border-r border-gray-200 py-2 select-none">
			<div className="space-y-1 px-1">
				{/* Nuevo */}
				<button title="Nuevo" onClick={onNuevo} disabled={loading} className={`${base} bg-gray-900 text-white hover:bg-gray-800`}><Plus size={14} /></button>
				{/* Editar */}
				<button title="Editar" onClick={onEditar} disabled={loading || disabled} className={`${base} bg-gray-600 text-white hover:bg-gray-700`}><Edit size={14} /></button>
				{/* Deshacer (Ctrl+Z) */}
				<button
					title={undoAvailable? 'Deshacer (Ctrl+Z)':'Nada que deshacer'}
					onClick={onRehacer}
					disabled={loading || disabled || !undoAvailable}
					className={`${base} ${undoAvailable? 'bg-gray-600 text-white hover:bg-gray-700':'bg-gray-300 text-gray-500'} `}
				>
					<Undo2 size={14} />
				</button>
				{/* Guardar */}
				<button title="Guardar" onClick={onGuardar} disabled={loading || disabled || !canGuardar} className={`${base} bg-gray-900 text-white hover:bg-gray-800`}><Save size={14} /></button>
				{/* IMEI */}
				<button title="Registrar IMEIs" onClick={onAbrirImei} disabled={loading || disabled} className={`${base} bg-indigo-600 text-white hover:bg-indigo-700`}><ScanBarcode size={14} /></button>
				{/* Devolución */}
				<button title="Devolución" onClick={onDevolucion} disabled={loading || disabled} className={`${base} bg-amber-600 text-white hover:bg-amber-700`}><RotateCcw size={14} /></button>
				{/* Eliminar */}
				<button title="Eliminar" onClick={onEliminar} disabled={loading || disabled} className={`${base} bg-red-600 text-white hover:bg-red-700`}><Trash2 size={14} /></button>
				<div className="h-2" />
				{/* Cerrar */}
				<button title="Cerrar ventana" onClick={onCerrar} className={`${base} bg-gray-200 text-gray-700 hover:bg-gray-300`}><X size={14} /></button>
			</div>
		</div>
	);
};

export default ActionPanel;
