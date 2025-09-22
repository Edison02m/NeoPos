import React from 'react';

// Vista de compras por proveedor (un solo botón Volver se mantiene en el contenedor padre)
const ComprasPorProveedor = ({ proveedor, compras = [], onSeleccionarProveedor, onVerDetalle, onActualizar, cargando }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 flex-1">Compras por Proveedor</h2>
        <div className="flex gap-2">
          <button onClick={onSeleccionarProveedor} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded">{proveedor? 'Cambiar':'Seleccionar'} proveedor</button>
          <button onClick={onActualizar} disabled={cargando || !proveedor} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-800 text-white rounded disabled:opacity-40">{cargando? '...' : 'Actualizar'}</button>
        </div>
      </div>
      <div className="mb-2 text-xs text-gray-600 min-h-[20px]">
        {proveedor ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
            <span><span className="font-medium">Proveedor:</span> {proveedor.empresa || proveedor.nombre}</span>
            {proveedor.ruc && <span><span className="font-medium">RUC:</span> {proveedor.ruc}</span>}
            {proveedor.telefono && <span><span className="font-medium">Tel:</span> {proveedor.telefono}</span>}
          </div>
        ) : <span className="italic text-gray-500">Seleccione un proveedor para mostrar sus compras.</span>}
      </div>
      <div className="flex-1 overflow-auto border border-gray-200 rounded bg-white mb-4">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 shadow">
            <tr>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">ID</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">Fecha</th>
              <th className="px-2 py-2 text-left font-medium text-gray-600 border-b">Factura</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Subtotal</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Subtotal 0%</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">IVA</th>
              <th className="px-2 py-2 text-right font-medium text-gray-600 border-b">Total</th>
              <th className="px-2 py-2 text-center font-medium text-gray-600 border-b">Acción</th>
            </tr>
          </thead>
          <tbody>
            {!proveedor ? (
              <tr><td colSpan="8" className="text-center py-10 text-gray-500">Seleccione un proveedor</td></tr>
            ) : compras.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-10 text-gray-500">Sin compras para este proveedor</td></tr>
            ) : compras.map(c => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="px-2 py-1 font-mono text-gray-700">{c.id}</td>
                <td className="px-2 py-1 text-gray-700">{c.fecha}</td>
                <td className="px-2 py-1 text-gray-700">{c.numfactura}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.subtotal||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.subtotal0||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right text-gray-700">{Number(c.iva||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-right font-semibold text-gray-900">{Number(c.total||0).toFixed(2)}</td>
                <td className="px-2 py-1 text-center"><button onClick={()=> onVerDetalle?.(c)} className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px]">Detalle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[10px] text-gray-500">Compras listadas: {compras.length}</div>
    </div>
  );
};

export default ComprasPorProveedor;