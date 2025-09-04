import React from 'react';

const TotalesPanel = ({ 
  compraData, 
  totales,
  onSubtotalChange,
  onDescuentoChange,
  onIvaToggle
}) => {
  // Valores por defecto si totales no está definido
  const {
    subtotal = 0,
    descuento = 0,
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
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Información del Proveedor */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Proveedor</h3>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-600">Nombre:</label>
            <div className="text-sm font-medium text-gray-800">
              {compraData?.proveedor?.nombre || 'Sin proveedor seleccionado'}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600">RUC:</label>
            <div className="text-sm text-gray-700">
              {compraData?.proveedor?.ruc || 'N/A'}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Teléfono:</label>
            <div className="text-sm text-gray-700">
              {compraData?.proveedor?.telefono || 'N/A'}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-proveedor-modal'))}
          className="mt-3 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Buscar Proveedor
        </button>
      </div>

      {/* Datos de la Factura */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Factura</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Número de Factura
            </label>
            <input
              type="text"
              value={compraData?.numfactura || ''}
              onChange={(e) => window.dispatchEvent(new CustomEvent('update-compra-field', {
                detail: { field: 'numfactura', value: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 001-001-000001234"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Autorización
            </label>
            <input
              type="text"
              value={compraData?.autorizacion || ''}
              onChange={(e) => window.dispatchEvent(new CustomEvent('update-compra-field', {
                detail: { field: 'autorizacion', value: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de autorización"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Fecha
            </label>
            <input
              type="date"
              value={compraData?.fecha || new Date().toISOString().split('T')[0]}
              onChange={(e) => window.dispatchEvent(new CustomEvent('update-compra-field', {
                detail: { field: 'fecha', value: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Totales</h3>
        
        <div className="space-y-3">
          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Subtotal:</span>
            <span className="text-lg font-semibold text-gray-800">
              {formatMoney(subtotal)}
            </span>
          </div>

          {/* Descuento */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Descuento:</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={descuento}
                onChange={(e) => onDescuentoChange && onDescuentoChange(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                step="0.01"
                min="0"
              />
              <span className="text-sm text-gray-600">$</span>
            </div>
          </div>

          {/* IVA */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="considerar-iva"
                checked={compraData?.considerar_iva !== false}
                onChange={(e) => onIvaToggle && onIvaToggle(e.target.checked)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="considerar-iva" className="text-sm font-medium text-gray-600">
                Considerar IVA
              </label>
            </div>
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

        {/* Forma de Pago */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Forma de Pago
          </label>
          <select
            value={compraData?.fpago || 'efectivo'}
            onChange={(e) => window.dispatchEvent(new CustomEvent('update-compra-field', {
              detail: { field: 'fpago', value: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="efectivo">Efectivo</option>
            <option value="cheque">Cheque</option>
            <option value="credito">Crédito</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>

        {/* Información adicional */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>• Presione F2 para buscar productos</div>
            <div>• Valores expresados en USD</div>
            <div>• IVA calculado al 15%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TotalesPanel;
