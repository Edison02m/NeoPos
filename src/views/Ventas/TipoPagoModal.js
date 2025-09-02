import React, { useState, useEffect } from 'react';

const TipoPagoModal = ({ isOpen, onClose, tipoVenta, setTipoVenta, formaPago, setFormaPago, creditoConfig, setCreditoConfig, total }) => {
  const [localTipo, setLocalTipo] = useState(tipoVenta || 'contado');
  const [localForma, setLocalForma] = useState(formaPago || { tipo: 'efectivo', tarjeta: null });
  const [plazo, setPlazo] = useState(creditoConfig?.plazoDias ?? 30);
  const [abono, setAbono] = useState(creditoConfig?.abonoInicial ?? 0);

  useEffect(() => {
    if (isOpen) {
      setLocalTipo(tipoVenta || 'contado');
      setLocalForma(formaPago || { tipo: 'efectivo', tarjeta: null });
      setPlazo(creditoConfig?.plazoDias ?? 30);
      setAbono(creditoConfig?.abonoInicial ?? 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saldo = Math.max((Number(total) || 0) - (Number(abono) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] rounded shadow border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Tipo de venta y forma de pago</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Tipo de venta</div>
            <div className="flex gap-3 text-sm">
              {['contado','credito','plan'].map(t => (
                <label key={t} className="flex items-center gap-1">
                  <input type="radio" name="tipoVenta" value={t} checked={localTipo===t} onChange={() => setLocalTipo(t)} /> {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Forma de pago</div>
            <div className="flex flex-wrap gap-3 text-sm items-center">
              <label className="flex items-center gap-1">
                <input type="radio" name="formaPago" checked={localForma.tipo==='efectivo'} onChange={() => setLocalForma({ tipo: 'efectivo', tarjeta: null })} /> Efectivo
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="formaPago" checked={localForma.tipo==='cheque'} onChange={() => setLocalForma({ tipo: 'cheque', tarjeta: null })} /> Cheque
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="formaPago" checked={localForma.tipo==='tarjeta'} onChange={() => setLocalForma({ tipo: 'tarjeta', tarjeta: 'Visa' })} /> Tarjeta
              </label>
              {localForma.tipo==='tarjeta' && (
                <select className="border rounded px-2 py-1 text-sm" value={localForma.tarjeta||'Visa'} onChange={(e)=>setLocalForma({ tipo:'tarjeta', tarjeta:e.target.value })}>
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>Diners Club</option>
                  <option>Cuota Fácil</option>
                  <option>American Express</option>
                </select>
              )}
            </div>
          </div>

          {(localTipo==='credito' || localTipo==='plan') && (
            <div className="bg-gray-50 p-3 rounded border">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col">
                  <span className="text-xs text-gray-600">Plazo (días)</span>
                  <input type="number" min={0} value={plazo} onChange={(e)=>setPlazo(parseInt(e.target.value||'0',10))} className="border rounded px-2 py-1" />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-gray-600">Abono inicial</span>
                  <input type="number" min={0} step="0.01" value={abono} onChange={(e)=>setAbono(parseFloat(e.target.value||'0'))} className="border rounded px-2 py-1" />
                </label>
              </div>
              <div className="text-xs text-gray-700 mt-2">Saldo estimado: <span className="font-semibold">${saldo.toFixed(2)}</span></div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
            <button
              onClick={()=>{
                setTipoVenta(localTipo);
                setFormaPago(localForma);
                if (localTipo==='credito' || localTipo==='plan') {
                  setCreditoConfig({ plazoDias: Number(plazo)||0, abonoInicial: Math.min(Number(abono)||0, Number(total)||0) });
                } else {
                  setCreditoConfig({ plazoDias: 0, abonoInicial: 0 });
                }
                onClose();
              }}
              className="px-3 py-1 bg-gray-800 text-white rounded text-sm"
            >Aceptar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipoPagoModal;
