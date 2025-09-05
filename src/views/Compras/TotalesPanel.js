import React from 'react';

const TotalesPanel = ({ compraData, setCompraData, totales }) => {
	const fmt = n => Number(n || 0).toFixed(2);
	return (
		<div className="w-full h-full flex flex-col text-black select-none">
			<div className="flex-1" />
			<div className="space-y-2 mb-4">
				<div className="flex justify-between items-center">
					<span className="text-sm font-medium">Subtotal</span>
					<input value={fmt(totales.subtotal)} readOnly className="w-24 p-1 border border-gray-400 bg-white text-right text-sm" />
				</div>
				<div className="flex justify-between items-center">
					<label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
						<input type="checkbox" checked={compraData.considerar_iva} onChange={e=> setCompraData(c=>({...c, considerar_iva:e.target.checked}))} />
						Considerar IVA
					</label>
					<span className="text-xs text-gray-600 pr-1">15%</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-sm font-medium">IVA</span>
					<input value={fmt(totales.iva)} readOnly className="w-24 p-1 border border-gray-400 bg-white text-right text-sm" />
				</div>
				<div className="h-px bg-gray-400" />
				<div className="flex justify-between items-center">
					<span className="text-sm font-bold">Total</span>
					<input value={fmt(totales.total)} readOnly className="w-24 p-1 border border-gray-500 bg-white text-right text-sm font-bold" />
				</div>
			</div>
			<div className="text-[11px] text-gray-700 italic">Modificando una nueva compra</div>
		</div>
	);
};

export default TotalesPanel;
