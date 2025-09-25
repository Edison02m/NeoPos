import React, { useEffect, useMemo, useState, useRef } from 'react';
import ProductoController from '../../controllers/ProductoController';

function formatMoney(n){
  const v = Number(n||0); return '$' + v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2});
}

/* Reporte: Productos Más Vendidos
   Características:
   - Filtros por fecha: todas, hoy, una fecha, periodo (menú)
   - Tabla ranking: #, Producto, P.V.P. (precio unitario referencial), Cantidad vendida
   - Exportar PDF / Excel
   - Usa ventadet + venta (para fecha) y producto (para descripcion y precio)
*/
const ProductosMasVendidos = () => {
  const [rows,setRows]=useState([]);
  // Fechas aplicadas (las que están en uso en la consulta)
  const [desde,setDesde]=useState('');
  const [hasta,setHasta]=useState('');
  // Fechas editables (dirty form)
  const [desdeTmp,setDesdeTmp]=useState('');
  const [hastaTmp,setHastaTmp]=useState('');
  const [dirty,setDirty]=useState(false);
  const [limit,setLimit]=useState(500);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [sortKey,setSortKey]=useState('cantidad'); // 'cantidad' | 'subtotal'
  const [sortDir,setSortDir]=useState('desc'); // 'asc' | 'desc'

  // Refs para acceder a valores actuales dentro del listener sin re-suscribir
  const desdeRef = useRef(desde); const hastaRef = useRef(hasta); const limitRef = useRef(limit);
  useEffect(()=>{ desdeRef.current = desde; },[desde]);
  useEffect(()=>{ hastaRef.current = hasta; },[hasta]);
  useEffect(()=>{ limitRef.current = limit; },[limit]);

  // Suscripción a menú (una sola vez)
  useEffect(()=>{
    const off = window.electronAPI?.onMenuAction?.((action)=>{
      switch(action){
        case 'reporte-top-fecha-todas': {
          setDesde(''); setHasta(''); setDesdeTmp(''); setHastaTmp(''); setDirty(false); cargar(true); break; }
        case 'reporte-top-fecha-hoy': {
          const d=new Date().toISOString().slice(0,10); setDesde(d); setHasta(d); setDesdeTmp(d); setHastaTmp(d); setDirty(false); cargar(true); break; }
        case 'reporte-top-fecha-una': {
          const f=prompt('Ingrese la fecha (YYYY-MM-DD):'); if(f){ setDesde(f); setHasta(f); setDesdeTmp(f); setHastaTmp(f); setDirty(false); cargar(true);} break; }
        case 'reporte-top-fecha-periodo': {
          const d1=prompt('Desde (YYYY-MM-DD):', desdeRef.current||'');
          const d2=prompt('Hasta (YYYY-MM-DD):', hastaRef.current||'');
          if(d1&&d2){ setDesde(d1); setHasta(d2); setDesdeTmp(d1); setHastaTmp(d2); setDirty(false); cargar(true);} break; }
        case 'reporte-top-limit-50': { setLimit(50); cargar(true); break; }
        case 'reporte-top-limit-100': { setLimit(100); cargar(true); break; }
        default: break;
      }
    });
    return ()=>{ try{ off?.(); }catch(_){} };
  },[]);

  const controllerRef = useRef(new ProductoController());
  const cargar = async (silent=false)=>{
    try{
      if(!silent) setLoading(true); setError(null);
      const res = await controllerRef.current.getTopVendidos({ desde: desde||null, hasta: hasta||null, limit: limitRef.current||limit });
      if(!res.success) throw new Error(res.error||res.message||'Error');
      const base = (res.data||[]).map(r=> ({...r, subtotal:(Number(r.cantidad)||0) * (Number(r.pvp)||0)}));
      setRows(base);
    }catch(e){ setError(e.message); }
    finally { if(!silent) setLoading(false); }
  };

  useEffect(()=>{ cargar(); },[]);

  const totalCantidad = useMemo(()=> rows.reduce((s,r)=> s + (Number(r.cantidad)||0),0), [rows]);
  const totalSubtotal = useMemo(()=> rows.reduce((s,r)=> s + (Number(r.subtotal)||0),0), [rows]);

  // Ordenación
  const sortedRows = useMemo(()=>{
    const copy = [...rows];
    copy.sort((a,b)=>{
      const av = sortKey==='subtotal'? Number(a.subtotal)||0 : Number(a.cantidad)||0;
      const bv = sortKey==='subtotal'? Number(b.subtotal)||0 : Number(b.cantidad)||0;
      if(av===bv) return 0;
      return sortDir==='asc'? av-bv : bv-av;
    });
    return copy;
  },[rows,sortKey,sortDir]);

  const toggleSort = (key)=>{
    if(sortKey===key){ setSortDir(d=> d==='asc'?'desc':'asc'); } else { setSortKey(key); setSortDir('desc'); }
  };

  const exportExcel = async ()=>{
    try{
      const data = sortedRows.map((r,i)=> ({ Num:i+1, Producto:r.descripcion||r.codigo, PVP:Number(r.pvp)||0, Cantidad:Number(r.cantidad)||0, Subtotal:Number(r.subtotal)||0 }));
      const result = await window.electronAPI.generateExcelReport(data,'productos_mas_vendidos','TopProductos');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar');
      alert('Reporte Excel generado');
    }catch(e){ alert('Error exportando: '+ e.message); }
  };

  const exportPDF = async ()=>{
    try{
      const headers = ['Num','Producto','P.V.P.','Cantidad','Subtotal'];
      const data = sortedRows.map((r,i)=> [String(i+1), r.descripcion||r.codigo, formatMoney(r.pvp), String(r.cantidad), formatMoney(r.subtotal)]);
      const footerTotals = { label:'TOTALES', labelIndex:1, totals:{3:String(totalCantidad),4:formatMoney(totalSubtotal)} };
      const reportData = { title:'PRODUCTOS MÁS VENDIDOS', headers, data, footerTotals, stats:[`Registros: ${sortedRows.length}`, `Cantidad total: ${totalCantidad}`, `Subtotal total: ${formatMoney(totalSubtotal)}`, `Límite: ${limit}`] };
      const result = await window.electronAPI.generatePDFReport(reportData,'productos_mas_vendidos');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar PDF');
      alert('Reporte PDF generado');
    }catch(e){ alert('Error exportando PDF: '+ e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          Productos Más Vendidos
          {loading && <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full inline-block" />}
        </h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="bg-red-600 text-white text-sm px-3 py-1 rounded">Exportar PDF</button>
          <button onClick={exportExcel} className="bg-emerald-600 text-white text-sm px-3 py-1 rounded">Exportar Excel</button>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input type="date" value={desdeTmp} onChange={e=> { setDesdeTmp(e.target.value); setDirty(true); }} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input type="date" value={hastaTmp} onChange={e=> { setHastaTmp(e.target.value); setDirty(true); }} className="border rounded px-2 py-1 text-sm" />
          </div>
          <button onClick={()=>{ setDesde(desdeTmp); setHasta(hastaTmp); setDirty(false); cargar(); }} className="bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:opacity-40" disabled={loading || !dirty}>{loading? 'Cargando...':'Aplicar filtros'}</button>
          <div className="text-xs text-gray-500">Límite: {limit}</div>
          <div className="text-xs text-gray-500">Orden: {sortKey==='cantidad'? 'Cantidad':'Subtotal'} {sortDir==='asc'? '↑':'↓'}</div>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Num.</th>
                <th className="px-2 py-1 text-left">Producto</th>
                <th className="px-2 py-1 text-right">P.V.P. ($)</th>
                <th className="px-2 py-1 text-right cursor-pointer select-none" onClick={()=>toggleSort('cantidad')}>Cantidad {sortKey==='cantidad' && (sortDir==='asc'?'▲':'▼')}</th>
                <th className="px-2 py-1 text-right cursor-pointer select-none" onClick={()=>toggleSort('subtotal')}>Subtotal ($) {sortKey==='subtotal' && (sortDir==='asc'?'▲':'▼')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 && (
                <tr><td colSpan={5} className="px-2 py-3 text-center text-gray-500">Sin resultados.</td></tr>
              )}
              {sortedRows.map((r,i)=>(
                <tr key={r.codigo} className="border-t hover:bg-blue-50/40">
                  <td className="px-2 py-1">{i+1}</td>
                  <td className="px-2 py-1">{r.descripcion||r.codigo}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(r.pvp)}</td>
                  <td className="px-2 py-1 text-right">{r.cantidad}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(r.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={5}>Cantidad total: {totalCantidad} | Subtotal total: {formatMoney(totalSubtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductosMasVendidos;
