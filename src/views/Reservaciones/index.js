import React, { useEffect, useRef, useState } from 'react';
import ReservaController from '../../controllers/ReservaController';
import DetalleReservaModal from '../../components/DetalleReservaModal';
import ConvertirReservaModal from '../../components/ConvertirReservaModal';
import ReservaPrintModal from '../../components/ReservaPrintModal';

const reservaController = new ReservaController();

const ReservacionesView = () => {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalleInitialTab, setDetalleInitialTab] = useState('resumen');
  const [openConvertir, setOpenConvertir] = useState(false);
  const [ultimaConversion, setUltimaConversion] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todas'); // Estados: activa | completada | cancelada | (todas)
  const [openPrint, setOpenPrint] = useState(false);
  useEffect(()=> { selectedRef.current = selected; }, [selected]);

  const cargar = async () => {
    setLoading(true);
    const res = await reservaController.listar();
    if(res.success) setReservas(res.data||[]);
    setLoading(false);
  };

  useEffect(()=>{ cargar(); },[]);

  // Escuchar evento global de refresh de reservas
  useEffect(()=>{
    if(!window.electronAPI?.reservas?.onRefresh) return;
    const off = window.electronAPI.reservas.onRefresh(()=>{
      cargar();
    });
    return ()=> { try { off?.(); } catch(_){ } };
  },[]);

  useEffect(()=>{
    if(!window.electronAPI?.onMenuAction) return;
    const requireSelected = (fn) => {
      if(!selectedRef.current){
        alert('Seleccione una reservación primero.');
        return;
      }
      fn();
    };
    const off = window.electronAPI.onMenuAction(action => {
      switch(action){
        case 'menu-reserva-ver-datos-cliente':
          requireSelected(()=> { setDetalleInitialTab('cliente'); setOpenDetalle(true); });
          break;
        case 'menu-reserva-ver-detalle':
          requireSelected(()=> { setDetalleInitialTab('resumen'); setOpenDetalle(true); });
          break;
        case 'menu-reserva-convertir':
          requireSelected(async ()=> {
            try {
              // Obtener reserva completa para snapshot de productos
              const res = await reservaController.obtener(selectedRef.current);
              if(!res.success || !res.data){ alert('No se pudo cargar la reservación'); return; }
              const reserva = res.data;
              // Validar estado: solo se puede convertir si está activa
              const estado = (reserva.estado||'').toLowerCase();
              if(estado !== 'activa'){
                alert('Solo las reservaciones ACTIVAS pueden convertirse a venta. Estado actual: '+ reserva.estado);
                return;
              }
              let productos = [];
              try { if(reserva.productos_json) productos = JSON.parse(reserva.productos_json)||[]; } catch(_){ productos=[]; }
              // Guardar en localStorage para que la ventana de ventas lo recoja
              const payload = {
                reservaId: reserva.id,
                clienteCod: reserva.cliente_id || null,
                descripcion: reserva.descripcion || '',
                montoReserva: Number(reserva.monto_reserva||0),
                productos: productos.map(p => ({ codigo: p.codigo, cantidad: Number(p.cantidad)||0 }))
              };
              localStorage.setItem('__VENTA_PREFILL_RESERVA', JSON.stringify(payload));
              // Abrir ventana de ventas
              await window.electronAPI.openVentasWindow();
              // Mensaje de feedback
              alert('Abriendo ventana de Ventas con datos de la reserva...');
            } catch(e){
              console.error('Error preparando prefill reserva->venta', e);
              alert('Error preparando conversión: '+ e.message);
            }
          });
          break;
        case 'menu-reserva-cancelar':
          requireSelected(async ()=> {
            try {
              const res = await reservaController.obtener(selectedRef.current);
              if(!res.success || !res.data){ alert('No se pudo cargar la reservación'); return; }
              const estado = (res.data.estado||'').toLowerCase();
              if(estado !== 'activa'){
                alert('Solo las reservaciones ACTIVAS pueden cancelarse. Estado actual: '+ res.data.estado);
                return;
              }
              if(!window.confirm('¿Cancelar esta reserva y devolver stock?')) return;
              const r = await reservaController.cancelar({ id: selectedRef.current });
              if(!r.success){ alert(r.error||'Error al cancelar'); return; }
              cargar();
            } catch(e){
              alert('Error: '+ e.message);
            }
          });
          break;
        case 'menu-reserva-imprimir':
          requireSelected(()=> setOpenPrint(true));
          break;
        case 'menu-reserva-filtrar-todas': setFiltroEstado('todas'); break;
        case 'menu-reserva-filtrar-activas': setFiltroEstado('activa'); break;
        case 'menu-reserva-filtrar-completadas': setFiltroEstado('completada'); break;
        case 'menu-reserva-filtrar-canceladas': setFiltroEstado('cancelada'); break;
        default:
          break;
      }
    });
    return () => { try { off?.(); } catch(_){} };
  },[]);

  return (
    <>
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
                <th className="px-2 py-2 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
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
              {loading && <tr><td colSpan="8" className="text-center py-6 text-gray-500">Cargando...</td></tr>}
              {!loading && reservas.length===0 && <tr><td colSpan="8" className="text-center py-6 text-gray-500">Sin reservaciones.</td></tr>}
              {reservas.filter(r => {
                if(filtroEstado==='todas') return true;
                return (r.estado||'').toLowerCase() === filtroEstado;
              }).map(r => {
                const checked = selected===r.id;
                return (
                <tr key={r.id} className={`border-t hover:bg-gray-50 ${checked?'bg-blue-50':''}`}>
                  <td className="px-2 py-2 text-center align-middle">
                    <input type="checkbox" checked={checked} onChange={()=> setSelected(checked? null : r.id)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-800">{r.id}</td>
                  <td className="px-3 py-2 text-gray-700">{r.cliente_id}</td>
                  <td className="px-3 py-2 text-gray-700">{r.fecha_reservacion}</td>
                  <td className="px-3 py-2 text-gray-700">{r.fecha_evento}</td>
                  <td className="px-3 py-2 text-gray-700 truncate max-w-xs" title={r.descripcion}>{r.descripcion}</td>
                  <td className="px-3 py-2 text-right text-gray-900 font-medium">{Number(r.monto_reserva).toFixed(2)}</td>
                  <td className="px-3 py-2 text-gray-700">{r.estado}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <DetalleReservaModal idReserva={selected} open={openDetalle && !!selected} initialTab={detalleInitialTab} onClose={()=> setOpenDetalle(false)} />
    <ConvertirReservaModal idReserva={selected} open={openConvertir && !!selected} onClose={()=> setOpenConvertir(false)} onConverted={(data)=> { setUltimaConversion(data); setOpenConvertir(false); cargar(); }} />
  <ReservaPrintModal idReserva={selected} open={openPrint && !!selected} onClose={()=> setOpenPrint(false)} />
    </>
  );
};

export default ReservacionesView;
