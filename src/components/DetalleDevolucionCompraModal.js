import React, { useEffect, useMemo, useState } from 'react';

function formatMoney(n){ const v = Number(n||0); return v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2}); }

const DetalleDevolucionCompraModal = ({ iddev, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dev, setDev] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(()=>{
    const cargar = async () => {
      if(!open || !iddev) return;
      setLoading(true); setError(null);
      try{
        const d = await window.electronAPI.dbGetSingle('SELECT * FROM devcompra WHERE id = ?', [iddev]);
        if(!d.success || !d.data) throw new Error('Devolución de compra no encontrada');
        setDev(d.data);
        if(d.data.idprov){
          try{
            const c = await window.electronAPI.dbGetSingle('SELECT cod, empresa, representante, ruc FROM proveedor WHERE cod = ? OR ruc = ? LIMIT 1', [d.data.idprov, d.data.idprov]);
            if(c.success) setProveedor(c.data||null);
          }catch{ setProveedor(null); }
        } else { setProveedor(null); }
        // Detectar columnas de asociación en devcompradet
        let hasIdDevCompra = false; // id de la cabecera devcompra
        let hasIdDev = false;      // id de la devolución (otra variante)
        try{
          const info = await window.electronAPI.dbQuery("PRAGMA table_info('devcompradet')", []);
          const cols = Array.isArray(info?.data)? info.data: [];
          hasIdDevCompra = cols.some(col => String(col.name||'').toLowerCase()==='iddevcompra');
          hasIdDev = cols.some(col => String(col.name||'').toLowerCase()==='iddev');
        }catch(_){ hasIdDevCompra = false; hasIdDev = false; }
        if(hasIdDevCompra){
          const det = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
            FROM devcompradet dv LEFT JOIN producto p ON p.codigo = dv.codprod
            WHERE dv.iddevcompra = ?
            ORDER BY CAST(dv.item as INTEGER) ASC`, [iddev]);
          setItems(det.success && Array.isArray(det.data) ? det.data : []);
        } else if(hasIdDev){
          const det = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
            FROM devcompradet dv LEFT JOIN producto p ON p.codigo = dv.codprod
            WHERE dv.iddev = ?
            ORDER BY CAST(dv.item as INTEGER) ASC`, [iddev]);
          setItems(det.success && Array.isArray(det.data) ? det.data : []);
        } else {
          // Fallback legacy A: algunos esquemas guardan el id de la devolución en devcompradet.idcompra
          let det = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
            FROM devcompradet dv LEFT JOIN producto p ON p.codigo = dv.codprod
            WHERE dv.idcompra = ?
            ORDER BY CAST(dv.item as INTEGER) ASC`, [iddev]);
          let rows = (det.success && Array.isArray(det.data)) ? det.data : [];
          // Fallback legacy B: si no hay filas, intentar resolver idcompra correcto por coincidencia de total y proveedor
          if((!rows || rows.length===0)){
            // 1) Buscar candidatos por total exacto
            const tot = Number(d?.data?.total||0);
            const tot2 = Number(tot.toFixed(2));
            const cand = await window.electronAPI.dbQuery(
              `SELECT idcompra, ROUND(SUM(cantidad*precio),2) as tot
               FROM devcompradet GROUP BY idcompra HAVING ROUND(SUM(cantidad*precio),2) = ?`,
              [tot2]
            );
            let candIds = (cand.success && Array.isArray(cand.data)) ? cand.data.map(r=> String(r.idcompra)) : [];
            // 2) Filtrar por proveedor (idprov) si es posible
            if(candIds.length>1 && d?.data?.idprov){
              const filtered = [];
              for(const cid of candIds){
                const cpr = await window.electronAPI.dbGetSingle('SELECT id, idprov, fecha FROM compra WHERE id = ? LIMIT 1', [cid]);
                if(cpr.success && cpr.data && String(cpr.data.idprov||'')===String(d.data.idprov||'')) filtered.push(cid);
              }
              if(filtered.length>0) candIds = filtered;
            }
            // 3) Si persisten múltiples, elegir por fecha más cercana
            if(candIds.length>1 && d?.data?.fecha){
              let best = null, bestDiff = Number.POSITIVE_INFINITY;
              for(const cid of candIds){
                const cpr = await window.electronAPI.dbGetSingle('SELECT fecha FROM compra WHERE id = ? LIMIT 1', [cid]);
                if(cpr.success && cpr.data && cpr.data.fecha){
                  const diff = Math.abs(new Date(String(cpr.data.fecha)).getTime() - new Date(String(d.data.fecha)).getTime());
                  if(diff < bestDiff){ bestDiff = diff; best = cid; }
                }
              }
              candIds = best? [best] : candIds;
            }
            // 4) Si obtuvimos un candidato, persistirlo en devcompra.idcompra
            if(candIds.length===1){
              try{ await window.electronAPI.dbRun('UPDATE devcompra SET idcompra = ? WHERE id = ?', [candIds[0], iddev]); }catch(_){ }
              // Reintentar carga por ese idcompra
              const det2 = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
                FROM devcompradet dv LEFT JOIN producto p ON p.codigo = dv.codprod
                WHERE dv.idcompra = ?
                ORDER BY CAST(dv.item as INTEGER) ASC`, [candIds[0]]);
              rows = (det2.success && Array.isArray(det2.data)) ? det2.data : [];
            } else if(d?.data?.idcompra){
              // 5) Como último recurso, si la cabecera ya tiene idcompra, úsalo
              const det3 = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
                FROM devcompradet dv LEFT JOIN producto p ON p.codigo = dv.codprod
                WHERE dv.idcompra = ?
                ORDER BY CAST(dv.item as INTEGER) ASC`, [d.data.idcompra]);
              rows = (det3.success && Array.isArray(det3.data)) ? det3.data : [];
            }
          }
          setItems(rows||[]);
          if(!rows || rows.length===0){
            setError(prev=> prev ? prev : 'No se encontró detalle vinculado.');
          }
        }
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    };
    cargar();
  }, [open, iddev]);

  const totales = useMemo(()=>{
    const sub = (items||[]).reduce((s,it)=> s + (Number(it.cantidad)||0) * (Number(it.precio)||0), 0);
    return { sub, total: sub };
  }, [items]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg mt-10 w-[900px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Detalle Devolución de Compra #{iddev}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {dev && !loading && (
          <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-700">
              <div><span className="font-medium">Devolución #:</span> {String(dev.id)}</div>
              <div><span className="font-medium">Fecha:</span> {String(dev.fecha||'').slice(0,10)}</div>
              <div className="md:col-span-2"><span className="font-medium">Proveedor:</span> {proveedor? ((proveedor.empresa||proveedor.representante||'').trim() || proveedor.ruc || proveedor.cod) : (dev.idprov||'—')}</div>
              <div><span className="font-medium">Subtotal:</span> ${formatMoney(dev.subtotal)}</div>
              <div><span className="font-medium">Descuento:</span> ${formatMoney(dev.descuento)}</div>
              <div><span className="font-medium">Total devolución:</span> ${formatMoney(dev.total)}</div>
            </div>

            <div className="border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1">#</th>
                    <th className="text-left px-2 py-1">Código</th>
                    <th className="text-left px-2 py-1">Descripción</th>
                    <th className="text-right px-2 py-1">Cant.</th>
                    <th className="text-right px-2 py-1">P. U.</th>
                    <th className="text-right px-2 py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length===0 && <tr><td colSpan="6" className="text-center py-4 text-gray-400">Sin detalle.</td></tr>}
                  {items.map((it)=> (
                    <tr key={it.item} className="border-t">
                      <td className="px-2 py-1">{it.item}</td>
                      <td className="px-2 py-1">{it.codprod}</td>
                      <td className="px-2 py-1">{it.descripcion}</td>
                      <td className="px-2 py-1 text-right">{Number(it.cantidad)||0}</td>
                      <td className="px-2 py-1 text-right">{formatMoney(it.precio)}</td>
                      <td className="px-2 py-1 text-right">{formatMoney((Number(it.cantidad)||0) * (Number(it.precio)||0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-2 py-2 font-semibold text-right" colSpan={6}>Total devolución USD $ {formatMoney(totales.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleDevolucionCompraModal;
