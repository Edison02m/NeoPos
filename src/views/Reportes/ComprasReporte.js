import React, { useEffect, useMemo, useState } from 'react';
import DetalleCompraModal from '../../components/DetalleCompraModal';

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Vista inicial (stub) del Reporte de Compras; se ampliará con filtros y modal detalle
const ComprasReporte = () => {
  const [compras, setCompras] = useState([]);
  const [selectedCompra, setSelectedCompra] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleTab, setDetalleTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [totalFilter, setTotalFilter] = useState(null); // {op:'gt|lt|eq|between', a:number, b?:number}

  useEffect(()=>{
    if(!window?.electronAPI?.onMenuAction) return;
    const off = window.electronAPI.onMenuAction(action => {
      switch(action){
        case 'reporte-compras-filtrar-fecha-todas':
          setDesde(''); setHasta(''); cargar(true); break;
        case 'reporte-compras-filtrar-fecha-hoy':
          {
            const d = new Date();
            const y = d.toISOString().slice(0,10);
            setDesde(y); setHasta(y); cargar(true);
          }
          break;
        case 'reporte-compras-filtrar-fecha-una':
          {
            const y = prompt('Ingrese la fecha (YYYY-MM-DD):');
            if(y){ setDesde(y); setHasta(y); cargar(true); }
          }
          break;
        case 'reporte-compras-filtrar-fecha-periodo':
          {
            const des = prompt('Desde (YYYY-MM-DD):', desde);
            const has = prompt('Hasta (YYYY-MM-DD):', hasta);
            if(des && has){ setDesde(des); setHasta(has); cargar(true); }
          }
          break;
        case 'reporte-compras-filtrar-total-mayor':
          {
            const a = Number(prompt('Total mayor a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'gt', a}); cargar(true);
          }
          break;
        case 'reporte-compras-filtrar-total-menor':
          {
            const a = Number(prompt('Total menor a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'lt', a}); cargar(true);
          }
          break;
        case 'reporte-compras-filtrar-total-igual':
          {
            const a = Number(prompt('Total igual a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'eq', a}); cargar(true);
          }
          break;
        case 'reporte-compras-filtrar-total-entre':
          {
            const a = Number(prompt('Total desde (USD):')||'');
            const b = Number(prompt('Total hasta (USD):')||'');
            if(!isNaN(a) && !isNaN(b)) setTotalFilter({op:'between', a, b});
            cargar(true);
          }
          break;
        case 'reporte-compras-detalle-transaccion':
          if(!selectedCompra){ alert('Seleccione una compra.'); return; }
          setDetalleTab('resumen'); setDetalleOpen(true);
          break;
        case 'reporte-compras-detalle-productos':
          if(!selectedCompra){ alert('Seleccione una compra.'); return; }
          setDetalleTab('productos'); setDetalleOpen(true);
          break;
        case 'reporte-compras-eliminar-transaccion':
          if(!selectedCompra){ alert('Seleccione una compra.'); return; }
          eliminarCompra(selectedCompra);
          break;
        case 'reporte-compras-totales-por-proveedor':
          mostrarTotalesPorProveedor();
          break;
        default: break;
      }
    });
    return ()=> { try { off?.(); } catch(_){} };
  }, [selectedCompra, desde, hasta, totalFilter]);

  const cargar = async (silent=false) => {
    try {
      if(!silent) setLoading(true);
      setError(null);
      const where = [];
      const params = [];
      if(desde) { where.push('date(fecha) >= date(?)'); params.push(desde); }
      if(hasta) { where.push('date(fecha) <= date(?)'); params.push(hasta); }
      if(totalFilter && !isNaN(totalFilter.a)){
        if(totalFilter.op==='gt'){ where.push('total > ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='lt'){ where.push('total < ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='eq'){ where.push('total = ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='between' && !isNaN(totalFilter.b)){ where.push('total BETWEEN ? AND ?'); params.push(totalFilter.a, totalFilter.b); }
      }
      const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
      const sql = `SELECT id, idprov, fecha, subtotal, descuento, iva, total, numfactura FROM compra ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
      const res = await window.electronAPI.dbQuery(sql, params);
      if(!res.success) throw new Error(res.error||'No se pudo consultar compras');
      const data = res.data||[];
      const out = [];
      for(const c of data){
        let proveedorNombre = '';
        try{
          const p = await window.electronAPI.dbGetSingle('SELECT empresa, ruc FROM proveedor WHERE cod = ? OR ruc = ? LIMIT 1', [c.idprov, c.idprov]);
          if(p.success && p.data){ proveedorNombre = p.data.empresa || p.data.ruc || ''; }
        }catch(_){ }
        out.push({ ...c, proveedorNombre });
      }
      setCompras(out);
    } catch(e){ setError(e.message); }
    finally { if(!silent) setLoading(false); }
  };

  useEffect(()=> { cargar(); }, []);

  const totals = useMemo(()=> {
    const t = { subtotal:0, descuento:0, iva:0, total:0 };
    for(const c of compras){ t.subtotal += Number(c.subtotal)||0; t.descuento += Number(c.descuento)||0; t.iva += Number(c.iva)||0; t.total += Number(c.total)||0; }
    return t;
  }, [compras]);

  // Eliminado alert de detalle; ahora se usa modal

  const eliminarCompra = async (id) => {
    if(!window.confirm('¿Eliminar la compra seleccionada? Esto revertirá el stock.')) return;
    try {
      // Iniciar transacción para asegurar atomicidad del rollback
      await window.electronAPI.dbRun('BEGIN');
      try {
        const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad FROM compradet WHERE idcompra = ?', [id]);
        if(det.success){
          // Como una compra previamente incrementó el stock, eliminarla debe RESTAR esas cantidades.
          for(const d of det.data||[]){
            const qty = Number(d.cantidad)||0;
            if(qty>0){
              await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [qty, d.codprod]);
            }
          }
        }
        await window.electronAPI.dbRun('DELETE FROM compradet WHERE idcompra = ?', [id]);
        await window.electronAPI.dbRun('DELETE FROM compra WHERE id = ?', [id]);
        await window.electronAPI.dbRun('COMMIT');
        await cargar();
        alert('Compra eliminada');
      } catch(inner){
        await window.electronAPI.dbRun('ROLLBACK');
        throw inner;
      }
    } catch(e){ alert('Error eliminando: '+ e.message); }
  };

  const mostrarTotalesPorProveedor = () => {
    const porProv = compras.reduce((acc,c)=>{ const k = c.idprov; acc[k] = (acc[k]||0) + Number(c.total||0); return acc; }, {});
    const lines = Object.entries(porProv).slice(0,20).map(([k,v])=> `${k}: ${formatMoney(v)}`).join('\n');
    alert('Totales por proveedor (top 20):\n' + (lines||'—'));
  };

  const exportExcel = async () => {
    try{
      const rows = compras.map(c => ({
        ID: c.id,
        Fecha: String(c.fecha).replace('T',' ').slice(0,19),
        Proveedor: c.proveedorNombre||c.idprov,
        Factura: c.numfactura||'',
        Subtotal: Number(c.subtotal)||0,
        Descuento: Number(c.descuento)||0,
        IVA: Number(c.iva)||0,
        Total: Number(c.total)||0
      }));
      const result = await window.electronAPI.generateExcelReport(rows, 'reporte_compras', 'Compras');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar');
      alert('Reporte Excel generado');
    }catch(e){ alert('Error al exportar: '+ e.message); }
  };

  const exportPDF = async () => {
    try{
      const headers = ['#','Fecha','Proveedor','Factura','Subtotal','Desc.','IVA','Total'];
      const data = compras.map(c => [
        String(c.id),
        String(c.fecha).replace('T',' ').slice(0,19),
        c.proveedorNombre||c.idprov,
        c.numfactura||'',
        formatMoney(c.subtotal),
        formatMoney(c.descuento),
        formatMoney(c.iva),
        formatMoney(c.total)
      ]);
      const footerTotals = { label:'TOTALES', labelIndex:3, totals:{4:formatMoney(totals.subtotal),5:formatMoney(totals.descuento),6:formatMoney(totals.iva),7:formatMoney(totals.total)} };
      const reportData = { title:'REPORTE DE COMPRAS', headers, data, footerTotals, stats:[`Rango: ${desde} a ${hasta}`, `Total compras: ${compras.length}`] };
      const result = await window.electronAPI.generatePDFReport(reportData, 'reporte_compras');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar PDF');
      alert('Reporte PDF generado');
    }catch(e){ alert('Error al exportar PDF: '+ e.message); }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Reporte de Compras</h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="bg-red-600 text-white text-sm px-3 py-1 rounded">Exportar PDF</button>
          <button onClick={exportExcel} className="bg-emerald-600 text-white text-sm px-3 py-1 rounded">Exportar Excel</button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input type="date" value={desde} onChange={e=> setDesde(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input type="date" value={hasta} onChange={e=> setHasta(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <button onClick={()=>cargar()} className="bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50" disabled={loading}>{loading? 'Cargando...' : 'Aplicar filtros'}</button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Proveedor</th>
                <th className="text-left px-2 py-1">Factura</th>
                <th className="text-right px-2 py-1">Subtotal</th>
                <th className="text-right px-2 py-1">Descuento</th>
                <th className="text-right px-2 py-1">IVA</th>
                <th className="text-right px-2 py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {compras.length===0 && (
                <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={9}>Sin resultados en el rango.</td></tr>
              )}
              {compras.map(c => (
                <tr key={c.id} className={`border-t cursor-pointer ${selectedCompra===c.id? 'bg-blue-50':''}`} onClick={()=> setSelectedCompra(c.id)}>
                  <td className="px-2 py-1 text-center align-middle" onClick={e=> e.stopPropagation()}>
                    <input type="checkbox" checked={selectedCompra===c.id} onChange={()=> setSelectedCompra(selectedCompra===c.id? null : c.id)} />
                  </td>
                  <td className="px-2 py-1">{c.id}</td>
                  <td className="px-2 py-1">{String(c.fecha).replace('T',' ').slice(0,19)}</td>
                  <td className="px-2 py-1">{c.proveedorNombre||c.idprov}</td>
                  <td className="px-2 py-1">{c.numfactura||''}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(c.subtotal)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(c.descuento)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(c.iva)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={9}>Total Compras USD $ {formatMoney(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="text-right text-sm font-semibold">Total USD $ {formatMoney(totals.total)}</div>
      </div>
      {detalleOpen && (
        <DetalleCompraModal
          open={detalleOpen}
          onClose={()=> setDetalleOpen(false)}
          idCompra={selectedCompra}
          initialTab={detalleTab}
        />
      )}
    </div>
  );
};

export default ComprasReporte;
