import React from 'react';

const ComprobanteVenta = ({ ventaData, productos, totales, cliente, empresa, onClose, onImprimir }) => {
  const tipoComprobante = ventaData.tipo_comprobante === 'factura' ? 'FACTURA' : 'NOTA DE VENTA';
  const fechaActual = new Date();
  
  // Usar totales pasados como prop (ya calculados con IVA correcto)
  const { subtotal = 0, iva = 0, total = 0 } = totales || {};

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="w-full relative">

        {/* Contenido del comprobante */}
        <div className="p-6" id="comprobante-content">
          {/* Encabezado de la empresa */}
          <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {empresa?.empresa || empresa?.nombre || 'MI EMPRESA'}
            </h1>
            <p className="text-sm text-gray-600">
              RUC: {empresa?.ruc || '0000000000001'}
            </p>
            <p className="text-sm text-gray-600">
              {empresa?.direccion || 'Dirección no especificada'}
            </p>
            <p className="text-sm text-gray-600">
              Tel: {empresa?.telefono || 'N/A'} | Email: {empresa?.email || 'N/A'}
            </p>
          </div>

          {/* Tipo de comprobante y número */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 border-2 border-gray-400 inline-block px-6 py-2">
              {tipoComprobante}
            </h2>
            <p className="text-lg font-semibold mt-2">
              N° {ventaData.numero_comprobante || 'S/N'}
            </p>
          </div>

          {/* Información del cliente y fecha */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <h3 className="font-bold text-gray-800 mb-2">DATOS DEL CLIENTE:</h3>
              <p><strong>Nombre:</strong> {cliente?.nombres || 'CONSUMIDOR FINAL'} {cliente?.apellidos || ''}</p>
              <p><strong>RUC/CI:</strong> {cliente?.ruc || '9999999999999'}</p>
              <p><strong>Dirección:</strong> {cliente?.direccion || 'N/A'}</p>
              <p><strong>Teléfono:</strong> {cliente?.telefono || 'N/A'}</p>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-gray-800 mb-2">INFORMACIÓN:</h3>
              <p><strong>Fecha:</strong> {fechaActual.toLocaleDateString()}</p>
              <p><strong>Hora:</strong> {fechaActual.toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Tabla de productos */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-gray-400 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-400 px-2 py-1 text-left">#</th>
                  <th className="border border-gray-400 px-2 py-1 text-left">Descripción</th>
                  <th className="border border-gray-400 px-2 py-1 text-center">Cant.</th>
                  <th className="border border-gray-400 px-2 py-1 text-right">P. Unit.</th>
                  <th className="border border-gray-400 px-2 py-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((producto, index) => (
                  <tr key={index}>
                    <td className="border border-gray-400 px-2 py-1">{index + 1}</td>
                    <td className="border border-gray-400 px-2 py-1">{producto.descripcion}</td>
                    <td className="border border-gray-400 px-2 py-1 text-center">{producto.cantidad}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{formatMoney(producto.precio)}</td>
                    <td className="border border-gray-400 px-2 py-1 text-right">{formatMoney(producto.cantidad * producto.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="border border-gray-400">
                <div className="flex justify-between px-3 py-1 border-b border-gray-300">
                  <span className="font-medium">SUBTOTAL:</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between px-3 py-1 border-b border-gray-300">
                  <span className="font-medium">IVA 15%:</span>
                  <span>{formatMoney(iva)}</span>
                </div>
                <div className="flex justify-between px-3 py-2 bg-gray-100 font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de página */}
          <div className="mt-8 text-center text-xs text-gray-600 border-t pt-4">
            <p>¡Gracias por su compra!</p>
            <p className="mt-2">
              Este documento fue generado electrónicamente el {fechaActual.toLocaleString()}
            </p>
          </div>
    </div>
  </div>
  );
};

export default ComprobanteVenta;
