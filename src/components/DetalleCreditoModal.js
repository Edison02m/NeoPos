import React, { useEffect, useState } from 'react';
import CreditoController from '../controllers/CreditoController';

const controller = new CreditoController();

const TabButton = ({active, onClick, children}) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 ${active? 'border-blue-600 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
);

const DetalleCreditoModal = ({ idventa, open, onClose, initialTab = 'resumen' }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoGuardando, setAbonoGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(()=>{
    if(open && idventa){
      setLoading(true);
      setTab(initialTab);
      controller.detalleCredito(idventa).then(res=>{
        if(res.success) setData(res.data); else setError(res.error);
      }).finally(()=> setLoading(false));
    } else if(!open){
      setData(null);
      setTab('resumen');
      setError(null);
    }
  },[open, idventa, initialTab]);

  const registrarAbono = async () => {
    if(!data || !abonoMonto) return;
    setAbonoGuardando(true);
    try {
      const monto = parseFloat(abonoMonto)||0;
      if(monto<=0) throw new Error('Monto inválido');
      const res = await window.electronAPI.dbRun('INSERT INTO abono (idventa, fecha, monto, fpago, formapago, idusuario, trial272) VALUES (?,?,?,1,1,1,\'0\')',[idventa, new Date().toISOString().split('T')[0], monto]);
      if(!res.success) throw new Error(res.error||'No se pudo registrar abono');
      // Recalcular saldo restante: saldo actual - monto (no permitir negativo)
      try {
        const nuevoSaldo = Math.max((Number(data.credito.saldo)||0) - monto, 0);
        await window.electronAPI.dbRun('UPDATE credito SET saldo = ? WHERE idventa = ?', [nuevoSaldo, idventa]);
      } catch(e){ console.warn('No se pudo actualizar saldo crédito:', e); }
      const refreshed = await controller.detalleCredito(idventa);
      if(refreshed.success) setData(refreshed.data);
      setAbonoMonto('');
    } catch(e){ setError(e.message); }
    finally { setAbonoGuardando(false); }
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg mt-10 w-[1000px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Detalle Crédito #{idventa}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {data && !loading && (
          <div className="flex flex-col">
            <div className="flex gap-2 px-4 pt-3 border-b bg-white">
              <TabButton active={tab==='resumen'} onClick={()=> setTab('resumen')}>Resumen</TabButton>
              <TabButton active={tab==='productos'} onClick={()=> setTab('productos')}>Productos</TabButton>
              <TabButton active={tab==='abonos'} onClick={()=> setTab('abonos')}>Abonos</TabButton>
              <TabButton active={tab==='cuotas'} onClick={()=> setTab('cuotas')}>Cuotas</TabButton>
              <div className="flex-1" />
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
              {tab==='resumen' && (
                (() => {
                  const round2 = (n)=>{const x=Math.round((Number(n)||0)*100)/100;return x===0?0:x;};
                  let nombreCliente = '—';
                  if(data.cliente){
                    const ap = data.cliente.apellidos || '';
                    const no = data.cliente.nombres || '';
                    const full = `${ap} ${no}`.trim();
                    if(full) nombreCliente = full;
                  } else if(data.venta){
                    const ap = data.venta.apellidos || '';
                    const no = data.venta.nombres || '';
                    const full = `${ap} ${no}`.trim();
                    if(full) nombreCliente = full;
                  }
                  if(nombreCliente==='—' && data.meta?.clienteNombre){
                    nombreCliente = data.meta.clienteNombre;
                  }
                  if(nombreCliente==='—' && (data.venta?.idcliente || data.venta?.cedula)){
                    nombreCliente = data.venta.idcliente || data.venta.cedula;
                  }
                  const cuotaResumen = (data.cuotas||[]).find(c=> Number(c.item)===1) || null;
                  const numCuotas = cuotaResumen ? parseInt(cuotaResumen.trial275||'0',10)||0 : 0;
                  const abonosLista = (data.abonos||[]);
                  let abonoInicialMonto = 0; let totalAbonosPosteriores = 0;
                  if(cuotaResumen?.idabono){
                    const abIni = abonosLista.find(a=> String(a.id)===String(cuotaResumen.idabono));
                    if(abIni) abonoInicialMonto = Number(abIni.monto)||0;
                    totalAbonosPosteriores = abonosLista.filter(a=> String(a.id)!==String(cuotaResumen.idabono)).reduce((s,a)=> s + Number(a.monto||0),0);
                  } else if(abonosLista.length>1){
                    const orden = [...abonosLista].sort((a,b)=> (a.fecha||'').localeCompare(b.fecha||''));
                    abonoInicialMonto = Number(orden[0].monto)||0;
                    totalAbonosPosteriores = orden.slice(1).reduce((s,a)=> s + Number(a.monto||0),0);
                  } else {
                    totalAbonosPosteriores = abonosLista.reduce((s,a)=> s + Number(a.monto||0),0);
                  }
                  const interesTotal = cuotaResumen ? Number(cuotaResumen.interes||0) : 0;
                  const valorCuota = cuotaResumen ? Number(cuotaResumen.monto1||0) : 0; // valor cuota promedio registrado
                  // totalFinanciado almacenado en monto2 del resumen = (totalVenta - abonoInicial) + interesTotal
                  const totalFinanciadoResumen = cuotaResumen ? Number(cuotaResumen.monto2||0) : 0;
                  // totalVenta autoritativo desde data.venta.total si existe
                  let totalVenta = 0;
                  if(data.venta && data.venta.total!=null){
                    totalVenta = Number(data.venta.total)||0;
                  } else if(cuotaResumen){
                    totalVenta = round2(totalFinanciadoResumen + abonoInicialMonto - interesTotal);
                  } else if(data.credito){
                    // Fallback extremo: saldo + abonos + abonoInicial (sin interés)
                    const sumaAbonos = abonosLista.reduce((s,a)=> s + Number(a.monto||0),0);
                    totalVenta = round2(Number(data.credito.saldo||0) + sumaAbonos);
                  }
                  const deudaFinanciada = round2(Math.max(totalVenta - abonoInicialMonto,0)); // capital sobre el que se generan cuotas
                  const totalAbonos = round2(abonoInicialMonto + totalAbonosPosteriores); // incluye inicial
                  const saldoActualCalc = round2(Math.max(totalVenta - totalAbonos,0)); // pendiente total
                  const totalPagadoCalc = totalAbonos; // mostrado como total pagado (incluye inicial)
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                      <div><span className="font-medium">Venta #:</span> {data.credito.idventa}</div>
                      <div><span className="font-medium">Cliente:</span> {nombreCliente}</div>
                      <div><span className="font-medium">Plazo:</span> {data.credito.plazo} días</div>
                      <div><span className="font-medium">Total venta:</span> {totalVenta.toFixed(2)}</div>
                      <div><span className="font-medium">Abono inicial:</span> {abonoInicialMonto.toFixed(2)}</div>
                      <div><span className="font-medium">Deuda financiada (capital):</span> {deudaFinanciada.toFixed(2)}</div>
                      <div><span className="font-medium">Interés total:</span> {interesTotal.toFixed(2)}</div>
                      <div><span className="font-medium">Abonos posteriores:</span> {totalAbonosPosteriores.toFixed(2)}</div>
                      <div><span className="font-medium">Total pagado (incl. inicial):</span> {totalPagadoCalc.toFixed(2)}</div>
                      <div><span className="font-medium">Saldo actual:</span> {saldoActualCalc.toFixed(2)}</div>
                      {valorCuota>0 && <div><span className="font-medium">Valor cuota:</span> {valorCuota.toFixed(2)} {numCuotas?`(${numCuotas})`:''}</div>}
                    </div>
                  );
                })()
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
                      {data.productos.length===0 && <tr><td colSpan="5" className="text-center py-4 text-gray-400">Sin productos.</td></tr>}
                      {data.productos.map(p=> (
                        <tr key={p.codigo} className="border-t">
                          <td className="px-2 py-1">{p.codigo}</td>
                          <td className="px-2 py-1">{p.descripcion}</td>
                          <td className="px-2 py-1 text-right">{p.cantidad}</td>
                          <td className="px-2 py-1 text-right">{Number(p.precio).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{(p.cantidad* p.precio).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab==='abonos' && (
                (()=>{
                  const round2 = (n)=>{const x=Math.round((Number(n)||0)*100)/100;return x===0?0:x;};
                  const cuotaResumen = (data.cuotas||[]).find(c=> Number(c.item)===1) || null;
                  const numCuotas = cuotaResumen ? parseInt(cuotaResumen.trial275||'0',10)||0 : 0;
                  const abonosLista = (data.abonos||[]);
                  let abonoInicialMonto = 0; let totalAbonosPosteriores = 0;
                  if(cuotaResumen?.idabono){
                    const abIni = abonosLista.find(a=> String(a.id)===String(cuotaResumen.idabono));
                    if(abIni) abonoInicialMonto = Number(abIni.monto)||0;
                    totalAbonosPosteriores = abonosLista.filter(a=> String(a.id)!==String(cuotaResumen.idabono)).reduce((s,a)=> s + Number(a.monto||0),0);
                  } else if(abonosLista.length>1){
                    const orden = [...abonosLista].sort((a,b)=> (a.fecha||'').localeCompare(b.fecha||''));
                    abonoInicialMonto = Number(orden[0].monto)||0;
                    totalAbonosPosteriores = orden.slice(1).reduce((s,a)=> s + Number(a.monto||0),0);
                  } else {
                    totalAbonosPosteriores = abonosLista.reduce((s,a)=> s + Number(a.monto||0),0);
                  }
                  const interesTotal = cuotaResumen ? Number(cuotaResumen.interes||0) : 0;
                  const valorCuota = cuotaResumen ? Number(cuotaResumen.monto1||0) : 0; // valor de cada cuota
                  const totalFinanciadoResumen = cuotaResumen ? Number(cuotaResumen.monto2||0) : 0; // (totalVenta - abonoInicial)+interés
                  let totalVenta = 0;
                  if(data.venta && data.venta.total!=null){
                    totalVenta = Number(data.venta.total)||0;
                  } else if(cuotaResumen){
                    totalVenta = round2(totalFinanciadoResumen + abonoInicialMonto - interesTotal);
                  } else if(data.credito){
                    const sumaAbonos = abonosLista.reduce((s,a)=> s + Number(a.monto||0),0);
                    totalVenta = round2(Number(data.credito.saldo||0) + sumaAbonos);
                  }
                  const deudaFinanciada = round2(Math.max(totalVenta - abonoInicialMonto,0));
                  const totalPagado = round2(abonoInicialMonto + totalAbonosPosteriores); // incluye inicial
                  const saldoActualCalc = round2(Math.max(totalVenta - totalPagado,0));
                  const toleranciaCent = 0.02;
                  let cuotasPagadasAprox = 0;
                  if(valorCuota>0){
                    // Solo abonos posteriores cubren cuotas (regla de negocio solicitada)
                    cuotasPagadasAprox = Math.floor((totalAbonosPosteriores + toleranciaCent)/valorCuota);
                    if(cuotasPagadasAprox > numCuotas) cuotasPagadasAprox = numCuotas;
                  }
                  let cuotasRestantes = Math.max(numCuotas - cuotasPagadasAprox,0);
                  // if(restante <= toleranciaCent) cuotasRestantes = 0; // ya no se muestra restante
                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px]">
                        <div className="p-2 bg-blue-50 border border-blue-100 rounded"><div className="font-semibold text-blue-700">Total venta</div><div className="text-blue-800 text-sm">${totalVenta.toFixed(2)}</div></div>
                        <div className="p-2 bg-sky-50 border border-sky-100 rounded"><div className="font-semibold text-sky-700">Abono inicial</div><div className="text-sky-800 text-sm">${abonoInicialMonto.toFixed(2)}</div></div>
                        <div className="p-2 bg-fuchsia-50 border border-fuchsia-100 rounded"><div className="font-semibold text-fuchsia-700">Deuda financiada</div><div className="text-fuchsia-800 text-sm">${deudaFinanciada.toFixed(2)}</div></div>
                        <div className="p-2 bg-emerald-50 border border-emerald-100 rounded"><div className="font-semibold text-emerald-700">Abonos posteriores</div><div className="text-emerald-800 text-sm">${totalAbonosPosteriores.toFixed(2)}</div></div>
                        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded"><div className="font-semibold text-indigo-700">Total pagado</div><div className="text-indigo-800 text-sm">${totalPagado.toFixed(2)}</div></div>
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded"><div className="font-semibold text-slate-700">Saldo actual</div><div className="text-slate-800 text-sm">${saldoActualCalc.toFixed(2)}</div></div>
                        <div className="p-2 bg-amber-50 border border-amber-100 rounded"><div className="font-semibold text-amber-700">Interés total</div><div className="text-amber-800 text-sm">${interesTotal.toFixed(2)}</div></div>
                        <div className="p-2 bg-purple-50 border border-purple-100 rounded"><div className="font-semibold text-purple-700">Valor cuota</div><div className="text-purple-800 text-sm">{valorCuota>0?'$'+valorCuota.toFixed(2):'—'}{numCuotas?` (${numCuotas})`:''}</div></div>
                        {/* Tarjeta 'Restante' removida */}
                        <div className="p-2 bg-indigo-50 border border-indigo-100 rounded"><div className="font-semibold text-indigo-700">Cuotas restantes</div><div className="text-indigo-800 text-sm">{cuotasRestantes||'—'}</div></div>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex flex-col">
                          <label className="text-[11px] font-medium text-gray-600">Nuevo abono</label>
                          <input value={abonoMonto} onChange={e=> setAbonoMonto(e.target.value)} type="number" min="0" step="0.01" className="px-2 py-1 border rounded text-xs w-32" />
                        </div>
                        <button disabled={abonoGuardando} onClick={registrarAbono} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">{abonoGuardando? 'Guardando...':'Registrar'}</button>
                      </div>
                      <div className="border rounded">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-2 py-1 font-medium text-gray-600">Fecha</th>
                              <th className="text-right px-2 py-1 font-medium text-gray-600">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.abonos.length===0 && <tr><td colSpan="2" className="text-center py-4 text-gray-400">Sin abonos.</td></tr>}
                            {data.abonos.map(a=> (
                              <tr key={a.id} className="border-t">
                                <td className="px-2 py-1">{a.fecha}</td>
                                <td className="px-2 py-1 text-right">{Number(a.monto).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
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
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Monto2</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Abonos acum.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cuotas.length===0 && <tr><td colSpan="6" className="text-center py-4 text-gray-400">Sin cuotas.</td></tr>}
                          {(() => {
                            // Mostrar solo filas detalle (excluir resumen item=1) y renumerar visualmente
                            const cuotasOrdenadas = [...data.cuotas].sort((a,b)=> Number(a.item)-Number(b.item));
                            const resumenRow = cuotasOrdenadas.find(c=> Number(c.item)===1) || null;
                            const detalle = cuotasOrdenadas.filter(c=> Number(c.item)!==1);
                            // Valor cuota teórico (promedio) desde resumen
                            const valorCuotaRef = resumenRow ? Number(resumenRow.monto1||0) : 0;
                            // Abonos ordenados cronológicamente EXCLUYENDO abono inicial para cálculo de cumplimiento de cuotas
                            let abonoInicialId = resumenRow?.idabono? String(resumenRow.idabono) : null;
                            const abonosFiltrados = (data.abonos||[]).filter(a=> !abonoInicialId || String(a.id)!==abonoInicialId);
                            const abonosOrdenados = [...abonosFiltrados].sort((a,b)=> (a.fecha||'').localeCompare(b.fecha||''));
                            // Progresión: ir sumando y cuando pase múltiplos de valorCuotaRef se marca fecha cuota
                            let acumulado = 0;
                            const fechasCuota = [];// fecha real (abono que completó)
                            if(valorCuotaRef>0){
                              let objetivoIndex = 1; // cuota que buscamos completar
                              for(const ab of abonosOrdenados){
                                acumulado += Number(ab.monto)||0;
                                // Mientras se complete una o más cuotas con este abono
                                while(acumulado + 0.001 >= (valorCuotaRef * objetivoIndex) && objetivoIndex <= detalle.length){
                                  fechasCuota[objetivoIndex-1] = (ab.fecha||'').substring(0,10) || new Date().toISOString().substring(0,10);
                                  objetivoIndex++;
                                }
                                if(objetivoIndex > detalle.length) break;
                              }
                            }
                            // Para acumulado mostrado por fila: valorCuotaRef * número de cuota (limitado por acumulado real + tolerancia)
                            const acumuladoReal = acumulado;
                            return detalle.map((c,idx)=>{
                              const cuotaNumero = idx+1;
                              const teoricoHasta = valorCuotaRef * cuotaNumero;
                              let abonadoHasta = Math.min(teoricoHasta, acumuladoReal);
                              if(abonadoHasta < 0) abonadoHasta = 0;
                              const fechaReal = fechasCuota[idx] || '—';
                              return (
                                <tr key={c.item} className="border-t">
                                  <td className="px-2 py-1">{cuotaNumero}</td>
                                  <td className="px-2 py-1 text-xs">{fechaReal}</td>
                                  <td className="px-2 py-1 text-right">{Number(c.monto1||0).toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right">{Number(c.interes||0).toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right">{Number(c.monto2||0).toFixed(2)}</td>
                                  <td className="px-2 py-1 text-right">{abonadoHasta.toFixed(2)}</td>
                                </tr>
                              );
                            })
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

export default DetalleCreditoModal;
