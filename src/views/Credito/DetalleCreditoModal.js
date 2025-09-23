import React, { useEffect, useState } from 'react';
import CreditoController from '../../controllers/CreditoController';

const controller = new CreditoController();

const TabButton = ({active, onClick, children}) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 ${active? 'border-blue-600 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
);

const DetalleCreditoModal = ({ idventa, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('resumen');
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoGuardando, setAbonoGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(()=>{
    if(open && idventa){
      setLoading(true);
      controller.detalleCredito(idventa).then(res=>{
        if(res.success) setData(res.data); else setError(res.error);
      }).finally(()=> setLoading(false));
    } else if(!open){
      setData(null);
      setTab('resumen');
      setError(null);
    }
  },[open, idventa]);

  const registrarAbono = async () => {
    if(!data || !abonoMonto) return;
    setAbonoGuardando(true);
    try {
      const monto = parseFloat(abonoMonto)||0;
      if(monto<=0) throw new Error('Monto inválido');
      // Intentar insertar en tabla abono (legacy)
      const res = await window.electronAPI.dbRun('INSERT INTO abono (idventa, fecha, monto, fpago, formapago, idusuario, trial272) VALUES (?,?,?,1,1,1,\'0\')',[idventa, new Date().toISOString().split('T')[0], monto]);
      if(!res.success) throw new Error(res.error||'No se pudo registrar abono');
      // Refrescar
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
            {/* Tabs */}
            <div className="flex gap-2 px-4 pt-3 border-b bg-white">
              <TabButton active={tab==='resumen'} onClick={()=> setTab('resumen')}>Resumen</TabButton>
              <TabButton active={tab==='productos'} onClick={()=> setTab('productos')}>Productos</TabButton>
              <TabButton active={tab==='abonos'} onClick={()=> setTab('abonos')}>Abonos</TabButton>
              <TabButton active={tab==='cuotas'} onClick={()=> setTab('cuotas')}>Cuotas</TabButton>
              <div className="flex-1" />
            </div>
            {/* Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
              {tab==='resumen' && (
                (()=>{
                  // Construir nombre de cliente priorizando data.cliente (controller) y luego venta, luego crédito
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
                  // Fallback a idcliente / cedula
                  if(nombreCliente==='—' && data.meta?.clienteNombre){
                    nombreCliente = data.meta.clienteNombre;
                  }
                  if(nombreCliente==='—' && (data.venta?.idcliente || data.venta?.cedula)) nombreCliente = data.venta.idcliente || data.venta.cedula;
                  return (
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div><span className="font-medium">Venta:</span> {data.credito.idventa}</div>
                      <div><span className="font-medium">Plazo:</span> {data.credito.plazo} días</div>
                      <div><span className="font-medium">Saldo:</span> {Number(data.credito.saldo).toFixed(2)}</div>
                      <div><span className="font-medium">Cliente:</span> {nombreCliente}</div>
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
                <div className="space-y-3">
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
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Abono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cuotas.length===0 && <tr><td colSpan="6" className="text-center py-4 text-gray-400">Sin cuotas.</td></tr>}
                      {data.cuotas.map(c=> (
                        <tr key={c.item} className="border-t">
                          <td className="px-2 py-1">{c.item}</td>
                          <td className="px-2 py-1">{c.fecha}</td>
                          <td className="px-2 py-1 text-right">{Number(c.monto1||0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{Number(c.interes||0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{Number(c.monto2||0).toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{Number(c.idabono||0).toFixed(2)}</td>
                        </tr>
                      ))}
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
