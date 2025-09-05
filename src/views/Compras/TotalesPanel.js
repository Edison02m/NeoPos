import React from 'react';

const TotalesPanel = ({ compraData, setCompraData, totales }) => {
	const { subtotal = 0, iva = 0, total = 0 } = totales || {};

	const formatMoney = (amount) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

	return (
			<div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col h-full">
				<h3 className="text-lg font-semibold mb-4 text-gray-800">Total</h3>
			<div className="space-y-3 flex-1">
				<div className="flex justify-between items-center">
					<span className="text-sm font-medium text-gray-600">Subtotal:</span>
					<span className="text-lg font-semibold text-gray-800">{formatMoney(subtotal)}</span>
				</div>
				<div className="flex justify-between items-center">
					<label className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer select-none">
						<input type="checkbox" className="rounded border-gray-300" checked={compraData.considerar_iva} onChange={e => setCompraData(c => ({ ...c, considerar_iva: e.target.checked }))} />
						IVA (15%)
					</label>
					<span className="text-lg font-semibold text-gray-800">{formatMoney(iva)}</span>
				</div>
				<hr className="border-gray-200" />
				<div className="flex justify-between items-center pt-1">
					<span className="text-base font-bold text-gray-800">TOTAL:</span>
					<span className="text-xl font-bold text-blue-600">{formatMoney(total)}</span>
				</div>
			</div>
			<div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
				<div>• Precios sin redondeo final</div>
				<div>• Valores en USD</div>
			</div>
		</div>
	);
};

export default TotalesPanel;
