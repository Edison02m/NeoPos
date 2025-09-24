import React, { useEffect, useState } from 'react';
import ReservaController from '../controllers/ReservaController';

// NOTE: This modal is an initial scaffold. It will evolve once linking strategy (idventa) is finalized.
// For now it shows basic reserva data and placeholder sections for: Datos Cliente, Abonos (plan), Resumen.

const reservaController = new ReservaController();

const DetalleReservaModal = ({ idReserva, open, onClose, initialTab = 'resumen' }) => {
  const [loading, setLoading] = useState(false);
  const [reserva, setReserva] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [tab, setTab] = useState(initialTab);

  useEffect(()=> { if(open) setTab(initialTab); }, [open, initialTab]);

  const cargar = async () => {
    if(!idReserva) return;
    setLoading(true);
    const r = await reservaController.obtener(idReserva);
    if(r.success){
      const resv = r.data || null;
      setReserva(resv);
      // cargar cliente por cod (cliente_id) si existe
      if(resv?.cliente_id){
        try {
          const cliRes = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cod = ?', [resv.cliente_id]);
          if(cliRes.success) setCliente(cliRes.data);
        } catch(_){ /* ignore */ }
      }
    }
    setLoading(false);
  };

  useEffect(()=> { if(open) cargar(); }, [open, idReserva]);

  const montoReserva = Number(reserva?.monto_reserva||0);
  let productosReserva = [];
  try {
    if(reserva?.productos_json) productosReserva = JSON.parse(reserva.productos_json)||[];
  } catch(_) { productosReserva = []; }

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded shadow-lg w-full max-w-5xl mt-10 mb-10 animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Detalle Reservación #{idReserva || '—'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="px-4 pt-3">
          <div className="flex space-x-2 border-b mb-4">
            <button onClick={()=> setTab('resumen')} className={`px-3 py-2 text-sm border-b-2 ${tab==='resumen'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Resumen</button>
            <button onClick={()=> setTab('cliente')} className={`px-3 py-2 text-sm border-b-2 ${tab==='cliente'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Cliente</button>
          </div>
        </div>
        <div className="px-4 pb-6">
          {loading && <div className="p-6 text-center text-gray-500">Cargando...</div>}
          {!loading && !reserva && <div className="p-6 text-center text-gray-500">No se encontró la reservación.</div>}
          {!loading && reserva && (
            <>
              {tab==='resumen' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="text-gray-500">Fecha Reservación</div>
                      <div className="font-medium text-gray-900">{reserva.fecha_reservacion || '—'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="text-gray-500">Fecha Evento</div>
                      <div className="font-medium text-gray-900">{reserva.fecha_evento || '—'}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border">
                      <div className="text-gray-500">Monto reserva</div>
                      <div className="font-semibold text-gray-900">{montoReserva.toFixed(2)}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border col-span-2 md:col-span-1">
                      <div className="text-gray-500">Estado</div>
                      <div className="font-semibold text-gray-900 capitalize">{reserva.estado}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 italic">(Esta reservación aún no genera una venta; la venta se registra al entregar el producto.)</div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Productos reservados</div>
                    {productosReserva.length>0 ? (
                      <div className="overflow-auto border rounded">
                        <table className="min-w-full text-xs">
                          <thead className="bg-gray-100 text-gray-600">
                            <tr>
                              <th className="text-left px-2 py-1 font-medium">Código</th>
                              <th className="text-left px-2 py-1 font-medium">Nombre</th>
                              <th className="text-right px-2 py-1 font-medium">Cantidad</th>
                              <th className="text-right px-2 py-1 font-medium">Precio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosReserva.map((pr,i)=>(
                              <tr key={i} className="border-t last:border-b">
                                <td className="px-2 py-1 text-gray-800">{pr.codigo}</td>
                                <td className="px-2 py-1 text-gray-700 truncate max-w-[240px]">{pr.nombre}</td>
                                <td className="px-2 py-1 text-right text-gray-800">{pr.cantidad}</td>
                                <td className="px-2 py-1 text-right text-gray-800">{Number(pr.precio||0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-gray-800 text-sm whitespace-pre-wrap border rounded p-3 bg-white min-h-[60px]">{reserva.descripcion || '—'}</div>
                    )}
                  </div>
                </div>
              )}
              {tab==='cliente' && (
                <div className="p-4 text-sm text-gray-700 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Código Cliente</div>
                      <div className="font-medium">{reserva.cliente_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Cédula/RUC</div>
                      <div className="font-medium">{cliente?.cedula || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-gray-500 text-xs uppercase tracking-wide">Nombre</div>
                      <div className="font-medium">{cliente ? `${cliente.apellidos || ''} ${cliente.nombres || ''}`.trim() : '—'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">Datos cargados directamente. La venta se generará sólo al momento de la entrega.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
        .animate-fade-in { animation: fade-in .18s ease-out; }
      `}</style>
    </div>
  );
};

export default DetalleReservaModal;
