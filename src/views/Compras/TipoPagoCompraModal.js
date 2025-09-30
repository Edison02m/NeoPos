import React, { useEffect, useState, useRef } from 'react';

const TipoPagoCompraModal = ({ isOpen, onClose, forma = 'CONTADO', plazodias = 0, anticipada = false, pagado = true, onSave }) => {
  const [localForma, setLocalForma] = useState(forma || 'CONTADO');
  const [localPlazo, setLocalPlazo] = useState(String(plazodias || 0));
  const [localAnticipada, setLocalAnticipada] = useState(!!anticipada);
  const [localPagado, setLocalPagado] = useState(!!pagado);
  const okRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLocalForma(forma || 'CONTADO');
      setLocalPlazo(String(plazodias || 0));
      setLocalAnticipada(!!anticipada);
      setLocalPagado(!!pagado);
      setTimeout(() => { try { okRef.current?.focus(); } catch(_){} }, 10);
    }
  }, [isOpen, forma, plazodias, anticipada, pagado]);

  if (!isOpen) return null;

  const handleAccept = () => {
    const plazoNum = Math.max(parseInt(localPlazo || '0', 10) || 0, 0);
    onSave?.(localForma, plazoNum, localAnticipada, localPagado);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white w-[420px] rounded shadow border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Forma de pago (Compras)</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Forma</div>
            <div className="flex flex-wrap gap-3 text-sm items-center">
              {['CONTADO','TRANSFERENCIA','CREDITO','OTRO'].map(f => (
                <label key={f} className="flex items-center gap-1">
                  <input type="radio" name="formaCompra" value={f} checked={localForma===f} onChange={()=> setLocalForma(f)} /> {f}
                </label>
              ))}
            </div>
          </div>

          {localForma==='CREDITO' && (
            <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded border">
              <label className="flex flex-col">
                <span className="text-xs text-gray-600">Plazo (días)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={localPlazo}
                  onChange={(e)=>{
                    const v = e.target.value.replace(/[^0-9]/g,'');
                    setLocalPlazo(v);
                  }}
                  className="border rounded px-2 py-1"
                />
              </label>
              <div className="text-xs text-gray-500 flex items-end">El plazo se guarda en la cabecera (plazodias).</div>
            </div>
          )}

          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={localAnticipada} onChange={(e)=> setLocalAnticipada(e.target.checked)} />
              Compra anticipada
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={localPagado} onChange={(e)=> setLocalPagado(e.target.checked)} disabled={localForma==='CREDITO'} />
              Marcar como pagada
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
          <button ref={okRef} onClick={handleAccept} className="px-3 py-1 text-white rounded text-sm bg-gray-800">Aceptar</button>
        </div>
      </div>
    </div>
  );
};

export default TipoPagoCompraModal;
