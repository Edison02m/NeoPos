import React, { useEffect, useMemo, useState } from 'react';
import { DevolucionCompraUI } from '../../controllers/DevolucionesUIController';

function formatMoney(n){ const v = Number(n||0); return v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2}); }
const round2 = (n) => Number((Math.round(Number(n||0) * 100) / 100).toFixed(2));

const NuevaDevolucionCompra = ({ onClose, onSaved }) => {
  // Listado y filtros de compras
  const [comprasLista, setComprasLista] = useState([]);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [provFiltro, setProvFiltro] = useState('');
  const [compraSeleccionadaId, setCompraSeleccionadaId] = useState('');
  const [compra, setCompra] = useState(null);
  const [items, setItems] = useState([]); // {codprod, descripcion, cantidadRestante, precio, grabaiva, devolver}
  const [agregarIva, setAgregarIva] = useState(false);
  const [ivaPorcentaje, setIvaPorcentaje] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Totales (sin IVA explícito, coherente con guardado de devcompra en Compras/index)
  const subtotal = useMemo(()=> round2(items.reduce((s,it)=> s + (Number(it.devolver)||0) * (Number(it.precio)||0), 0)), [items]);
  const ivaDev = useMemo(()=> {
    if(!agregarIva) return 0;
    const sum = items.reduce((s,it)=> s + (Number(it.devolver)||0) * (Number(it.ivaUnitShare)||0), 0);
    return Number(sum.toFixed(2));
  }, [agregarIva, items]);
  const total = useMemo(()=> round2(subtotal + ivaDev), [subtotal, ivaDev]);

  const cargarCompras = async () => {
    setLoading(true); setError(null);
    try{
      const list = await DevolucionCompraUI.cargarCompras({ desde, hasta, provFiltro });
      setComprasLista(list);
    }catch(e){ setError(e.message); setComprasLista([]); }
    finally{ setLoading(false); }
  };

  useEffect(()=>{ cargarCompras(); }, []);

  const buscarCompra = async (idOverride) => {
    const cid = idOverride || compraSeleccionadaId;
    if(!cid) return;
    setLoading(true); setError(null);
    try{
      const { compra: comp, items } = await DevolucionCompraUI.cargarItemsCompra(cid);
      setCompra(comp);
      setItems(items);
      setCompraSeleccionadaId(cid);
    }catch(e){ setError(e.message); setCompra(null); setItems([]); }
    finally{ setLoading(false); }
  };

  const guardar = async () => {
    try{
      const cid = compra?.id || compraSeleccionadaId;
      if(!cid){ alert('Seleccione una compra antes de guardar la devolución.'); return; }
      const devolverItems = items.filter(it => Number(it.devolver)>0).map(it => ({ codprod: it.codprod, cantidad: Number(it.devolver), precio: it.precio }));
      if(devolverItems.length===0) { alert('No hay cantidades a devolver'); return; }

      setLoading(true); setError(null);
      const res = await DevolucionCompraUI.guardarDevolucionCompra({ compra, devolverItems, subtotal, total });
      try{ await cargarCompras(); }catch(_){ }
      setCompra(null); setItems([]); setCompraSeleccionadaId('');
      onSaved && onSaved(res?.id);
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Nueva devolución de compra</h2>
        <button className="text-sm px-2 py-1 bg-gray-200 rounded" onClick={onClose}>Cerrar</button>
      </div>

      {/* Filtros y listado de compras */}
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
            <label className="block text-xs text-gray-600">Proveedor (contiene)</label>
            <input type="text" value={provFiltro} onChange={e=> setProvFiltro(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="RUC/Cód proveedor/nombre" />
          </div>
          <button onClick={cargarCompras} className="bg-blue-600 text-white text-sm px-3 py-1 rounded" disabled={loading}>{loading? 'Cargando...' : 'Aplicar'}</button>
        </div>
        <div className="max-h-48 overflow-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Proveedor</th>
                <th className="text-right px-2 py-1">Devuelto</th>
                <th className="text-right px-2 py-1">Total neto</th>
                <th className="text-left px-2 py-1">FPago</th>
                <th className="text-left px-2 py-1">Acción</th>
              </tr>
            </thead>
            <tbody>
              {comprasLista.length===0 && <tr><td colSpan="6" className="text-center py-3 text-gray-400">Sin compras en el rango.</td></tr>}
              {comprasLista.map(v => (
                <tr key={v.id} className={`border-t ${compraSeleccionadaId===v.id? 'bg-blue-50':''}`}>
                  <td className="px-2 py-1">{v.id}</td>
                  <td className="px-2 py-1">{String(v.fecha).replace('T',' ').slice(0,19)}</td>
                  <td className="px-2 py-1">{v.provNombre || v.idprov || ''}</td>
                  <td className="px-2 py-1 text-right text-red-600">{formatMoney(v.totalDevuelto||0)}</td>
                  <td className="px-2 py-1 text-right font-medium">{formatMoney(v.totalNeto!=null? v.totalNeto : v.total)}</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span>{String(v.fpago||'')}</span>
                      {String(v.trial272||'1')==='2' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">Parcial</span>
                      )}
                      {String(v.trial272||'1')==='1' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-800 border border-green-200">Activa</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <button className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded" onClick={()=> { setCompraSeleccionadaId(v.id); buscarCompra(v.id); }}>Seleccionar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

      {compra && (
        <div className="mb-3 text-sm text-gray-700">
          <div><span className="font-medium">Proveedor:</span> {compra.idprov||'—'}</div>
          <div><span className="font-medium">Fecha:</span> {String(compra.fecha).replace('T',' ').slice(0,19)}</div>
          <div><span className="font-medium">FPago:</span> {String(compra.fpago||'')}</div>
        </div>
      )}

      <div className="border rounded">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 py-1">Código</th>
              <th className="text-left px-2 py-1">Descripción</th>
              <th className="text-right px-2 py-1">Ya devuelto</th>
              <th className="text-right px-2 py-1">Restante</th>
              <th className="text-right px-2 py-1">Precio</th>
              <th className="text-right px-2 py-1">Devolver</th>
            </tr>
          </thead>
          <tbody>
            {items.length===0 && <tr><td className="px-2 py-3 text-center text-gray-400" colSpan="6">Sin productos</td></tr>}
            {items.map((it,idx)=> (
              <tr key={it.codprod} className="border-t">
                <td className="px-2 py-1">{it.codprod}</td>
                <td className="px-2 py-1">{it.descripcion}</td>
                <td className="px-2 py-1 text-right text-blue-700">{it.yaDevuelto||0}</td>
                <td className="px-2 py-1 text-right font-medium">{it.cantidadRestante}</td>
                <td className="px-2 py-1 text-right">{formatMoney(it.precio)}</td>
                <td className="px-2 py-1 text-right">
                  <input type="number" min="0" max={it.cantidadRestante} value={it.devolver}
                    onChange={e=>{
                      const v = Math.max(0, Math.min(Number(e.target.value)||0, it.cantidadRestante));
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

      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-700">
          <div>Subtotal: <span className="font-semibold">${formatMoney(subtotal)}</span></div>
          <div className="flex items-center gap-2 mt-1">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={agregarIva} onChange={(e)=> setAgregarIva(e.target.checked)} />
              Agregar IVA
            </label>
            <input type="number" min="0" max="100" step="0.1" value={ivaPorcentaje}
              disabled={!agregarIva}
              onChange={(e)=> setIvaPorcentaje(Math.max(0, Math.min(100, Number(e.target.value)||0)))}
              className="w-20 border rounded px-1 py-0.5 text-right disabled:bg-gray-100" />
            <span className="text-xs text-gray-600">%</span>
            {agregarIva && (
              <span className="text-xs text-gray-700">IVA: <span className="font-semibold">${formatMoney(ivaDev)}</span></span>
            )}
          </div>
          <div className="mt-1">Total a devolver: <span className="font-semibold">${formatMoney(total)}</span></div>
        </div>
        <button onClick={guardar} className="bg-emerald-600 text-white text-sm px-3 py-1 rounded" disabled={loading || !compra || items.every(it=> Number(it.devolver)<=0)}>Guardar devolución</button>
      </div>
    </div>
  );
};

export default NuevaDevolucionCompra;
