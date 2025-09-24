import React, { useEffect, useState, useCallback } from 'react';
import ReservaController from '../controllers/ReservaController';

// Modal para convertir una reserva en venta
// Props: idReserva, open, onClose, onConverted (callback)
const reservaController = new ReservaController();

const numberOr = (v, def=0) => { const n = Number(v); return isNaN(n)?def:n; };
const round2 = (n)=>{ const x=Math.round((Number(n)||0)*100)/100; return x===0?0:x; };

const ConvertirReservaModal = ({ idReserva, open, onClose, onConverted }) => {
  const [loading, setLoading] = useState(false);
  const [reserva, setReserva] = useState(null);
  const [productos, setProductos] = useState([]); // {codigo, nombre, cantidadOriginal, cantidad, precioActual, iva_porcentaje}
  const [descuentoTipo, setDescuentoTipo] = useState('valor');
  const [descuento, setDescuento] = useState(0);
  const [formaPago, setFormaPago] = useState('contado'); // contado | credito
  const [plazoDias, setPlazoDias] = useState(30);
  const [interesPorc, setInteresPorc] = useState(0);
  const [numCuotas, setNumCuotas] = useState(1);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [tipoComprobante, setTipoComprobante] = useState('nota'); // nota | factura

  // Cargar reserva y reconsultar precios actuales
  useEffect(()=>{
    const cargar = async () => {
      if(!open || !idReserva) return;
      setLoading(true);
      const r = await reservaController.obtener(idReserva);
      if(r.success && r.data){
        setReserva(r.data);
        let productosJson = [];
        try { if(r.data.productos_json) productosJson = JSON.parse(r.data.productos_json)||[]; } catch(_){}
        const enriquecidos = [];
        for(const p of productosJson){
          let prodRow=null;
          try {
            if(!window.__PRODUCT_COLUMNS_CACHE){
              try {
                const info = await window.electronAPI.dbQuery("PRAGMA table_info('producto')");
                if(info.success){ window.__PRODUCT_COLUMNS_CACHE = (info.data||[]).map(c=>c.name.toLowerCase()); }
              } catch { window.__PRODUCT_COLUMNS_CACHE = []; }
            }
            const hasIva = window.__PRODUCT_COLUMNS_CACHE.includes('iva');
            const cols = hasIva ? 'codigo, producto, pvp, iva, almacen' : 'codigo, producto, pvp, almacen';
            const q = await window.electronAPI.dbGetSingle(`SELECT ${cols} FROM producto WHERE codigo = ?`, [p.codigo]);
            if(q.success){ prodRow = q.data; if(!hasIva) prodRow.iva = 12; }
          } catch(_){ }
          enriquecidos.push({
            codigo: p.codigo,
            nombre: prodRow?.producto || p.nombre || '',
            cantidadOriginal: Number(p.cantidad)||0,
            cantidad: Number(p.cantidad)||0,
            precioActual: Number(prodRow?.pvp||p.precio||0),
            iva_porcentaje: Number(prodRow?.iva ?? 12) || 0,
            stockAlmacen: Number(prodRow?.almacen||0)
          });
        }
        setProductos(enriquecidos);
      }
      setLoading(false);
    };
    cargar();
  }, [open, idReserva]);

  const calcularTotales = useCallback(()=>{
    let subtotal=0, ivaTotal=0;
    productos.forEach(p => {
      const base = round2(p.cantidad * p.precioActual);
      const ivaVal = round2(base * (Number(p.iva_porcentaje||0)/100));
      subtotal += base; ivaTotal += ivaVal;
    });
    subtotal = round2(subtotal); ivaTotal = round2(ivaTotal);
    let bruto = round2(subtotal + ivaTotal);
    let desc=0;
    if(descuentoTipo==='percent'){
      const perc = Math.min(100, Math.max(0, Number(descuento)||0));
      desc = round2(bruto * (perc/100));
    } else {
      desc = Math.min(bruto, Math.max(0, round2(descuento)));
    }
    const total = round2(bruto - desc);
    const anticipo = Number(reserva?.monto_reserva||0);
    const saldo = round2(Math.max(total - anticipo, 0));
    return { subtotal, iva: ivaTotal, total, descuento: desc, saldo, anticipo };
  }, [productos, descuentoTipo, descuento, reserva]);

  const totals = calcularTotales();

  const updateCantidad = (codigo, value) => {
    setProductos(prev => prev.map(p => p.codigo===codigo ? { ...p, cantidad: Math.max(0, numberOr(value,0)) } : p));
  };

  const handleConvertir = async () => {
    if(!reserva) return;
    if(productos.length===0){ alert('Sin productos'); return; }
    // Validar incrementos contra stock
    for(const p of productos){
      if(p.cantidad > p.cantidadOriginal){
        const diff = p.cantidad - p.cantidadOriginal;
        if(p.stockAlmacen < diff){
          alert(`Stock insuficiente para ${p.codigo}. Incremento ${diff} > stock almacén ${p.stockAlmacen}`);
          return;
        }
      }
    }
    setLoading(true);
    const payload = {
      itemsEditados: productos.map(p => ({ codigo: p.codigo, cantidad: p.cantidad })),
      descuentoTipo,
      descuento: Number(descuento)||0,
      formaPago,
      credito: formaPago==='credito' ? { plazoDias, interesPorc, numCuotas } : {},
      numeroComprobante,
      tipoComprobante
    };
    const res = await reservaController.convertirAventa({ idReserva, options: payload });
    setLoading(false);
    if(!res.success){ alert(res.error||'Error al convertir'); return; }
    if(onConverted) onConverted(res.data);
    onClose?.();
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded shadow-lg w-full max-w-5xl mt-10 mb-10 animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Convertir Reserva #{idReserva}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={loading}>✕</button>
        </div>
        <div className="p-4 space-y-6 text-sm">
          {loading && <div className="text-center text-gray-500">Procesando...</div>}
          {!loading && reserva && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">Monto reserva (anticipo)</div>
                  <div className="font-semibold">{Number(reserva.monto_reserva||0).toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">Subtotal</div>
                  <div className="font-semibold">{totals.subtotal.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">IVA</div>
                  <div className="font-semibold">{totals.iva.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">Descuento aplicado</div>
                  <div className="font-semibold">{totals.descuento.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">Total</div>
                  <div className="font-semibold">{totals.total.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="text-gray-500">Saldo tras anticipo</div>
                  <div className="font-semibold">{totals.saldo.toFixed(2)}</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-2 text-gray-700">Productos</div>
                <div className="overflow-auto border rounded max-h-72">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-2 py-1">Código</th>
                        <th className="text-left px-2 py-1">Nombre</th>
                        <th className="text-right px-2 py-1">Cant. Original</th>
                        <th className="text-right px-2 py-1">Cant. Final</th>
                        <th className="text-right px-2 py-1">Precio</th>
                        <th className="text-right px-2 py-1">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map(p => {
                        const sub = round2(p.cantidad * p.precioActual);
                        return (
                          <tr key={p.codigo} className="border-t">
                            <td className="px-2 py-1 font-mono">{p.codigo}</td>
                            <td className="px-2 py-1 truncate max-w-[220px]">{p.nombre}</td>
                            <td className="px-2 py-1 text-right text-gray-500">{p.cantidadOriginal}</td>
                            <td className="px-2 py-1 text-right">
                              <input type="number" className="w-20 border rounded px-1 py-0.5 text-right text-xs" value={p.cantidad} min={0}
                                     onChange={e=> updateCantidad(p.codigo, e.target.value)} />
                            </td>
                            <td className="px-2 py-1 text-right">{p.precioActual.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{sub.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 bg-gray-50 p-3 rounded border">
                  <div className="font-medium text-gray-700">Descuento</div>
                  <select value={descuentoTipo} onChange={e=> setDescuentoTipo(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
                    <option value="valor">Valor</option>
                    <option value="percent">% Porcentaje</option>
                  </select>
                  <input type="number" className="w-full border rounded px-2 py-1 text-xs" value={descuento}
                         onChange={e=> setDescuento(e.target.value)} />
                </div>
                <div className="space-y-2 bg-gray-50 p-3 rounded border">
                  <div className="font-medium text-gray-700">Forma de pago</div>
                  <select value={formaPago} onChange={e=> setFormaPago(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                  {formaPago==='credito' && (
                    <div className="space-y-1 text-xs">
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <div className="text-gray-500">Plazo (días)</div>
                          <input type="number" value={plazoDias} onChange={e=> setPlazoDias(e.target.value)} className="w-full border rounded px-1 py-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-500">Interés %</div>
                          <input type="number" value={interesPorc} onChange={e=> setInteresPorc(e.target.value)} className="w-full border rounded px-1 py-0.5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-gray-500">Cuotas</div>
                          <input type="number" value={numCuotas} onChange={e=> setNumCuotas(e.target.value)} className="w-full border rounded px-1 py-0.5" />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500">Se generarán cuotas similares a las de ventas a crédito.</div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 bg-gray-50 p-3 rounded border">
                  <div className="font-medium text-gray-700">Comprobante</div>
                  <select value={tipoComprobante} onChange={e=> setTipoComprobante(e.target.value)} className="w-full border rounded px-2 py-1 text-xs mb-1">
                    <option value="nota">Nota</option>
                    <option value="factura">Factura</option>
                  </select>
                  <input placeholder="Número (opcional)" value={numeroComprobante} onChange={e=> setNumeroComprobante(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t">
                <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border" disabled={loading}>Cancelar</button>
                <button onClick={handleConvertir} disabled={loading} className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Convertir a Venta</button>
              </div>
              <div className="text-[10px] text-gray-400">* Al convertir: se ajustará stock solo por diferencias; el anticipo se aplicará automáticamente.</div>
            </>
          )}
          {!loading && !reserva && (
            <div className="text-center text-gray-500 py-10">No se pudo cargar la reservación.</div>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
        .animate-fade-in { animation: fade-in .18s ease-out; }
      `}</style>
    </div>
  );
};

export default ConvertirReservaModal;
