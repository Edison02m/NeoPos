import React from 'react';

const TotalesPanel = ({ totales, tipoVenta, creditoConfig }) => {
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

        {/* IVA total (puede incluir múltiples porcentajes) */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">IVA total:</span>
          <span className="text-lg font-semibold text-gray-800" title="Suma del IVA de cada producto según su porcentaje individual">
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

        {(tipoVenta === 'credito' || tipoVenta === 'plan') && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Abono inicial:</span>
              <span className="text-sm font-semibold text-gray-800">
                {formatMoney(Number(creditoConfig?.abonoInicial||0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Saldo:</span>
              <span className="text-sm font-semibold text-gray-800">
                {formatMoney(Math.max(total - Number(creditoConfig?.abonoInicial||0),0))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Plazo:</span>
              <span className="text-sm font-semibold text-gray-800">
                {Number(creditoConfig?.plazoDias||0)} días
              </span>
            </div>
          </>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• IVA calculado por producto (tasas variables)</div>
          <div>• Valores expresados en USD</div>
          {tipoVenta === 'plan' && <div>• Plan: productos reservados, no se entregan todavía</div>}
        </div>
      </div>
    </div>
  );
};

export default TotalesPanel;
