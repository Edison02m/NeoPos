import React, { useEffect, useState, useMemo } from 'react';
import CreditoController from '../controllers/CreditoController';

const controller = new CreditoController();

// Modal de pre-impresión de crédito
// Props: idventa, open, onClose
const CreditoPrintModal = ({ idventa, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(()=>{
    if(open && idventa){
      setLoading(true);
      controller.detalleCredito(idventa).then(res=>{
        if(res.success) setData(res.data); else setError(res.error);
      }).finally(()=> setLoading(false));
    } else if(!open){
      setData(null); setError(null);
    }
  },[open, idventa]);

  const metrics = useMemo(()=>{
    if(!data) return null;
    const cuotaResumen = (data.cuotas||[]).find(c=> Number(c.item)===1) || null;
    const abonosLista = data.abonos||[];
    let abonoInicialMonto=0; let totalAbonosPosteriores=0;
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
    const interesTotal = cuotaResumen? Number(cuotaResumen.interes||0):0;
    const totalFinanciadoResumen = cuotaResumen? Number(cuotaResumen.monto2||0):0; // (totalVenta-abonoInicial)+interes
    let totalVenta = 0;
    if(data.venta && data.venta.total!=null){ totalVenta = Number(data.venta.total)||0; }
    else if(cuotaResumen){ totalVenta = (totalFinanciadoResumen + abonoInicialMonto - interesTotal); }
    const deudaFinanciada = Math.max(totalVenta - abonoInicialMonto,0);
    const totalPagado = abonoInicialMonto + totalAbonosPosteriores;
    const saldoActual = Math.max(totalVenta - totalPagado,0);
    // Cuotas pagadas (solo posterior)
    const valorCuota = cuotaResumen? Number(cuotaResumen.monto1||0):0;
    let cuotasPagadas = 0;
    if(valorCuota>0){ cuotasPagadas = Math.floor((totalAbonosPosteriores + 0.02)/valorCuota); }
    return { totalVenta, abonoInicialMonto, totalAbonosPosteriores, interesTotal, deudaFinanciada, totalPagado, saldoActual, cuotasPagadas, numCuotas: cuotaResumen? parseInt(cuotaResumen.trial275||'0',10)||0 : 0, valorCuota };
  },[data]);

  const handlePrint = ()=> { window.print(); };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto print:hidden">
      <div className="bg-white rounded-lg shadow-lg mt-6 w-[900px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Previsualización Crédito #{idventa}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} disabled={loading || !data} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Imprimir</button>
            <button onClick={onClose} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded">Cerrar</button>
          </div>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="p-4 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {data && metrics && (
          <div className="p-6 space-y-6" id="credito-print-area">
            {/* Encabezado */}
            <div className="text-center border-b pb-4">
              <h1 className="text-xl font-bold text-gray-800">CRÉDITO DE CLIENTE</h1>
              <p className="text-xs text-gray-500">Generado: {new Date().toISOString().substring(0,10)}</p>
            </div>

            {/* Datos principales */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-700">Cliente</h3>
                <p><span className="font-medium">Nombre:</span> {data.meta?.clienteNombre || '—'}</p>
                <p><span className="font-medium">Cédula:</span> {data.venta?.cedula || data.venta?.idcliente || '—'}</p>
                <p><span className="font-medium">Teléfono:</span> {data.cliente?.telefono || '—'}</p>
                <p><span className="font-medium">Dirección:</span> {data.cliente?.direccion || '—'}</p>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-700">Crédito</h3>
                <p><span className="font-medium">Venta #:</span> {data.credito.idventa}</p>
                <p><span className="font-medium">Fecha Venta:</span> {data.venta?.fecha?.substring(0,10) || '—'}</p>
                <p><span className="font-medium">Plazo:</span> {data.credito.plazo} días</p>
                <p><span className="font-medium">Cuotas:</span> {metrics.numCuotas} (Valor: {metrics.valorCuota.toFixed(2)})</p>
              </div>
            </div>

            {/* Métricas financieras */}
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="border rounded p-2 bg-blue-50"><div className="font-semibold">Total venta</div><div>${metrics.totalVenta.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-sky-50"><div className="font-semibold">Abono inicial</div><div>${metrics.abonoInicialMonto.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-fuchsia-50"><div className="font-semibold">Deuda financiada</div><div>${metrics.deudaFinanciada.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-amber-50"><div className="font-semibold">Interés total</div><div>${metrics.interesTotal.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-emerald-50"><div className="font-semibold">Abonos posteriores</div><div>${metrics.totalAbonosPosteriores.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-indigo-50"><div className="font-semibold">Total pagado</div><div>${metrics.totalPagado.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-slate-50"><div className="font-semibold">Saldo actual</div><div>${metrics.saldoActual.toFixed(2)}</div></div>
              <div className="border rounded p-2 bg-purple-50"><div className="font-semibold">Cuotas pagadas</div><div>{metrics.cuotasPagadas}/{metrics.numCuotas}</div></div>
              <div className="border rounded p-2 bg-orange-50"><div className="font-semibold">Estado</div><div>{metrics.saldoActual<=0.01? 'CANCELADO':'PENDIENTE'}</div></div>
            </div>

            {/* Cuotas */}
            <div>
              <h3 className="text-xs font-semibold mb-2 text-gray-700">Cuotas</h3>
              <table className="w-full text-[11px] border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left border">#</th>
                    <th className="px-2 py-1 text-left border">Fecha</th>
                    <th className="px-2 py-1 text-right border">Valor</th>
                    <th className="px-2 py-1 text-right border">Interés</th>
                    <th className="px-2 py-1 text-right border">Saldo cuota</th>
                    <th className="px-2 py-1 text-center border">Pagada</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cuotas.filter(c=> Number(c.item)!==1).map((c,i)=> (
                    <tr key={c.item} className="border-t">
                      <td className="px-2 py-1 border">{i+1}</td>
                      <td className="px-2 py-1 border">{(c.fecha||'').substring(0,10)}</td>
                      <td className="px-2 py-1 border text-right">{Number(c.monto1||0).toFixed(2)}</td>
                      <td className="px-2 py-1 border text-right">{Number(c.interes||0).toFixed(2)}</td>
                      <td className="px-2 py-1 border text-right">{Number(c.monto2||0).toFixed(2)}</td>
                      <td className="px-2 py-1 border text-center">{(i+1)<=metrics.cuotasPagadas? '✔':''}</td>
                    </tr>
                  ))}
                  {data.cuotas.filter(c=> Number(c.item)!==1).length===0 && <tr><td colSpan="6" className="text-center text-gray-400 py-3">Sin cuotas.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Abonos */}
            <div>
              <h3 className="text-xs font-semibold mb-2 text-gray-700">Abonos</h3>
              <table className="w-full text-[11px] border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left border">Fecha</th>
                    <th className="px-2 py-1 text-right border">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.abonos.map(a=> (
                    <tr key={a.id} className="border-t">
                      <td className="px-2 py-1 border">{a.fecha}</td>
                      <td className="px-2 py-1 border text-right">{Number(a.monto).toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.abonos.length===0 && <tr><td colSpan="2" className="text-center text-gray-400 py-3">Sin abonos.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-gray-500 pt-4 border-t">
              Documento generado electrónicamente el {new Date().toLocaleString()}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditoPrintModal;
