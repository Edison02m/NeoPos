import React, { useEffect, useState } from 'react';
import ReservaController from '../../controllers/ReservaController';

const reservaController = new ReservaController();

const ReservacionesView = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const cargar = async () => {
    setLoading(true);
    const res = await reservaController.listar();
    if(res.success) setReservas(res.data||[]);
    setLoading(false);
  };

  useEffect(()=>{ cargar(); },[]);

  useEffect(()=>{
    if(!window.electronAPI?.onMenuAction) return;
    const off = window.electronAPI.onMenuAction(action => {
      switch(action){
        case 'menu-reserva-registrar-abono':
          // TODO: abrir modal registrar abono
          break;
        case 'menu-reserva-ver-datos-cliente':
          // TODO: mostrar datos cliente
          break;
        case 'menu-reserva-ver-detalle':
          // TODO: mostrar detalle reserva
          break;
        case 'menu-reserva-ver-abonos':
          // TODO: mostrar abonos
          break;
        case 'menu-reserva-filtrar-activas':
        case 'menu-reserva-filtrar-completadas':
          // Filtro futuro
          break;
        default:
          break;
      }
    });
    return () => { try { off?.(); } catch(_){} };
  },[]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Reservaciones</h1>
        <button onClick={cargar} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Actualizar</button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">ID</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Cliente</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Fecha Reservación</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Fecha Evento</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Descripción</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Monto</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="text-center py-6 text-gray-500">Cargando...</td></tr>}
              {!loading && reservas.length===0 && <tr><td colSpan="7" className="text-center py-6 text-gray-500">Sin reservaciones.</td></tr>}
              {reservas.map(r => (
                <tr key={r.id} className={`border-t hover:bg-gray-50 cursor-pointer ${selected===r.id?'bg-blue-50':''}`} onClick={()=> setSelected(r.id)}>
                  <td className="px-3 py-2 font-mono text-gray-800">{r.id}</td>
                  <td className="px-3 py-2 text-gray-700">{r.cliente_id}</td>
                  <td className="px-3 py-2 text-gray-700">{r.fecha_reservacion}</td>
                  <td className="px-3 py-2 text-gray-700">{r.fecha_evento}</td>
                  <td className="px-3 py-2 text-gray-700 truncate max-w-xs" title={r.descripcion}>{r.descripcion}</td>
                  <td className="px-3 py-2 text-right text-gray-900 font-medium">{Number(r.monto_reserva).toFixed(2)}</td>
                  <td className="px-3 py-2 text-gray-700">{r.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReservacionesView;
