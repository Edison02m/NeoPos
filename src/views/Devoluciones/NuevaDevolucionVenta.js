import React, { useEffect, useMemo, useState } from 'react';
import { DevolucionVentaUI } from '../../controllers/DevolucionesUIController';

function formatMoney(n){ const v = Number(n||0); return v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2}); }
const round2 = (n) => Number((Math.round(Number(n||0) * 100) / 100).toFixed(2));

const NuevaDevolucionVenta = ({ onClose, onSaved }) => {
  // Listado y filtros de ventas
  const [ventasLista, setVentasLista] = useState([]);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [ventaSeleccionadaId, setVentaSeleccionadaId] = useState('');
  const [venta, setVenta] = useState(null);
  const [baseIvaVenta, setBaseIvaVenta] = useState(0); // base gravada de la venta original
  const [items, setItems] = useState([]); // {codprod, descripcion, cantidadVendida, precio, devolver}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Subtotal (sin IVA), IVA y Total
  const subtotal = useMemo(()=> round2(items.reduce((s,it)=> s + (Number(it.devolver)||0) * (Number(it.precio)||0), 0)), [items]);
  // IVA prorrateado por unidad: suma(devolver * ivaUnitShare)
  const ivaTotal = useMemo(()=> {
    const sum = items.reduce((s,it)=> s + (Number(it.devolver)||0) * (Number(it.ivaUnitShare)||0), 0);
    return Number(sum.toFixed(2));
  }, [items]);
  const total = useMemo(()=> round2(subtotal + ivaTotal), [subtotal, ivaTotal]);

  const cargarVentas = async () => {
    setLoading(true); setError(null);
    try{
      const out = await DevolucionVentaUI.cargarVentas({ desde, hasta, clienteFiltro });
      setVentasLista(out);
    }catch(e){ setError(e.message); setVentasLista([]); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ cargarVentas(); }, []);

  const buscarVenta = async (idOverride) => {
    const vid = idOverride || ventaSeleccionadaId;
    if(!vid) return;
    setLoading(true); setError(null);
    try{
      const { venta: v, baseIvaVenta: base, items } = await DevolucionVentaUI.cargarItemsVenta(vid);
      setVenta(v); setBaseIvaVenta(base); setItems(items); setVentaSeleccionadaId(vid);
    }catch(e){ setError(e.message); setVenta(null); setItems([]); }
    finally{ setLoading(false); }
  };

  const guardar = async () => {
    try{
      const vid = venta?.id || ventaSeleccionadaId;
      if(!vid){ alert('Seleccione una venta antes de guardar la devolución.'); return; }
      const devolverItems = items.filter(it => Number(it.devolver)>0).map(it => ({ codprod: it.codprod, cantidad: Number(it.devolver), precio: it.precio }));
      if(devolverItems.length===0) { alert('No hay cantidades a devolver'); return; }

      setLoading(true); setError(null);
      const res = await DevolucionVentaUI.guardarDevolucionVenta({ venta, devolverItems, subtotal, total });
      try{ await cargarVentas(); }catch(_){ }
      setVenta(null); setItems([]); setVentaSeleccionadaId('');
      onSaved && onSaved(res?.id);
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Nueva devolución de venta</h2>
        <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={onClose}>Cerrar</button>
      </div>

      {/* Filtros y listado de ventas */}
      <div className="border rounded mb-3 p-2">
        <div className="flex flex-wrap items-end gap-3 mb-2">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input type="date" value={desde} onChange={e=> setDesde(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input type="date" value={hasta} onChange={e=> setHasta(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Cliente (contiene)</label>
            <input type="text" value={clienteFiltro} onChange={e=> setClienteFiltro(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="RUC/Cód cliente" />
          </div>
          <button onClick={cargarVentas} className="bg-blue-600 text-white text-sm px-3 py-1 rounded" disabled={loading}>{loading? 'Cargando...' : 'Aplicar'}</button>
        </div>
        <div className="max-h-48 overflow-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Cliente</th>
                <th className="text-right px-2 py-1">Devuelto</th>
                <th className="text-right px-2 py-1">Total neto</th>
                <th className="text-left px-2 py-1">FPago/Estado</th>
                <th className="text-left px-2 py-1">Acción</th>
              </tr>
            </thead>
              <tbody>
                {ventasLista.length===0 && <tr><td colSpan="7" className="text-center py-3 text-gray-400">Sin ventas en el rango.</td></tr>}
                {ventasLista.map(v => (
                  <tr key={v.id} className={`border-t ${ventaSeleccionadaId===v.id? 'bg-blue-50':''}`}>
                    <td className="px-2 py-1">{v.id}</td>
                    <td className="px-2 py-1">{String(v.fecha).replace('T',' ').slice(0,19)}</td>
                    <td className="px-2 py-1">{v.clienteNombre || v.idcliente || ''}</td>
                    <td className="px-2 py-1 text-right text-red-600">{formatMoney(v.totalDevuelto||0)}</td>
                    <td className="px-2 py-1 text-right font-medium">{formatMoney(v.totalNeto!=null? v.totalNeto : v.total)}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span>{v.formapago===1?'Efectivo':v.formapago===2?'Cheque':v.formapago===3?'Tarjeta':v.formapago===4?'Transferencia':'—'}</span>
                        {String(v.trial279||'1')==='2' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">Parcial</span>
                        )}
                        {String(v.trial279||'1')==='1' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Activa</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <button className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded" onClick={()=> buscarVenta(v.id)}>Seleccionar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle de items de la venta seleccionada */}
        {venta && (
          <>
            <div className="mb-3 text-sm text-gray-700">
              <div><span className="font-medium">Cliente:</span> {venta.idcliente||'—'}</div>
              <div><span className="font-medium">Fecha:</span> {String(venta.fecha).replace('T',' ').slice(0,19)}</div>
              <div><span className="font-medium">FPago:</span> {venta.formapago===1?'Efectivo':venta.formapago===2?'Cheque':venta.formapago===3?'Tarjeta':venta.formapago===4?'Transferencia':'—'}</div>
            </div>
            <div className="border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1">Código</th>
                    <th className="text-left px-2 py-1">Descripción</th>
                    <th className="text-right px-2 py-1">Vendido</th>
                    <th className="text-right px-2 py-1">Ya devuelta</th>
                    <th className="text-right px-2 py-1">Restante</th>
                    <th className="text-right px-2 py-1">Precio</th>
                    <th className="text-right px-2 py-1">Devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length===0 && <tr><td className="px-2 py-3 text-center text-gray-400" colSpan="7">Sin productos</td></tr>}
                  {items.map((it,idx)=> (
                    <tr key={it.codprod} className="border-t">
                      <td className="px-2 py-1">{it.codprod}</td>
                      <td className="px-2 py-1">{it.descripcion}</td>
                      <td className="px-2 py-1 text-right">{it.cantidadVendida}</td>
                      <td className="px-2 py-1 text-right text-blue-700">{it.yaDevuelta||0}</td>
                      <td className="px-2 py-1 text-right font-medium">{it.cantidadRestante||0}</td>
                      <td className="px-2 py-1 text-right">{formatMoney(it.precio)}</td>
                      <td className="px-2 py-1 text-right">
                        <input type="number" min="0" max={it.cantidadRestante||0} value={it.devolver}
                          onChange={e=>{
                            const limite = Number(it.cantidadRestante||0);
                            const v = Math.max(0, Math.min(Number(e.target.value)||0, limite));
                            setItems(prev=> prev.map((p,i)=> i===idx? { ...p, devolver:v } : p));
                          }}
                          className="w-20 border rounded px-1 py-0.5 text-right"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-700">
          <div>Subtotal: <span className="font-semibold">${formatMoney(subtotal)}</span></div>
          <div>IVA: <span className="font-semibold">${formatMoney(ivaTotal)}</span></div>
          <div className="mt-1">Total a devolver: <span className="font-semibold">${formatMoney(total)}</span></div>
        </div>
        <button onClick={guardar} className="bg-emerald-600 text-white text-sm px-3 py-1 rounded" disabled={loading || !venta || items.every(it=> Number(it.devolver)<=0)}>Guardar devolución</button>
      </div>
    </div>
  );
}

export default NuevaDevolucionVenta;
