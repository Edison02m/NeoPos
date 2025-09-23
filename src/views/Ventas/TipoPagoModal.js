import React, { useState, useEffect, useRef } from 'react';

const TipoPagoModal = ({ isOpen, onClose, tipoVenta, setTipoVenta, formaPago, setFormaPago, creditoConfig, setCreditoConfig, total }) => {
  const [localTipo, setLocalTipo] = useState(tipoVenta || 'contado');
  const [localForma, setLocalForma] = useState(formaPago || { tipo: 'efectivo', tarjeta: null });
  // Keep as strings while typing to avoid leading zero/decimal glitches
  const [plazo, setPlazo] = useState(String(creditoConfig?.plazoDias ?? '30'));
  const [abono, setAbono] = useState(String(creditoConfig?.abonoInicial ?? '0'));
  const [interes, setInteres] = useState(String(creditoConfig?.interesPorc ?? '0'));
  const [cuotas, setCuotas] = useState(String(creditoConfig?.numCuotas ?? '1'));

  const userEditedCuotas = useRef(false);
  const userEditedInteres = useRef(false);
  const userEditedAbono = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setLocalTipo(tipoVenta || 'contado');
      setLocalForma(formaPago || { tipo: 'efectivo', tarjeta: null });
      setPlazo(String(creditoConfig?.plazoDias ?? '30'));
      setAbono(String(creditoConfig?.abonoInicial ?? '0'));
      setInteres(String(creditoConfig?.interesPorc ?? '0'));
      // Sugerir cuotas según total si el usuario aún no definió manualmente (o está vacío)
      let sugeridas = creditoConfig?.numCuotas || 1;
      const totalNum = Number(total)||0;
      if(!userEditedCuotas.current){
        if(totalNum >= 1000) sugeridas = 6;
        else if(totalNum >= 600) sugeridas = 5;
        else if(totalNum >= 400) sugeridas = 4;
        else if(totalNum >= 250) sugeridas = 3;
        else if(totalNum >= 150) sugeridas = 2;
        else sugeridas = 1;
      }
      setCuotas(String(sugeridas));
    }
  }, [isOpen, total, tipoVenta, formaPago, creditoConfig]);

  if (!isOpen) return null;

  const saldoBase = Math.max((Number(total) || 0) - (parseFloat(abono || '0') || 0), 0);
  const interesNum = Math.max(parseFloat(interes.replace(',', '.')) || 0, 0);
  const cuotasNum = Math.max(parseInt(cuotas||'0',10)||0, 0) || 1;
  // Interés simple aplicado sobre saldo base (puede ajustarse a interés compuesto si se requiere)
  const interesValor = saldoBase * (interesNum/100);
  const saldoConInteres = saldoBase + interesValor;
  const valorCuota = saldoConInteres / cuotasNum;

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
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={plazo}
                    onChange={(e)=>{
                      const v = e.target.value.replace(/[^0-9]/g,'');
                      setPlazo(v);
                    }}
                    className="border rounded px-2 py-1" />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-gray-600">Abono inicial</span>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" value={abono}
                    onChange={(e)=>{
                      let v = e.target.value.replace(/[^0-9.,]/g, '');
                      // normalize decimal separator to dot but keep as string
                      const parts = v.split(/[.,]/);
                      if (parts.length > 2) {
                        v = parts[0] + '.' + parts.slice(1).join('');
                      } else if (parts.length === 2) {
                        v = parts[0] + '.' + parts[1];
                      }
                      // avoid leading zeros like 010 -> 10 while keeping '0.'
                      if (/^0+[0-9]+/.test(v)) {
                        v = String(parseInt(v, 10));
                      }
                      setAbono(v);
                      userEditedAbono.current = true;
                    }}
                    className="border rounded px-2 py-1" />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-gray-600">Interés (%)</span>
                  <input type="text" inputMode="decimal" pattern="[0-9]*[.,]?[0-9]*" value={interes}
                    onChange={(e)=>{
                      let v = e.target.value.replace(/[^0-9.,]/g,'');
                      const parts = v.split(/[.,]/);
                      if(parts.length>2) v = parts[0]+'.'+parts.slice(1).join('');
                      else if(parts.length===2) v = parts[0]+'.'+parts[1];
                      if(/^0+[0-9]+/.test(v)) v = String(parseInt(v,10));
                      setInteres(v);
                      userEditedInteres.current = true;
                    }}
                    className="border rounded px-2 py-1" />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-gray-600">Nº Cuotas</span>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={cuotas}
                    onChange={(e)=>{
                      const v = e.target.value.replace(/[^0-9]/g,'');
                      setCuotas(v);
                      userEditedCuotas.current = true;
                    }}
                    className="border rounded px-2 py-1" />
                </label>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-700">
                <div>Saldo base: <span className="font-semibold">${saldoBase.toFixed(2)}</span></div>
                <div>Interés: <span className="font-semibold">${interesValor.toFixed(2)}</span> ({interesNum.toFixed(2)}%)</div>
                <div>Saldo + interés: <span className="font-semibold">${saldoConInteres.toFixed(2)}</span></div>
                <div>Cuotas ({cuotasNum}): <span className="font-semibold">${valorCuota.toFixed(2)}</span> c/u</div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
            <button
              onClick={()=>{
                setTipoVenta(localTipo);
                setFormaPago(localForma);
                const plazoNum = Math.max(parseInt(plazo || '0', 10) || 0, 0);
                const abonoNum = Math.max(parseFloat(String(abono).replace(',', '.')) || 0, 0);
                if (localTipo==='credito' || localTipo==='plan') {
                  setCreditoConfig({
                    plazoDias: plazoNum,
                    abonoInicial: Math.min(abonoNum, Number(total)||0),
                    interesPorc: interesNum,
                    numCuotas: cuotasNum
                  });
                } else {
                  setCreditoConfig({ plazoDias: 0, abonoInicial: 0, interesPorc:0, numCuotas:1 });
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
