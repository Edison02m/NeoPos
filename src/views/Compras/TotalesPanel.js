import React from 'react';

const TotalesPanel = ({ compraData, setCompraData, totales, onConfigurarPago }) => {
	const { subtotal = 0, subtotal0 = 0, descuento = 0, iva = 0, total = 0 } = totales || {};

	const formatMoney = (amount) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

	return (
			<div className="bg-white p-4 rounded-lg shadow border border-gray-200 flex flex-col h-full">
				<h3 className="text-lg font-semibold mb-4 text-gray-800">Total</h3>
			<div className="space-y-2 flex-1">
				<div className="flex justify-between items-center text-sm"><span className="text-gray-600">Subtotal:</span><span className="font-semibold text-gray-800">{formatMoney(subtotal)}</span></div>
				<div className="flex justify-between items-center text-xs"><span className="text-gray-500">Subtotal 0%:</span><span className="font-medium text-gray-700">{formatMoney(subtotal0)}</span></div>
				<div className="flex justify-between items-center text-xs"><span className="text-gray-500">Descuento:</span><span className="font-medium text-red-600">{formatMoney(descuento)}</span></div>
				<div className="flex justify-between items-center">
					<label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
						<input type="checkbox" className="rounded border-gray-300" checked={compraData.considerar_iva} onChange={e => setCompraData(c => ({ ...c, considerar_iva: e.target.checked }))} />
						IVA (15%)
					</label>
					<span className="text-sm font-semibold text-gray-800">{formatMoney(iva)}</span>
				</div>
				<hr className="border-gray-200" />
				<div className="space-y-2">
					<div className="flex flex-col gap-1">
						<label className="text-xs font-medium text-gray-600">Forma de pago</label>
						<div className="flex items-center gap-2">
							<select value={compraData.fpago} onChange={e=> setCompraData(c=>({...c, fpago:e.target.value}))} className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40">
								<option value="CONTADO">CONTADO</option>
								<option value="CREDITO">CREDITO</option>
								<option value="TRANSFERENCIA">TRANSFERENCIA</option>
								<option value="OTRO">OTRO</option>
							</select>
							{onConfigurarPago && (
								<button type="button" onClick={onConfigurarPago} className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800">Configurar…</button>
							)}
						</div>
					</div>
					{compraData.fpago==='CREDITO' && (
						<div className="flex flex-col gap-1">
							<label className="text-xs font-medium text-gray-600">Plazo (días)</label>
							<input type="number" min="0" value={compraData.plazodias||0} onChange={e=> setCompraData(c=>({...c, plazodias: parseInt(e.target.value)||0}))} className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
						</div>
					)}
				</div>
				<div className="flex justify-between items-center pt-2">
					<span className="text-base font-bold text-gray-800">TOTAL:</span>
					<span className="text-xl font-bold text-blue-600">{formatMoney(total)}</span>
				</div>
			</div>
			<div className="mt-4 pt-3 border-t border-gray-200 text-[10px] text-gray-500 space-y-1">
				<div>• Descuento aplicado por línea antes de IVA.</div>
				<div>• Forma de pago y plazo se guardarán en la cabecera.</div>
			</div>
		</div>
	);
};

export default TotalesPanel;
