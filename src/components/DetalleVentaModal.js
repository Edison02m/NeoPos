import React, { useEffect, useMemo, useState } from 'react';

const TabButton = ({active, onClick, children}) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 ${active? 'border-blue-600 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
);

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DetalleVentaModal = ({ idventa, open, onClose, initialTab = 'resumen' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [venta, setVenta] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [productos, setProductos] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [detallesFormaPago, setDetallesFormaPago] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [devCab, setDevCab] = useState([]); // cabeceras de devoluciones de esta venta
  const [devDetPorId, setDevDetPorId] = useState({}); // { iddev: [ { codprod, descripcion, cantidad, precio } ] }

  useEffect(()=>{ if(open) setTab(initialTab); }, [open, initialTab]);

  useEffect(() => {
    const cargar = async () => {
      if(!open || !idventa) return;
      setLoading(true);
      setError(null);
      try{
        // Venta
        const v = await window.electronAPI.dbGetSingle('SELECT * FROM venta WHERE id = ?', [idventa]);
        if(!v.success || !v.data) throw new Error('No se encontró la venta');
        setVenta(v.data);
        // Cliente (por cedula o cod)
        if(v.data.idcliente){
          const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula, direccion, telefono FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [v.data.idcliente, v.data.idcliente]);
          if(c.success) setCliente(c.data||null);
        } else { setCliente(null); }
        // Productos (detalle)
        const det = await window.electronAPI.dbQuery(`SELECT d.codprod, d.cantidad, d.precio, COALESCE(d.producto, p.producto) AS descripcion
          FROM ventadet d LEFT JOIN producto p ON p.codigo = d.codprod WHERE d.idventa = ? ORDER BY d.item ASC`, [idventa]);
        setProductos(det.success && Array.isArray(det.data)? det.data : []);
        // Abonos
        const ab = await window.electronAPI.dbQuery('SELECT id, fecha, monto, formapago FROM abono WHERE idventa = ? ORDER BY fecha ASC, id ASC', [idventa]);
        setAbonos(ab.success && Array.isArray(ab.data)? ab.data : []);
        // Detalle forma de pago (cheque/transferencia)
        const df = await window.electronAPI.dbQuery('SELECT formapago, banco, numcheque, cobrado, fecha FROM detalleformapago WHERE idventa = ? ORDER BY rowid ASC', [idventa]);
        setDetallesFormaPago(df.success && Array.isArray(df.data)? df.data : []);
        // Cuotas (si existen)
        const cu = await window.electronAPI.dbQuery('SELECT * FROM cuotas WHERE idventa = ? ORDER BY CAST(item as INTEGER) ASC', [idventa]);
        setCuotas(cu.success && Array.isArray(cu.data)? cu.data : []);

        // Devoluciones asociadas a la venta (cabecera)
        try{
          const cab = await window.electronAPI.dbQuery('SELECT id, fecha, subtotal, descuento, total, formapago FROM devventa WHERE idventa_origen = ? ORDER BY fecha ASC, id ASC', [idventa]);
          const lista = cab.success && Array.isArray(cab.data) ? cab.data : [];
          setDevCab(lista);
          // Detalles por cada devolución
          const map = {};
          // Detectar si devventadet tiene columna iddevventa para enlazar por cabecera
          let hasIdDevVenta = false;
          try{
            const info = await window.electronAPI.dbQuery("PRAGMA table_info('devventadet')", []);
            hasIdDevVenta = info?.success && Array.isArray(info.data) && info.data.some(col => String(col.name||'').toLowerCase()==='iddevventa');
          }catch(_){ hasIdDevVenta = false; }
          for(const dv of lista){
            let detv;
            if(hasIdDevVenta){
              detv = await window.electronAPI.dbQuery(`SELECT dd.item, dd.codprod, dd.cantidad, dd.precio, COALESCE(p.producto, p.descripcion, '') AS descripcion
                FROM devventadet dd LEFT JOIN producto p ON p.codigo = dd.codprod WHERE dd.iddevventa = ? ORDER BY CAST(dd.item as INTEGER) ASC`, [dv.id]);
            } else {
              // Fallback legacy: algunas bases guardan el id de la devolución en la columna idventa
              detv = await window.electronAPI.dbQuery(`SELECT dd.item, dd.codprod, dd.cantidad, dd.precio, COALESCE(p.producto, p.descripcion, '') AS descripcion
                FROM devventadet dd LEFT JOIN producto p ON p.codigo = dd.codprod WHERE dd.idventa = ? ORDER BY CAST(dd.item as INTEGER) ASC`, [dv.id]);
            }
            map[dv.id] = detv.success && Array.isArray(detv.data) ? detv.data : [];
          }
          setDevDetPorId(map);
        }catch(_){ setDevCab([]); setDevDetPorId({}); }
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    };
    cargar();
  }, [open, idventa]);

  const resumenCuota = useMemo(()=>{
    if(!cuotas || cuotas.length===0) return null;
    // item = 1 is the resumen row per legacy
    const r = cuotas.find(c => Number(c.item) === 1) || null;
    if(!r) return null;
    return {
      valorCuota: Number(r.monto1)||0,
      interesTotal: Number(r.interes)||0,
      totalFinanciado: Number(r.monto2)||0,
      numCuotas: r.trial275 ? parseInt(String(r.trial275),10)||0 : 0,
      abonoInicialId: r.idabono ? String(r.idabono) : null
    };
  }, [cuotas]);

  const totales = useMemo(()=>{
    const sub = Number(venta?.subtotal)||0;
    const desc = Number(venta?.descuento)||0;
    const iva = Number((venta?.iva ?? (venta?.iva || 0)));
    const total = Number(venta?.total)||0;
    const totalAbonos = (abonos||[]).reduce((s,a)=> s + (Number(a.monto)||0), 0);
    const saldo = Math.max(total - totalAbonos, 0);
    return { sub, desc, iva, total, totalAbonos, saldo };
  }, [venta, abonos]);

  if(!open) return null;

  const tipoVentaStr = (venta?.fpago===0? 'Contado' : venta?.fpago===1? 'Crédito' : venta?.fpago===2? 'Plan':'—');
  const formaPagoStr = (venta?.formapago===1? 'Efectivo' : venta?.formapago===2? 'Cheque' : venta?.formapago===3? 'Tarjeta' : venta?.formapago===4? 'Transferencia':'—');
  const fmtForma = (f) => (f===1?'Efectivo':f===2?'Cheque':f===3?'Tarjeta':f===4?'Transferencia':String(f||''));
  const comprobStr = (venta?.comprob==='F'? 'Factura' : 'Nota') + (venta?.numfactura? ` ${venta.numfactura}` : '');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg mt-10 w-[1000px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Detalle Venta #{idventa}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {venta && !loading && (
          <div className="flex flex-col">
            <div className="flex gap-2 px-4 pt-3 border-b bg-white">
              <TabButton active={tab==='resumen'} onClick={()=> setTab('resumen')}>Resumen</TabButton>
              <TabButton active={tab==='productos'} onClick={()=> setTab('productos')}>Productos</TabButton>
              <TabButton active={tab==='abonos'} onClick={()=> setTab('abonos')}>Abonos</TabButton>
              <TabButton active={tab==='cuotas'} onClick={()=> setTab('cuotas')}>Cuotas</TabButton>
              <TabButton active={tab==='devoluciones'} onClick={()=> setTab('devoluciones')}>Devoluciones</TabButton>
              <div className="flex-1" />
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
              {tab==='resumen' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-700">
                  <div><span className="font-medium">Venta #:</span> {String(venta.id)}</div>
                  <div><span className="font-medium">Fecha:</span> {String(venta.fecha||'').replace('T',' ').slice(0,19) || '—'}</div>
                  <div className="md:col-span-2"><span className="font-medium">Cliente:</span> {cliente? `${cliente.apellidos||''} ${cliente.nombres||''}`.trim() : (venta.idcliente||'—')}</div>
                  <div><span className="font-medium">Tipo:</span> {tipoVentaStr}</div>
                  <div><span className="font-medium">Forma pago:</span> {formaPagoStr}</div>
                  <div className="md:col-span-2"><span className="font-medium">Comprobante:</span> {comprobStr}</div>
                  <div><span className="font-medium">Subtotal:</span> ${formatMoney(totales.sub)}</div>
                  <div><span className="font-medium">Descuento:</span> ${formatMoney(totales.desc)}</div>
                  <div><span className="font-medium">IVA:</span> ${formatMoney(totales.iva)}</div>
                  <div><span className="font-medium">Total:</span> ${formatMoney(totales.total)}</div>
                  <div><span className="font-medium">Total abonos:</span> ${formatMoney(totales.totalAbonos)}</div>
                  <div><span className="font-medium">Saldo actual:</span> ${formatMoney(totales.saldo)}</div>
                  {resumenCuota && resumenCuota.valorCuota>0 && (
                    <>
                      <div><span className="font-medium">Valor cuota:</span> ${formatMoney(resumenCuota.valorCuota)} {resumenCuota.numCuotas?`(${resumenCuota.numCuotas})`:''}</div>
                      <div><span className="font-medium">Interés total:</span> ${formatMoney(resumenCuota.interesTotal)}</div>
                    </>
                  )}
                  {detallesFormaPago.length>0 && (
                    <div className="md:col-span-4">
                      <div className="mt-2 p-2 border rounded bg-gray-50">
                        <div className="font-semibold text-gray-700 mb-1">Detalle forma de pago</div>
                        {detallesFormaPago.map((d,i)=> (
                          <div key={`dfp-${i}`} className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px] border-t pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
                            <div><span className="text-gray-500">Forma:</span> {fmtForma(Number(d.formapago))}</div>
                            <div><span className="text-gray-500">Banco:</span> {d.banco||''}</div>
                            <div><span className="text-gray-500">Número:</span> {d.numcheque||''}</div>
                            <div><span className="text-gray-500">Fecha:</span> {String(d.fecha||'').slice(0,10)}</div>
                            <div><span className="text-gray-500">Cobrado:</span> {String(d.cobrado||'')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab==='productos' && (
                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Código</th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Descripción</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Cant.</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">P. U.</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.length===0 && <tr><td colSpan="5" className="text-center py-4 text-gray-400">Sin productos.</td></tr>}
                      {productos.map((p,i)=> (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{p.codprod}</td>
                          <td className="px-2 py-1">{p.descripcion||p.producto||''}</td>
                          <td className="px-2 py-1 text-right">{Number(p.cantidad)||0}</td>
                          <td className="px-2 py-1 text-right">{formatMoney(p.precio)}</td>
                          <td className="px-2 py-1 text-right">{formatMoney((Number(p.cantidad)||0) * (Number(p.precio)||0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab==='abonos' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px]">
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded"><div className="font-semibold text-blue-700">Total venta</div><div className="text-blue-800 text-sm">${formatMoney(totales.total)}</div></div>
                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded"><div className="font-semibold text-emerald-700">Total abonos</div><div className="text-emerald-800 text-sm">${formatMoney(totales.totalAbonos)}</div></div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded"><div className="font-semibold text-slate-700">Saldo actual</div><div className="text-slate-800 text-sm">${formatMoney(totales.saldo)}</div></div>
                    {resumenCuota && resumenCuota.valorCuota>0 && (
                      <>
                        <div className="p-2 bg-purple-50 border border-purple-100 rounded"><div className="font-semibold text-purple-700">Valor cuota</div><div className="text-purple-800 text-sm">${formatMoney(resumenCuota.valorCuota)} {resumenCuota.numCuotas?`(${resumenCuota.numCuotas})`:''}</div></div>
                        <div className="p-2 bg-amber-50 border border-amber-100 rounded"><div className="font-semibold text-amber-700">Interés total</div><div className="text-amber-800 text-sm">${formatMoney(resumenCuota.interesTotal)}</div></div>
                      </>
                    )}
                  </div>
                  <div className="border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-2 py-1 font-medium text-gray-600">Fecha</th>
                          <th className="text-right px-2 py-1 font-medium text-gray-600">Monto</th>
                          <th className="text-left px-2 py-1 font-medium text-gray-600">Forma de pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {abonos.length===0 && <tr><td colSpan="3" className="text-center py-4 text-gray-400">Sin abonos.</td></tr>}
                        {abonos.map(a=> (
                          <tr key={a.id} className="border-t">
                            <td className="px-2 py-1">{String(a.fecha||'').replace('T',' ').slice(0,19)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(a.monto)}</td>
                            <td className="px-2 py-1">{fmtForma(Number(a.formapago))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Detalle forma de pago se muestra solo en Resumen para evitar duplicación */}
                </div>
              )}

              {tab==='cuotas' && (
                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Item</th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Fecha</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Monto1</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Interés</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Saldo</th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Abono vinc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotas.length===0 && <tr><td colSpan="6" className="text-center py-4 text-gray-400">Sin cuotas.</td></tr>}
                      {(() => {
                        const orden = [...cuotas].sort((a,b)=> Number(a.item)-Number(b.item));
                        return orden.map((c, idx) => (
                          <tr key={`${c.item}-${idx}`} className="border-t">
                            <td className="px-2 py-1">{c.item}</td>
                            <td className="px-2 py-1">{String(c.fecha||'').replace('T',' ').slice(0,19)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(c.monto1)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(c.interes)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(c.monto2)}</td>
                            <td className="px-2 py-1">{c.idabono? `#${c.idabono}`:'—'}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleVentaModal;
