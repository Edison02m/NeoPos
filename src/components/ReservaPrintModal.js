import React, { useEffect, useState } from 'react';
import ReservaController from '../controllers/ReservaController';

const reservaController = new ReservaController();

// Imprime datos básicos de la reserva (snapshot). Para impresión real se podría usar window.print en otra ventana.
const ReservaPrintModal = ({ idReserva, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [reserva, setReserva] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [productos, setProductos] = useState([]);

  useEffect(()=>{
    const cargar = async () => {
      if(!open || !idReserva) return;
      setLoading(true);
      const r = await reservaController.obtener(idReserva);
      if(r.success && r.data){
        setReserva(r.data);
        if(r.data.cliente_id){
          try{ const c = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cod = ?', [r.data.cliente_id]); if(c.success) setCliente(c.data); } catch(_){ }
        }
        try { if(r.data.productos_json) setProductos(JSON.parse(r.data.productos_json)||[]); } catch(_){ setProductos([]); }
      }
      setLoading(false);
    };
    cargar();
  }, [open, idReserva]);

  if(!open) return null;

  const totalReservado = productos.reduce((acc,p)=> acc + (Number(p.cantidad)||0)*(Number(p.precio)||0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded shadow-lg w-full max-w-3xl mt-10 mb-10 animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Imprimir Reserva #{idReserva}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="p-5 text-sm">
          {loading && <div className="text-center text-gray-500 py-6">Cargando...</div>}
          {!loading && !reserva && <div className="text-center text-gray-500 py-6">No encontrada</div>}
          {!loading && reserva && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-500">Fecha Reservación</div>
                  <div className="font-medium text-gray-900">{reserva.fecha_reservacion}</div>
                </div>
                <div>
                  <div className="text-gray-500">Fecha Evento</div>
                  <div className="font-medium text-gray-900">{reserva.fecha_evento}</div>
                </div>
                <div>
                  <div className="text-gray-500">Estado</div>
                  <div className="font-medium text-gray-900 capitalize">{reserva.estado}</div>
                </div>
                <div>
                  <div className="text-gray-500">Monto Reserva (anticipo)</div>
                  <div className="font-semibold text-gray-900">{Number(reserva.monto_reserva||0).toFixed(2)}</div>
                </div>
              </div>
              <div className="border rounded p-3">
                <div className="text-gray-600 font-medium mb-1">Cliente</div>
                {cliente ? (
                  <div className="text-xs text-gray-800 space-y-0.5">
                    <div><span className="text-gray-500">Nombre: </span>{`${cliente.apellidos||''} ${cliente.nombres||''}`.trim()}</div>
                    <div><span className="text-gray-500">Cédula/RUC: </span>{cliente.cedula||'—'}</div>
                  </div>
                ) : <div className="text-xs text-gray-500">No asociado</div>}
              </div>
              <div>
                <div className="text-gray-600 font-medium mb-1">Productos</div>
                <div className="overflow-auto border rounded max-h-64">
                  <table className="min-w-full text-[11px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left px-2 py-1">Código</th>
                        <th className="text-left px-2 py-1">Nombre</th>
                        <th className="text-right px-2 py-1">Cantidad</th>
                        <th className="text-right px-2 py-1">Precio</th>
                        <th className="text-right px-2 py-1">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productos.map((p,i)=>{
                        const sub = (Number(p.cantidad)||0)*(Number(p.precio)||0);
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1 font-mono">{p.codigo}</td>
                            <td className="px-2 py-1 truncate max-w-[200px]">{p.nombre}</td>
                            <td className="px-2 py-1 text-right">{p.cantidad}</td>
                            <td className="px-2 py-1 text-right">{Number(p.precio||0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{sub.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-right text-xs text-gray-700 font-medium">Total referencial: {totalReservado.toFixed(2)}</div>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-3 border-t">
                <button onClick={onClose} className="px-3 py-1.5 text-xs rounded border">Cerrar</button>
                <button onClick={()=> window.print?.()} className="px-4 py-1.5 text-xs rounded bg-blue-600 text-white">Imprimir</button>
              </div>
            </div>
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

export default ReservaPrintModal;
