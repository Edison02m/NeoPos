import React from 'react';

const TotalesPanel = ({ totales }) => {
  // Valores por defecto si totales no está definido
  const {
    subtotal = 0,
    iva = 0,
    total = 0
  } = totales || {};

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Total</h3>
      
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Subtotal:</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatMoney(subtotal)}
          </span>
        </div>

        {/* IVA */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">IVA (15%):</span>
          <span className="text-lg font-semibold text-gray-800">
            {formatMoney(iva)}
          </span>
        </div>

        {/* Línea separadora */}
        <hr className="border-gray-200" />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-base font-bold text-gray-800">TOTAL:</span>
          <span className="text-xl font-bold text-blue-600">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      {/* Información adicional */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Precios incluyen IVA</div>
          <div>• Valores expresados en USD</div>
        </div>
      </div>
    </div>
  );
};

export default TotalesPanel;
