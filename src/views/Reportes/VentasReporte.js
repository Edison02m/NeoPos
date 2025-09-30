import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
import DetalleVentaModal from '../../components/DetalleVentaModal';
import DetalleDevolucionModal from '../../components/DetalleDevolucionModal';

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const VentasReporte = () => {
  const [ventas, setVentas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [modoDevoluciones, setModoDevoluciones] = useState(false); // false: Ventas, true: Devoluciones
  const [selectedVentas, setSelectedVentas] = useState(new Set());
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleTab, setDetalleTab] = useState('resumen');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [formaPago, setFormaPago] = useState('todas'); // todas|efectivo|cheque|tarjeta|transferencia
  const [incluirDevueltas, setIncluirDevueltas] = useState(false); // cuando false, solo trial279=1
  const [tipoVenta, setTipoVenta] = useState('todas'); // todas|contado|credito|plan
  const [totalFilter, setTotalFilter] = useState(null); // {op:'gt|lt|eq|between', a:number, b?:number}
  const [bancoFiltro, setBancoFiltro] = useState('');
  const [cobradoFiltro, setCobradoFiltro] = useState('todas'); // todas|S|N
  const { modalState, showAlert, showConfirm } = useModal();
  const modalAlert = async (message, title='Información') => { try { await showAlert(message, title); } catch { alert(`${title}: ${message}`); } };
  const modalConfirm = async (message, title='Confirmación') => { try { return await showConfirm(message, title); } catch { return window.confirm(`${title}: ${message}`); } };

  // Menú de la ventana de reportes
  useEffect(() => {
    if(!window?.electronAPI?.onMenuAction) return;
    const remove = window.electronAPI.onMenuAction(async (action) => {
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
        case 'reporte-ventas-filtrar-forma-transferencia': setFormaPago('transferencia'); cargar(true); break;
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
          const selectedForTrans = selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null;
          if(!selectedForTrans){ await modalAlert('Seleccione una sola venta para ver detalles.', 'Información'); return; }
          setDetalleTab('resumen'); setDetalleOpen(true);
          break;
        case 'reporte-ventas-detalle-productos':
          const selectedForProducts = selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null;
          if(!selectedForProducts){ await modalAlert('Seleccione una sola venta para ver productos.', 'Información'); return; }
          setDetalleTab('productos'); setDetalleOpen(true);
          break;
        case 'reporte-ventas-eliminar-transaccion':
          if(selectedVentas.size === 0){ await modalAlert('Seleccione al menos una venta para eliminar.', 'Información'); return; }
          eliminarVentasSeleccionadas();
          break;
        case 'reporte-ventas-crear-comprobante':
          const selectedForComprobante = selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null;
          if(!selectedForComprobante){ await modalAlert('Seleccione una sola venta para crear comprobante.', 'Información'); return; }
          crearComprobante(selectedForComprobante);
          break;
        case 'reporte-ventas-totales-por-forma':
          mostrarTotalesPorForma();
          break;
        case 'reporte-ventas-ver-devoluciones':
          setModoDevoluciones(true); cargar(true); break;
        case 'reporte-ventas-ver-ventas':
          setModoDevoluciones(false); cargar(true); break;
        default: break;
      }
    });
    return () => { if(remove) remove(); };
  }, [selectedVentas, desde, hasta, bancoFiltro, cobradoFiltro]);

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
        const map = { efectivo: 1, cheque: 2, tarjeta: 3, transferencia: 4 };
        where.push('formapago = ?'); params.push(map[formaPago]);
      }
      if (totalFilter && !isNaN(totalFilter.a)) {
        if(totalFilter.op==='gt') { where.push('total > ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='lt') { where.push('total < ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='eq') { where.push('total = ?'); params.push(totalFilter.a); }
        if(totalFilter.op==='between' && !isNaN(totalFilter.b)) { where.push('total BETWEEN ? AND ?'); params.push(totalFilter.a, totalFilter.b); }
      }
      if (!modoDevoluciones) {
        const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
        const sql = `SELECT id, fecha, idcliente, subtotal, descuento, iva, total, fpago, formapago, comprob, numfactura, COALESCE(trial279,1) AS trial279 FROM venta ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
        const res = await window.electronAPI.dbQuery(sql, params);
        if(!res.success) throw new Error(res.error || 'No se pudo consultar ventas');

        // Filtrar por estado según incluirDevueltas (si está OFF, solo vendidas: trial279=1)
        let data = res.data || [];
        if(!incluirDevueltas){ data = data.filter(v => Number(v.trial279 ?? 1) === 1); }
        const out = [];
        for(const v of data){
          let clienteNombre = '';
          try{
            const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [v.idcliente, v.idcliente]);
            if(c.success && c.data){ clienteNombre = `${c.data.apellidos||''} ${c.data.nombres||''}`.trim() || (c.data.cedula||''); }
          }catch(_){ }
          out.push({ ...v, clienteNombre });
        }
        // Cargar detalleformapago para ventas con formapago 2/4
        try{
          const ids = out.map(v=> v.id).filter(Boolean);
          if(ids.length>0){
            const placeholders = ids.map(()=>'?').join(',');
            const detSql = `SELECT idventa, formapago, banco, numcheque, cobrado FROM detalleformapago WHERE idventa IN (${placeholders})`;
            const detRes = await window.electronAPI.dbQuery(detSql, ids);
            if(detRes.success && Array.isArray(detRes.data)){
              const mapDet = {};
              for(const d of detRes.data){ if(!mapDet[d.idventa]) mapDet[d.idventa] = d; }
              for(const v of out){ const d = mapDet[v.id]; if(d){ v.detalleFormaPago = { banco: d.banco||'', numero: d.numcheque||'', cobrado: d.cobrado||'N', formapago: d.formapago }; } }
            }
          }
        }catch(_){ }
        // Filtros cliente banco/cobrado
        const outFiltered = out.filter(v => {
          let ok = true;
          if (bancoFiltro.trim()) { const banco = String(v.detalleFormaPago?.banco || '').toLowerCase(); ok = ok && banco.includes(bancoFiltro.trim().toLowerCase()); }
          if (cobradoFiltro !== 'todas') { const cob = String(v.detalleFormaPago?.cobrado || ''); ok = ok && cob === cobradoFiltro; }
          return ok;
        });
        setVentas(outFiltered);

        // Abonos del periodo
        const whereAb = []; const paramsAb = [];
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
      } else {
        // Modo devoluciones: consultar devventa
        const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
        const sql = `SELECT id, fecha, idcliente, subtotal, descuento, total, fpago, formapago FROM devventa ${whereSql} ORDER BY fecha DESC, id DESC LIMIT 1000`;
        const res = await window.electronAPI.dbQuery(sql, params);
        if(!res.success) throw new Error(res.error || 'No se pudo consultar devoluciones');
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
        setAbonos([]);
      }
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
      const rows = !modoDevoluciones ? ventas.map(v => ({
        ID: v.id,
        Fecha: String(v.fecha).replace('T',' ').slice(0,19),
        Cliente: v.clienteNombre||v.idcliente,
        Comprobante: (v.comprob==='F'? 'Factura' : 'Nota') + (v.numfactura? ` ${v.numfactura}` : ''),
        Subtotal: Number(v.subtotal)||0,
        Descuento: Number(v.descuento)||0,
        IVA: Number(v.iva)||0,
        Total: Number(v.total)||0,
        Tipo: (v.fpago===0? 'Contado' : v.fpago===1? 'Crédito':'Plan'),
        'Forma pago': (
          v.formapago===1? 'Efectivo'
          : v.formapago===2? 'Cheque'
          : v.formapago===3? 'Tarjeta'
          : v.formapago===4? 'Transferencia'
          : String(v.formapago)
        ),
        Banco: v.detalleFormaPago?.banco || '',
        Numero: v.detalleFormaPago?.numero || '',
        Cobrado: v.detalleFormaPago?.cobrado || ''
      })) : ventas.map(v => ({
        ID: v.id,
        Fecha: String(v.fecha).replace('T',' ').slice(0,19),
        Cliente: v.clienteNombre||v.idcliente,
        Subtotal: Number(v.subtotal)||0,
        Descuento: Number(v.descuento)||0,
        Total: Number(v.total)||0,
        'Forma pago': (
          v.formapago===1? 'Efectivo'
          : v.formapago===2? 'Cheque'
          : v.formapago===3? 'Tarjeta'
          : v.formapago===4? 'Transferencia'
          : String(v.formapago)
        )
      }));
      const result = await window.electronAPI.generateExcelReport(rows, 'reporte_ventas', 'Ventas');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar');
      await modalAlert('Reporte Excel generado', 'Información');
    }catch(e){ await modalAlert('Error al exportar: ' + e.message, 'Error'); }
  };

  const exportPDF = async () => {
    try{
      // Columnas compactas para mayor legibilidad en PDF
      const headers = !modoDevoluciones
        ? ['#','Fecha','Cliente','Comprob.','Subtotal','Desc.','IVA','Total','FPago']
        : ['#','Fecha','Cliente','Subtotal','Desc.','Total','FPago'];
      const data = !modoDevoluciones ? ventas.map(v => [
        String(v.id),
        String(v.fecha).replace('T',' ').slice(0,19),
        v.clienteNombre||v.idcliente,
        (v.comprob==='F'? 'Factura' : 'Nota') + (v.numfactura? ` ${v.numfactura}` : ''),
        formatMoney(v.subtotal),
        formatMoney(v.descuento),
        formatMoney(v.iva),
        formatMoney(v.total),
        (
          v.formapago===1? 'Efectivo'
          : v.formapago===2? 'Cheque'
          : v.formapago===3? 'Tarjeta'
          : v.formapago===4? 'Transferencia'
          : String(v.formapago)
        )
      ]) : ventas.map(v => [
        String(v.id),
        String(v.fecha).replace('T',' ').slice(0,19),
        v.clienteNombre||v.idcliente,
        formatMoney(v.subtotal),
        formatMoney(v.descuento),
        formatMoney(v.total),
        (
          v.formapago===1? 'Efectivo'
          : v.formapago===2? 'Cheque'
          : v.formapago===3? 'Tarjeta'
          : v.formapago===4? 'Transferencia'
          : String(v.formapago)
        )
      ]);
      const footerTotals = {
        label: 'TOTALES',
        labelIndex: !modoDevoluciones ? 3 : 2,
        // Totales según cabeceras
        totals: !modoDevoluciones
          ? { 4: formatMoney(totals.subtotal), 5: formatMoney(totals.descuento), 6: formatMoney(totals.iva), 7: formatMoney(totals.total) }
          : { 3: formatMoney(totals.subtotal), 4: formatMoney(totals.descuento), 5: formatMoney(totals.total) }
      };
      const reportData = { title: !modoDevoluciones ? 'REPORTE DE VENTAS' : 'REPORTE DE DEVOLUCIONES', headers, data, footerTotals, stats: [
        `Rango: ${desde} a ${hasta}`,
        `Tipo: ${tipoVenta}`,
        `Forma de pago: ${formaPago}`,
        `Total ventas: ${ventas.length}`
      ] };
      const result = await window.electronAPI.generatePDFReport(reportData, 'reporte_ventas');
      if(!result?.success) throw new Error(result?.error||'No se pudo exportar PDF');
      await modalAlert('Reporte PDF generado', 'Información');
    }catch(e){ await modalAlert('Error al exportar PDF: ' + e.message, 'Error'); }
  };

  // Acciones
  // Modal de detalle: manejado por DetalleVentaModal

  const toggleSeleccionTodo = () => {
    if (selectedVentas.size === ventas.length) {
      setSelectedVentas(new Set());
    } else {
      setSelectedVentas(new Set(ventas.map(v => v.id)));
    }
  };

  const toggleSeleccionVenta = (ventaId) => {
    const newSelection = new Set(selectedVentas);
    if (newSelection.has(ventaId)) {
      newSelection.delete(ventaId);
    } else {
      newSelection.add(ventaId);
    }
    setSelectedVentas(newSelection);
  };

  const eliminarVentasSeleccionadas = async () => {
    if (selectedVentas.size === 0) {
      await modalAlert('No hay ventas seleccionadas para eliminar.', 'Información');
      return;
    }

    const ok = await modalConfirm(`¿Eliminar ${selectedVentas.size} transacción(es) seleccionada(s)? Esta acción revertirá stock y relacionados.`, 'Confirmación');
    if(!ok) return;

    setLoading(true);
    try {
      // Procesar todas las ventas en una sola transacción
      for (const ventaId of selectedVentas) {
        // Actualizar stock
        const det = await window.electronAPI.dbQuery('SELECT codprod, cantidad FROM ventadet WHERE idventa = ?', [ventaId]);
        if(det.success){
          for(const it of det.data||[]){
            await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [Number(it.cantidad)||0, it.codprod]);
          }
        }
        // Eliminar registros relacionados
        await window.electronAPI.dbRun('DELETE FROM ventadet WHERE idventa = ?', [ventaId]);
        await window.electronAPI.dbRun('DELETE FROM credito WHERE idventa = ?', [ventaId]);
        await window.electronAPI.dbRun('DELETE FROM abono WHERE idventa = ?', [ventaId]);
        await window.electronAPI.dbRun('DELETE FROM venta WHERE id = ?', [ventaId]);
      }
      
      // Limpiar selección y recargar datos
      setSelectedVentas(new Set());
      await cargar();
      
      // Una sola notificación al final
      await modalAlert(`${selectedVentas.size} transacción(es) eliminada(s) correctamente`, 'Información');
    } catch (e) {
      await modalAlert('Error eliminando transacciones: ' + e.message, 'Error');
    } finally {
      setLoading(false);
    }
  };

  const eliminarVenta = async (ventaId) => {
    const ok = await modalConfirm('¿Eliminar esta venta? Esto revertirá el stock y registros relacionados.', 'Confirmación');
    if(!ok) return;
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
      await cargar(true);
      await modalAlert('Venta eliminada', 'Información');
    }catch(e){ await modalAlert('Error eliminando: ' + e.message, 'Error'); }
  };

  const crearComprobante = async (ventaId) => {
    modalAlert('Crear comprobante aún no implementado. Venta #' + ventaId, 'Información');
  };

  const mostrarTotalesPorForma = () => {
    const porForma = ventas.reduce((acc,v)=>{ const k = v.formapago; acc[k] = (acc[k]||0) + Number(v.total||0); return acc; },{});
    modalAlert(`Totales por forma de pago:\nEfectivo: ${formatMoney(porForma[1]||0)}\nCheque: ${formatMoney(porForma[2]||0)}\nTarjeta: ${formatMoney(porForma[3]||0)}\nTransferencia: ${formatMoney(porForma[4]||0)}`, 'Información');
  };

  return (
    <>
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">{modoDevoluciones? 'Reporte de Devoluciones' : 'Reporte de Ventas'}</h1>
        <div className="flex gap-2">
          {modoDevoluciones && (
            <div className="relative">
              <details className="inline-block">
                <summary className="list-none bg-gray-700 text-white text-sm px-3 py-1 rounded cursor-pointer select-none">Opciones ▾</summary>
                <div className="absolute right-0 mt-1 w-56 bg-white border rounded shadow text-sm z-10">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={async ()=>{
                      const sel = selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null;
                      if(!sel){ await modalAlert('Seleccione una sola devolución para ver detalles.', 'Información'); return; }
                      setDetalleTab('resumen'); setDetalleOpen(true);
                    }}
                  >Ver detalles</button>
                  <div className="border-t my-1" />
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                    onClick={()=>{ try { window.close(); } catch(_){} }}
                  >Cerrar ventana</button>
                </div>
              </details>
            </div>
          )}

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
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          {!modoDevoluciones && (
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={incluirDevueltas} onChange={e=> setIncluirDevueltas(e.target.checked)} />
              Incluir devueltas
            </label>
          )}
          <div>
            <label className="block text-xs text-gray-600">Banco (contiene)</label>
            <input type="text" value={bancoFiltro} onChange={e=> setBancoFiltro(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="Banco..." />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Cobrado</label>
            <select value={cobradoFiltro} onChange={e=> setCobradoFiltro(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="todas">Todas</option>
              <option value="S">Sí</option>
              <option value="N">No</option>
            </select>
          </div>
          <button onClick={()=>cargar()} className="bg-blue-600 text-white text-sm px-3 py-1 rounded disabled:opacity-50" disabled={loading}>{loading? 'Cargando...' : 'Aplicar filtros'}</button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {/* Grid superior: Ventas o Devoluciones */}
        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedVentas.size === ventas.length && ventas.length > 0}
                    onChange={toggleSeleccionTodo}
                  />
                </th>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">Cliente</th>
                {!modoDevoluciones && <th className="text-left px-2 py-1">Comprob.</th>}
                {!modoDevoluciones && <th className="text-left px-2 py-1">Estado</th>}
                <th className="text-right px-2 py-1">Subtotal</th>
                <th className="text-right px-2 py-1">Descuento</th>
                {!modoDevoluciones && <th className="text-right px-2 py-1">IVA</th>}
                <th className="text-right px-2 py-1">Total</th>
                <th className="text-left px-2 py-1">Forma pago</th>
              </tr>
            </thead>
            <tbody>
            {ventas.length===0 && (
              <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={modoDevoluciones?9:10}>Sin resultados en el rango.</td></tr>
            )}
            {ventas.map(v => (
              <tr key={v.id} className={`border-t cursor-pointer ${selectedVentas.has(v.id)? 'bg-blue-50':''}`} onClick={()=> toggleSeleccionVenta(v.id)}>
                <td className="px-2 py-1 text-center align-middle" onClick={e=> e.stopPropagation()}>
                  <input type="checkbox" checked={selectedVentas.has(v.id)} onChange={()=> toggleSeleccionVenta(v.id)} />
                </td>
                <td className="px-2 py-1">{v.id}</td>
                <td className="px-2 py-1">{String(v.fecha).replace('T',' ').slice(0,19)}</td>
                <td className="px-2 py-1">{v.clienteNombre||v.idcliente}</td>
                {!modoDevoluciones && <td className="px-2 py-1">{v.comprob==='F'? 'Factura' : 'Nota'}<span className="text-gray-500"> {v.numfactura||''}</span></td>}
                {!modoDevoluciones && (
                  <td className="px-2 py-1">
                    {Number(v.trial279) === 1 ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Vendida</span>
                    ) : Number(v.trial279) === 2 ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">Devolución parcial</span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Devuelta</span>
                    )}
                  </td>
                )}
                <td className="px-2 py-1 text-right">{formatMoney(v.subtotal)}</td>
                <td className="px-2 py-1 text-right">{formatMoney(v.descuento)}</td>
                {!modoDevoluciones && <td className="px-2 py-1 text-right">{formatMoney(v.iva)}</td>}
                <td className="px-2 py-1 text-right">{formatMoney(v.total)}</td>
                <td className="px-2 py-1">{
                  v.formapago===1? 'Efectivo'
                  : v.formapago===2? 'Cheque'
                  : v.formapago===3? 'Tarjeta'
                  : v.formapago===4? 'Transferencia'
                  : String(v.formapago)
                }</td>

              </tr>
            ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={modoDevoluciones?9:10}>Total USD $ {formatMoney(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Grid inferior: Abonos (sólo en ventas) */}
        {!modoDevoluciones && (
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
                  <td className="px-2 py-1">{
                    a.formapago===1? 'Efectivo'
                    : a.formapago===2? 'Cheque'
                    : a.formapago===3? 'Tarjeta'
                    : a.formapago===4? 'Transferencia'
                    : String(a.formapago)
                  }</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={6}>Total Abonos USD $ {formatMoney(totalsAbonos.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>)}

        {/* Totales generales */}
        <div className="text-right text-sm font-semibold">Total USD $ {formatMoney(totals.total)}</div>
      </div>
      {!modoDevoluciones ? (
        <DetalleVentaModal 
          idventa={selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null} 
          open={selectedVentas.size === 1 && detalleOpen} 
          onClose={()=> setDetalleOpen(false)} 
          initialTab={detalleTab} 
        />
      ) : (
        <DetalleDevolucionModal 
          iddev={selectedVentas.size === 1 ? Array.from(selectedVentas)[0] : null} 
          open={selectedVentas.size === 1 && detalleOpen} 
          onClose={()=> setDetalleOpen(false)} 
        />
      )}
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

export default VentasReporte;
