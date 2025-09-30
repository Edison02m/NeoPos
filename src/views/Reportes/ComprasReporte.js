import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
import DetalleCompraModal from '../../components/DetalleCompraModal';
import DetalleDevolucionCompraModal from '../../components/DetalleDevolucionCompraModal';

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Vista inicial (stub) del Reporte de Compras; se ampliará con filtros y modal detalle
const ComprasReporte = () => {
  const [compras, setCompras] = useState([]);
  const [modoDevoluciones, setModoDevoluciones] = useState(false); // false: Compras, true: Devoluciones
  const [selected, setSelected] = useState(new Set());
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleTab, setDetalleTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [totalFilter, setTotalFilter] = useState(null); // {op:'gt|lt|eq|between', a:number, b?:number}
  const [formaPago, setFormaPago] = useState('todas'); // todas|CONTADO|TRANSFERENCIA|CREDITO|OTRO
  const [incluirDevueltas, setIncluirDevueltas] = useState(false); // si OFF solo trial272=1
  const { modalState, showAlert, showConfirm } = useModal();
  const modalAlert = async (message, title='Información') => { try { await showAlert(message, title); } catch { alert(`${title}: ${message}`); } };
  const modalConfirm = async (message, title='Confirmación') => { try { return await showConfirm(message, title); } catch { return window.confirm(`${title}: ${message}`); } };

  useEffect(()=>{
    if(!window?.electronAPI?.onMenuAction) return;
    const off = window.electronAPI.onMenuAction(async action => {
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
          if(selected.size !== 1){ await modalAlert('Seleccione una sola transacción.', 'Información'); return; }
          setDetalleTab('resumen'); setDetalleOpen(true);
          break;
        case 'reporte-compras-detalle-productos':
          if(selected.size !== 1){ await modalAlert('Seleccione una sola transacción.', 'Información'); return; }
          setDetalleTab('productos'); setDetalleOpen(true);
          break;
        case 'reporte-compras-eliminar-transaccion':
          if(selected.size === 0){ await modalAlert('Seleccione al menos una transacción.', 'Información'); return; }
          if(modoDevoluciones){
            for(const id of selected){ await eliminarDevolucionCompra(id); }
          } else {
            for(const id of selected){ await eliminarCompra(id); }
          }
          break;
        case 'reporte-compras-totales-por-proveedor':
          mostrarTotalesPorProveedor();
          break;
        case 'reporte-compras-ver-devoluciones':
          setModoDevoluciones(true); cargar(true); break;
        case 'reporte-compras-ver-compras':
          setModoDevoluciones(false); cargar(true); break;
        default: break;
      }
    });
    return ()=> { try { off?.(); } catch(_){} };
  }, [selected, desde, hasta, totalFilter, formaPago, incluirDevueltas, modoDevoluciones]);

  const cargar = async (silent=false) => {
    try {
      if(!silent) setLoading(true);
      setError(null);
      const where = []; const params = [];
      if(desde) { where.push('date(fecha) >= date(?)'); params.push(desde); }
      if(hasta) { where.push('date(fecha) <= date(?)'); params.push(hasta); }
      if(totalFilter && !isNaN(totalFilter.a)){
        if(totalFilter.op==='gt'){ where.push('total > ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='lt'){ where.push('total < ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='eq'){ where.push('total = ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='between' && !isNaN(totalFilter.b)){ where.push('total BETWEEN ? AND ?'); params.push(totalFilter.a, totalFilter.b); }
      }
      if(!modoDevoluciones){
        if(formaPago !== 'todas'){ where.push('UPPER(fpago) = UPPER(?)'); params.push(formaPago); }
        const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
        // incluir estado trial272
        const sql = `SELECT id, idprov, fecha, subtotal, descuento, iva, total, numfactura, COALESCE(trial272,'1') as trial272, fpago FROM compra ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
        const res = await window.electronAPI.dbQuery(sql, params);
        if(!res.success) throw new Error(res.error||'No se pudo consultar compras');
        let data = res.data||[];
        if(!incluirDevueltas){ data = data.filter(c => String(c.trial272||'1')==='1'); }
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
      } else {
        const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
        const sql = `SELECT id, idprov, fecha, subtotal, descuento, total, fpago FROM devcompra ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
        const res = await window.electronAPI.dbQuery(sql, params);
        if(!res.success) throw new Error(res.error||'No se pudo consultar devoluciones');
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
      }
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
    const ok = await modalConfirm('¿Eliminar la compra seleccionada? Esto revertirá el stock.', 'Confirmación');
    if(!ok) return;
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
        await modalAlert('Compra eliminada', 'Información');
      } catch(inner){
        await window.electronAPI.dbRun('ROLLBACK');
        throw inner;
      }
    } catch(e){ await modalAlert('Error eliminando: '+ e.message, 'Error'); }
  };

  const eliminarDevolucionCompra = async (id) => {
    const ok = await modalConfirm('¿Eliminar la devolución seleccionada? Esto ajustará el stock.', 'Confirmación');
    if(!ok) return;
    try{
      await window.electronAPI.dbRun('BEGIN');
      try{
        const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad FROM devcompradet WHERE idcompra = ?', [id]);
        if(det.success){
          for(const d of det.data||[]){
            const qty = Number(d.cantidad)||0;
            if(qty>0){ await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [qty, d.codprod]); }
          }
        }
        await window.electronAPI.dbRun('DELETE FROM devcompradet WHERE idcompra = ?', [id]);
        await window.electronAPI.dbRun('DELETE FROM devcompra WHERE id = ?', [id]);
        await window.electronAPI.dbRun('COMMIT');
        await cargar(true);
        await modalAlert('Devolución de compra eliminada', 'Información');
      } catch(err){ await window.electronAPI.dbRun('ROLLBACK'); throw err; }
    } catch(e){ await modalAlert('Error eliminando devolución: '+e.message, 'Error'); }
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
      await modalAlert('Reporte Excel generado', 'Información');
    }catch(e){ await modalAlert('Error al exportar: '+ e.message, 'Error'); }
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
      await modalAlert('Reporte PDF generado', 'Información');
    }catch(e){ await modalAlert('Error al exportar PDF: '+ e.message, 'Error'); }
  };

  const toggleSeleccionTodo = () => {
    if (selected.size === compras.length) setSelected(new Set());
    else setSelected(new Set(compras.map(c=>c.id)));
  };
  const toggleSeleccion = (id) => {
    const ns = new Set(selected); if(ns.has(id)) ns.delete(id); else ns.add(id); setSelected(ns);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">{modoDevoluciones? 'Reporte de Devoluciones de Compras' : 'Reporte de Compras'}</h1>
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
          {!modoDevoluciones && (
            <>
              <div>
                <label className="block text-xs text-gray-600">Forma de pago</label>
                <select value={formaPago} onChange={e=> setFormaPago(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="todas">Todas</option>
                  <option value="CONTADO">CONTADO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="CREDITO">CREDITO</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={incluirDevueltas} onChange={e=> setIncluirDevueltas(e.target.checked)} />
                Incluir devueltas
              </label>
            </>
          )}
          <div>
            <label className="block text-xs text-gray-600">Vista</label>
            <select value={modoDevoluciones? 'dev' : 'comp'} onChange={e=> setModoDevoluciones(e.target.value==='dev')} className="border rounded px-2 py-1 text-sm">
              <option value="comp">Compras</option>
              <option value="dev">Devoluciones</option>
            </select>
          </div>
          <button onClick={()=>cargar()} className="bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50" disabled={loading}>{loading? 'Cargando...' : 'Aplicar filtros'}</button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-center"><input type="checkbox" checked={selected.size===compras.length && compras.length>0} onChange={toggleSeleccionTodo} /></th>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Proveedor</th>
                {!modoDevoluciones && <th className="text-left px-2 py-1">Factura</th>}
                {!modoDevoluciones && <th className="text-left px-2 py-1">Estado</th>}
                <th className="text-right px-2 py-1">Subtotal</th>
                <th className="text-right px-2 py-1">Descuento</th>
                {!modoDevoluciones && <th className="text-right px-2 py-1">IVA</th>}
                <th className="text-right px-2 py-1">Total</th>
                <th className="text-left px-2 py-1">Forma pago</th>
              </tr>
            </thead>
            <tbody>
              {compras.length===0 && (
                <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={modoDevoluciones?8:10}>Sin resultados en el rango.</td></tr>
              )}
              {compras.map(c => (
                <tr key={c.id} className={`border-t cursor-pointer ${selected.has(c.id)? 'bg-blue-50':''}`} onClick={()=> toggleSeleccion(c.id)}>
                  <td className="px-2 py-1 text-center align-middle" onClick={e=> e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={()=> toggleSeleccion(c.id)} />
                  </td>
                  <td className="px-2 py-1">{c.id}</td>
                  <td className="px-2 py-1">{String(c.fecha).replace('T',' ').slice(0,19)}</td>
                  <td className="px-2 py-1">{c.proveedorNombre||c.idprov}</td>
                  {!modoDevoluciones && <td className="px-2 py-1">{c.numfactura||''}</td>}
                  {!modoDevoluciones && (
                    <td className="px-2 py-1">
                      {String(c.trial272||'1')==='1' ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Activa</span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Devuelta</span>
                      )}
                    </td>
                  )}
                  <td className="px-2 py-1 text-right">{formatMoney(c.subtotal)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(c.descuento)}</td>
                  {!modoDevoluciones && <td className="px-2 py-1 text-right">{formatMoney(c.iva)}</td>}
                  <td className="px-2 py-1 text-right">{formatMoney(c.total)}</td>
                  <td className="px-2 py-1">{String(c.fpago||'')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={modoDevoluciones?8:10}>Total USD $ {formatMoney(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="text-right text-sm font-semibold">Total USD $ {formatMoney(totals.total)}</div>
      </div>
      {detalleOpen && (!modoDevoluciones ? (
        <DetalleCompraModal
          open={detalleOpen}
          onClose={()=> setDetalleOpen(false)}
          idCompra={selected.size===1 ? Array.from(selected)[0] : null}
          initialTab={detalleTab}
        />
      ) : (
        <DetalleDevolucionCompraModal
          open={detalleOpen}
          onClose={()=> setDetalleOpen(false)}
          iddev={selected.size===1 ? Array.from(selected)[0] : null}
        />
      ))}
    </div>
    <Modal
      isOpen={modalState.isOpen}
      type={modalState.type}
      title={modalState.title}
      message={modalState.message}
      onConfirm={modalState.onConfirm}
      onClose={modalState.onClose}
    />
    </>
  );
};

export default ComprasReporte;
