import React from 'react';

const HistorialCompras = ({ compras = [], onCerrar, onVerDetalle }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto border border-gray-200 rounded bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 shadow">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">ID</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">Fecha</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">Factura</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">Proveedor</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Subtotal</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Subtotal 0%</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">IVA</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Total</th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-b">Acción</th>
            </tr>
          </thead>
          <tbody>
            {compras.length === 0 ? (
              <tr><td colSpan="9" className="text-center py-8 text-gray-500">Sin compras registradas</td></tr>
            ) : compras.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1 font-mono text-gray-700">{c.id}</td>
                <td className="px-2 py-1 text-gray-700">{c.fecha}</td>
                <td className="px-2 py-1 text-gray-700">{c.numfactura}</td>
                <td className="px-2 py-1 text-gray-700 truncate max-w-[140px]" title={c.proveedor_nombre || c.idprov}>{c.proveedor_nombre || c.idprov || '—'}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.subtotal||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.subtotal0||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.iva||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right font-semibold text-gray-900">{Number(c.total||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-center">
                  <button onClick={()=> onVerDetalle?.(c)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]">Detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[10px] text-gray-500">Mostrando {compras.length} registros</div>
    </div>
  );
};

export default HistorialCompras;
