import React, { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
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
  const [busqueda, setBusqueda] = useState('');
  const [agrupar, setAgrupar] = useState(true);
  const [openPrint, setOpenPrint] = useState(false);
  useEffect(()=> { selectedRef.current = selected; }, [selected]);
  const { modalState, showAlert, showConfirm } = useModal();
  const modalAlert = async (message, title='Información') => { await showAlert(title, message); };
  const modalConfirm = async (message, title='Confirmación') => { try { return await showConfirm(message, title); } catch { return window.confirm(`${title}: ${message}`); } };

  const cargar = async () => {
    setLoading(true);
    const res = await reservaController.listarExtendido();
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
        modalAlert('Seleccione una reservación primero.', 'Información');
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
              if(!res.success || !res.data){ await modalAlert('No se pudo cargar la reservación', 'Error'); return; }
              const reserva = res.data;
              // Validar estado: solo se puede convertir si está activa
              const estado = (reserva.estado||'').toLowerCase();
              if(estado !== 'activa'){
                await modalAlert('Solo las reservaciones ACTIVAS pueden convertirse a venta. Estado actual: '+ reserva.estado, 'Operación no permitida');
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
              await modalAlert('Abriendo ventana de Ventas con datos de la reserva...', 'Información');
            } catch(e){
              console.error('Error preparando prefill reserva->venta', e);
              await modalAlert('Error preparando conversión: '+ e.message, 'Error');
            }
          });
          break;
        case 'menu-reserva-cancelar':
          requireSelected(async ()=> {
            try {
              const res = await reservaController.obtener(selectedRef.current);
              if(!res.success || !res.data){ await modalAlert('No se pudo cargar la reservación', 'Error'); return; }
              const estado = (res.data.estado||'').toLowerCase();
              if(estado !== 'activa'){
                await modalAlert('Solo las reservaciones ACTIVAS pueden cancelarse. Estado actual: '+ res.data.estado, 'Operación no permitida');
                return;
              }
              const ok = await modalConfirm('¿Cancelar esta reserva y devolver stock?', 'Confirmación');
              if(!ok) return;
              const r = await reservaController.cancelar({ id: selectedRef.current });
              if(!r.success){ await modalAlert(r.error||'Error al cancelar', 'Error'); return; }
              cargar();
            } catch(e){
              await modalAlert('Error: '+ e.message, 'Error');
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
      <div className="p-4 border-b bg-white flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-800 flex-1">Reservaciones</h1>
        <div className="flex items-center gap-2">
          <input value={busqueda} onChange={e=> setBusqueda(e.target.value)} placeholder="Buscar por nombre o cédula..." className="border rounded px-2 py-1 text-sm" />
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={agrupar} onChange={e=> setAgrupar(e.target.checked)} /> Agrupar
          </label>
          <button onClick={cargar} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Actualizar</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <ReservasTable 
            reservas={reservas}
            loading={loading}
            filtroEstado={filtroEstado}
            busqueda={busqueda}
            agrupar={agrupar}
            selected={selected}
            setSelected={setSelected}
          />
        </div>
      </div>
    </div>
    <DetalleReservaModal idReserva={selected} open={openDetalle && !!selected} initialTab={detalleInitialTab} onClose={()=> setOpenDetalle(false)} />
    <ConvertirReservaModal idReserva={selected} open={openConvertir && !!selected} onClose={()=> setOpenConvertir(false)} onConverted={(data)=> { setUltimaConversion(data); setOpenConvertir(false); cargar(); }} />
  <ReservaPrintModal idReserva={selected} open={openPrint && !!selected} onClose={()=> setOpenPrint(false)} />
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

export default ReservacionesView;

// Subcomponente tabla con agrupación
const ReservasTable = ({ reservas, loading, filtroEstado, busqueda, agrupar, selected, setSelected }) => {
  const normalizadas = React.useMemo(()=> {
    const texto = busqueda.trim().toLowerCase();
    return reservas.filter(r => {
      if(filtroEstado !== 'todas' && (r.estado||'').toLowerCase() !== filtroEstado) return false;
      if(texto){
        const ced = (r.cliente_cedula||'').toLowerCase();
        const nom = (r.cliente_nombre||'').toLowerCase();
        if(!(ced.includes(texto) || nom.includes(texto))) return false;
      }
      return true;
    });
  },[reservas, filtroEstado, busqueda]);

  const agrupados = React.useMemo(()=> {
    if(!agrupar) return [{ key:'__all', items: normalizadas }];
    const map = new Map();
    for(const r of normalizadas){
      const key = r.cliente_cedula || r.cliente_nombre || 'SIN_CLIENTE';
      if(!map.has(key)) map.set(key, { key, items:[], total:0, nombre: r.cliente_nombre, cedula: r.cliente_cedula });
      const g = map.get(key);
      g.items.push(r);
      g.total += Number(r.monto_reserva)||0;
    }
    return Array.from(map.values()).sort((a,b)=> (a.nombre||'').localeCompare(b.nombre||''));
  },[normalizadas, agrupar]);

  if(loading) return <div className="py-6 text-center text-gray-500 text-sm">Cargando...</div>;
  if(!loading && normalizadas.length===0) return <div className="py-6 text-center text-gray-500 text-sm">Sin reservaciones.</div>;

  return (
    <div className="divide-y">
          {agrupados.map(group => (
        <div key={group.key}>
          {agrupar && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                  <div className="font-medium text-gray-700 text-sm">Cliente: {group.nombre || 'Sin Nombre'} {group.cedula && <span className="text-gray-500 font-normal ml-1">({group.cedula})</span>}</div>
              <div className="text-xs text-gray-600">Reservas: {group.items.length} | Total Monto: {group.total.toFixed(2)}</div>
            </div>
          )}
          <table className="w-full text-xs">
            <thead className="bg-white">
              <tr className="text-gray-600">
                <th className="px-2 py-1 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
                    {!agrupar && <th className="px-2 py-1 text-left">Cliente</th>}
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Fecha Reservación</th>
                <th className="px-2 py-1 text-left">Fecha Evento</th>
                <th className="px-2 py-1 text-left">Descripción</th>
                <th className="px-2 py-1 text-right">Monto</th>
                <th className="px-2 py-1 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map(r => {
                const checked = selected === r.id;
                return (
                  <tr key={r.id} className={`border-t hover:bg-gray-50 ${checked?'bg-blue-50':''}`}>
                    <td className="px-2 py-1 text-center align-middle">
                      <input type="checkbox" checked={checked} onChange={()=> setSelected(checked? null : r.id)} />
                    </td>
                        {!agrupar && <td className="px-2 py-1 truncate max-w-[160px]" title={r.cliente_nombre}>{r.cliente_nombre || '—'} {r.cliente_cedula && <span className="text-gray-500 ml-1">({r.cliente_cedula})</span>}</td>}
                    <td className="px-2 py-1 font-mono">{r.id}</td>
                    <td className="px-2 py-1">{r.fecha_reservacion}</td>
                    <td className="px-2 py-1">{r.fecha_evento}</td>
                    <td className="px-2 py-1 truncate max-w-[160px]" title={r.descripcion}>{r.descripcion}</td>
                    <td className="px-2 py-1 text-right font-medium">{Number(r.monto_reserva).toFixed(2)}</td>
                    <td className="px-2 py-1">{r.estado}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};
