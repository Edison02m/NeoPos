import React, { useEffect, useMemo, useState } from 'react';
import DetalleVentaModal from '../../components/DetalleVentaModal';

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VentasReporte = () => {
  const [ventas, setVentas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleTab, setDetalleTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [formaPago, setFormaPago] = useState('todas'); // todas|efectivo|cheque|tarjeta
  const [tipoVenta, setTipoVenta] = useState('todas'); // todas|contado|credito|plan
  const [totalFilter, setTotalFilter] = useState(null); // {op:'gt|lt|eq|between', a:number, b?:number}

  // Menú de la ventana de reportes
  useEffect(() => {
    if(!window?.electronAPI?.onMenuAction) return;
    const remove = window.electronAPI.onMenuAction((action) => {
      switch(action){
        case 'reporte-ventas-filtrar-fecha-todas':
          setDesde(''); setHasta(''); cargar(true); break;
        case 'reporte-ventas-filtrar-fecha-hoy':
          {
            const d = new Date();
            const y = d.toISOString().slice(0,10);
            setDesde(y); setHasta(y); cargar(true);
          }
          break;
        case 'reporte-ventas-filtrar-fecha-una':
          {
            const y = prompt('Ingrese la fecha (YYYY-MM-DD):');
            if(y){ setDesde(y); setHasta(y); cargar(true); }
          }
          break;
        case 'reporte-ventas-filtrar-fecha-periodo':
          {
            const des = prompt('Desde (YYYY-MM-DD):', desde);
            const has = prompt('Hasta (YYYY-MM-DD):', hasta);
            if(des && has){ setDesde(des); setHasta(has); cargar(true); }
          }
          break;
        case 'reporte-ventas-filtrar-forma-todas': setFormaPago('todas'); cargar(true); break;
        case 'reporte-ventas-filtrar-forma-efectivo': setFormaPago('efectivo'); cargar(true); break;
        case 'reporte-ventas-filtrar-forma-cheque': setFormaPago('cheque'); cargar(true); break;
        case 'reporte-ventas-filtrar-forma-tarjeta': setFormaPago('tarjeta'); cargar(true); break;
        case 'reporte-ventas-filtrar-total-mayor':
          {
            const a = Number(prompt('Total mayor a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'gt', a}); cargar(true);
          }
          break;
        case 'reporte-ventas-filtrar-total-menor':
          {
            const a = Number(prompt('Total menor a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'lt', a}); cargar(true);
          }
          break;
        case 'reporte-ventas-filtrar-total-igual':
          {
            const a = Number(prompt('Total igual a (USD):')||''); if(!isNaN(a)) setTotalFilter({op:'eq', a}); cargar(true);
          }
          break;
        case 'reporte-ventas-filtrar-total-entre':
          {
            const a = Number(prompt('Total desde (USD):')||'');
            const b = Number(prompt('Total hasta (USD):')||'');
            if(!isNaN(a) && !isNaN(b)) setTotalFilter({op:'between', a, b});
            cargar(true);
          }
          break;
        case 'reporte-ventas-detalle-transaccion':
          if(!selectedVenta){ alert('Seleccione una venta.'); return; }
          setDetalleTab('resumen'); setDetalleOpen(true);
          break;
        case 'reporte-ventas-detalle-productos':
          if(!selectedVenta){ alert('Seleccione una venta.'); return; }
          setDetalleTab('productos'); setDetalleOpen(true);
          break;
        case 'reporte-ventas-eliminar-transaccion':
          if(!selectedVenta){ alert('Seleccione una venta.'); return; }
          eliminarVenta(selectedVenta);
          break;
        case 'reporte-ventas-crear-comprobante':
          if(!selectedVenta){ alert('Seleccione una venta.'); return; }
          crearComprobante(selectedVenta);
          break;
        case 'reporte-ventas-totales-por-forma':
          mostrarTotalesPorForma();
          break;
        default: break;
      }
    });
    return () => { if(remove) remove(); };
  }, [selectedVenta, desde, hasta]);

  const cargar = async (silent=false) => {
    try{
      if(!silent) setLoading(true);
      setError(null);
      const where = [];
      const params = [];
      if (desde) { where.push('date(fecha) >= date(?)'); params.push(desde); }
      if (hasta) { where.push('date(fecha) <= date(?)'); params.push(hasta); }
      if (tipoVenta !== 'todas') {
        const map = { contado: 0, credito: 1, plan: 2 };
        where.push('fpago = ?'); params.push(map[tipoVenta]);
      }
      if (formaPago !== 'todas') {
        const map = { efectivo: 1, cheque: 2, tarjeta: 3 };
        where.push('formapago = ?'); params.push(map[formaPago]);
      }
      if (totalFilter && !isNaN(totalFilter.a)) {
        if(totalFilter.op==='gt') { where.push('total > ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='lt') { where.push('total < ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='eq') { where.push('total = ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='between' && !isNaN(totalFilter.b)) { where.push('total BETWEEN ? AND ?'); params.push(totalFilter.a, totalFilter.b); }
      }
      const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
      const sql = `SELECT id, fecha, idcliente, subtotal, descuento, iva, total, fpago, formapago, comprob, numfactura FROM venta ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
      const res = await window.electronAPI.dbQuery(sql, params);
      if(!res.success) throw new Error(res.error || 'No se pudo consultar ventas');

      const data = res.data || [];
      const out = [];
      for(const v of data){
        let clienteNombre = '';
        try{
          const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [v.idcliente, v.idcliente]);
          if(c.success && c.data){ clienteNombre = `${c.data.apellidos||''} ${c.data.nombres||''}`.trim() || (c.data.cedula||''); }
        }catch(_){ }
        out.push({ ...v, clienteNombre });
      }
      setVentas(out);

      // Abonos del periodo
      const whereAb = [];
      const paramsAb = [];
      if (desde) { whereAb.push('date(fecha) >= date(?)'); paramsAb.push(desde); }
      if (hasta) { whereAb.push('date(fecha) <= date(?)'); paramsAb.push(hasta); }
      const whereSqlAb = whereAb.length? ('WHERE ' + whereAb.join(' AND ')) : '';
      const sqlAb = `SELECT id, idventa, idcliente, fecha, monto, formapago FROM abono ${whereSqlAb} ORDER BY fecha DESC, id DESC LIMIT 2000`;
      const resAb = await window.electronAPI.dbQuery(sqlAb, paramsAb);
      let abonosOut = [];
      if(resAb.success && Array.isArray(resAb.data)){
        for(const a of resAb.data){
          let clienteNombre = '';
          try{
            const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [a.idcliente, a.idcliente]);
            if(c.success && c.data){ clienteNombre = `${c.data.apellidos||''} ${c.data.nombres||''}`.trim() || (c.data.cedula||''); }
          }catch(_){ }
          abonosOut.push({ ...a, clienteNombre });
        }
      }
      setAbonos(abonosOut);
    }catch(e){ setError(e.message); }
    finally{ if(!silent) setLoading(false); }
  };

  useEffect(()=>{ cargar(); }, []);

  const totals = useMemo(() => {
    const t = { subtotal:0, descuento:0, iva:0, total:0 };
    for(const v of ventas){ t.subtotal += Number(v.subtotal)||0; t.descuento += Number(v.descuento)||0; t.iva += Number(v.iva)||0; t.total += Number(v.total)||0; }
    return t;
  }, [ventas]);

  const totalsAbonos = useMemo(() => {
    let total = 0;
    for(const a of abonos){ total += Number(a.monto)||0; }
    return { total };
  }, [abonos]);

  // Exportaciones
  const exportExcel = async () => {
    try{
      const rows = ventas.map(v => ({
        ID: v.id,
        Fecha: String(v.fecha).replace('T',' ').slice(0,19),
        Cliente: v.clienteNombre||v.idcliente,
        Comprobante: (v.comprob==='F'? 'Factura' : 'Nota') + (v.numfactura? ` ${v.numfactura}` : ''),
        Subtotal: Number(v.subtotal)||0,
        Descuento: Number(v.descuento)||0,
        IVA: Number(v.iva)||0,
        Total: Number(v.total)||0,
        Tipo: (v.fpago===0? 'Contado' : v.fpago===1? 'Crédito':'Plan'),
        'Forma pago': (v.formapago===1? 'Efectivo' : v.formapago===2? 'Cheque':'Tarjeta')
      }));
      const result = await window.electronAPI.generateExcelReport(rows, 'reporte_ventas', 'Ventas');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar');
      alert('Reporte Excel generado');
    }catch(e){ alert('Error al exportar: ' + e.message); }
  };

  const exportPDF = async () => {
    try{
      const headers = ['#','Fecha','Cliente','Comprob.','Subtotal','Desc.','IVA','Total','Tipo','FPago'];
      const data = ventas.map(v => [
        String(v.id),
        String(v.fecha).replace('T',' ').slice(0,19),
        v.clienteNombre||v.idcliente,
        (v.comprob==='F'? 'Factura' : 'Nota') + (v.numfactura? ` ${v.numfactura}` : ''),
        formatMoney(v.subtotal),
        formatMoney(v.descuento),
        formatMoney(v.iva),
        formatMoney(v.total),
        (v.fpago===0? 'Contado' : v.fpago===1? 'Crédito':'Plan'),
        (v.formapago===1? 'Efectivo' : v.formapago===2? 'Cheque':'Tarjeta')
      ]);
      const footerTotals = {
        label: 'TOTALES',
        labelIndex: 3,
        totals: { 4: formatMoney(totals.subtotal), 5: formatMoney(totals.descuento), 6: formatMoney(totals.iva), 7: formatMoney(totals.total) }
      };
      const reportData = { title: 'REPORTE DE VENTAS', headers, data, footerTotals, stats: [
        `Rango: ${desde} a ${hasta}`,
        `Tipo: ${tipoVenta}`,
        `Forma de pago: ${formaPago}`,
        `Total ventas: ${ventas.length}`
      ] };
      const result = await window.electronAPI.generatePDFReport(reportData, 'reporte_ventas');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar PDF');
      alert('Reporte PDF generado');
    }catch(e){ alert('Error al exportar PDF: ' + e.message); }
  };

  // Acciones
  // Modal de detalle: manejado por DetalleVentaModal

  const eliminarVenta = async (ventaId) => {
    if(!window.confirm('¿Eliminar la transacción seleccionada? Esta acción revertirá stock y relacionados.')) return;
    try{
      const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad FROM ventadet WHERE idventa = ?', [ventaId]);
      if(det.success){
        for(const it of det.data||[]){
          await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [Number(it.cantidad)||0, it.codprod]);
        }
      }
      await window.electronAPI.dbRun('DELETE FROM ventadet WHERE idventa = ?', [ventaId]);
      await window.electronAPI.dbRun('DELETE FROM credito WHERE idventa = ?', [ventaId]);
      await window.electronAPI.dbRun('DELETE FROM abono WHERE idventa = ?', [ventaId]);
      await window.electronAPI.dbRun('DELETE FROM venta WHERE id = ?', [ventaId]);
      await cargar();
      alert('Transacción eliminada');
    }catch(e){ alert('Error eliminando: ' + e.message); }
  };

  const crearComprobante = async (ventaId) => {
    alert('Crear comprobante aún no implementado. Venta #' + ventaId);
  };

  const mostrarTotalesPorForma = () => {
    const porForma = ventas.reduce((acc,v)=>{ const k = v.formapago; acc[k] = (acc[k]||0) + Number(v.total||0); return acc; },{});
    alert(`Totales por forma de pago:\nEfectivo: ${formatMoney(porForma[1]||0)}\nCheque: ${formatMoney(porForma[2]||0)}\nTarjeta: ${formatMoney(porForma[3]||0)}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Reporte de Ventas</h1>
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
          <div>
            <label className="block text-xs text-gray-600">Tipo de venta</label>
            <select value={tipoVenta} onChange={e=> setTipoVenta(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="todas">Todas</option>
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
              <option value="plan">Plan</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Forma de pago</label>
            <select value={formaPago} onChange={e=> setFormaPago(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="todas">Todas</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          <button onClick={()=>cargar()} className="bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50" disabled={loading}>{loading? 'Cargando...' : 'Aplicar filtros'}</button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Grid superior: Ventas */}
        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Cliente</th>
                <th className="text-left px-2 py-1">Comprob.</th>
                <th className="text-right px-2 py-1">Subtotal</th>
                <th className="text-right px-2 py-1">Descuento</th>
                <th className="text-right px-2 py-1">IVA</th>
                <th className="text-right px-2 py-1">Total</th>
                <th className="text-left px-2 py-1">Tipo</th>
                <th className="text-left px-2 py-1">Forma pago</th>
              </tr>
            </thead>
            <tbody>
            {ventas.length===0 && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={11}>Sin resultados en el rango.</td></tr>
            )}
            {ventas.map(v => (
              <tr key={v.id} className={`border-t cursor-pointer ${selectedVenta===v.id? 'bg-blue-50':''}`} onClick={()=> setSelectedVenta(v.id)}>
                <td className="px-2 py-1 text-center align-middle" onClick={e=> e.stopPropagation()}>
                  <input type="checkbox" checked={selectedVenta===v.id} onChange={()=> setSelectedVenta(selectedVenta===v.id? null : v.id)} />
                </td>
                <td className="px-2 py-1">{v.id}</td>
                <td className="px-2 py-1">{String(v.fecha).replace('T',' ').slice(0,19)}</td>
                <td className="px-2 py-1">{v.clienteNombre||v.idcliente}</td>
                <td className="px-2 py-1">{v.comprob==='F'? 'Factura' : 'Nota'}<span className="text-gray-500"> {v.numfactura||''}</span></td>
                <td className="px-2 py-1 text-right">{formatMoney(v.subtotal)}</td>
                <td className="px-2 py-1 text-right">{formatMoney(v.descuento)}</td>
                <td className="px-2 py-1 text-right">{formatMoney(v.iva)}</td>
                <td className="px-2 py-1 text-right">{formatMoney(v.total)}</td>
                <td className="px-2 py-1">{v.fpago===0? 'Contado' : v.fpago===1? 'Crédito':'Plan'}</td>
                <td className="px-2 py-1">{v.formapago===1? 'Efectivo' : v.formapago===2? 'Cheque':'Tarjeta'}</td>
              </tr>
            ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={11}>Total Ventas USD $ {formatMoney(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Grid inferior: Abonos */}
        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Cliente</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-right px-2 py-1">Monto</th>
                <th className="text-left px-2 py-1">Tipo venta</th>
                <th className="text-left px-2 py-1">Forma de pago</th>
              </tr>
            </thead>
            <tbody>
              {abonos.length===0 && (
                <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={6}>Sin abonos en el rango.</td></tr>
              )}
              {abonos.map(a => (
                <tr key={a.id} className="border-t">
                  <td className="px-2 py-1">{a.id}</td>
                  <td className="px-2 py-1">{a.clienteNombre||a.idcliente}</td>
                  <td className="px-2 py-1">{String(a.fecha).replace('T',' ').slice(0,19)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(a.monto)}</td>
                  <td className="px-2 py-1">Crédito</td>
                  <td className="px-2 py-1">{a.formapago===1? 'Efectivo' : a.formapago===2? 'Cheque':'Tarjeta'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={6}>Total Abonos USD $ {formatMoney(totalsAbonos.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Totales generales */}
        <div className="text-right text-sm font-semibold">Total USD $ {formatMoney(totals.total)}</div>
      </div>
      <DetalleVentaModal idventa={selectedVenta} open={!!selectedVenta && detalleOpen} onClose={()=> setDetalleOpen(false)} initialTab={detalleTab} />
    </div>
  );
};

export default VentasReporte;
