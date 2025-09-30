import React, { useEffect, useMemo, useRef, useState } from 'react';
import NuevaDevolucionVenta from './NuevaDevolucionVenta';
import NuevaDevolucionCompra from './NuevaDevolucionCompra';
import DetalleDevolucionModal from '../../components/DetalleDevolucionModal';
import DetalleDevolucionCompraModal from '../../components/DetalleDevolucionCompraModal';
import Modal from '../../components/Modal';
import { DevolucionVentaUI, DevolucionCompraUI } from '../../controllers/DevolucionesUIController';

function formatMoney(n){ const v = Number(n||0); return v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2}); }

const DevolucionesIndex = () => {
  const [lista, setLista] = useState([]);
  const [modo, setModo] = useState('ventas'); // 'ventas' | 'compras'
  const [desde, setDesde] = useState(() => new Date(new Date().setHours(0,0,0,0)).toISOString().slice(0,10));
  const [hasta, setHasta] = useState(() => new Date(new Date().setHours(23,59,59,999)).toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crearOpen, setCrearOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [modalState, setModalState] = useState({ isOpen:false, type:'info', title:'', message:'', onConfirm:null, onClose:null });
  const confirmResolverRef = useRef(null);

  const closeModal = () => setModalState(s => ({...s, isOpen:false}));
  const modalAlert = (message, title='Información') => new Promise((resolve)=>{
    setModalState({
      isOpen:true,
      type:'info',
      title,
      message,
      onConfirm: ()=> { closeModal(); resolve(true); },
      onClose: ()=> { closeModal(); resolve(true); }
    });
  });
  const modalConfirm = (message, title='Confirmación') => new Promise((resolve)=>{
    confirmResolverRef.current = resolve;
    setModalState({
      isOpen:true,
      type:'confirm',
      title,
      message,
      onConfirm: ()=> { closeModal(); resolve(true); },
      onClose: ()=> { closeModal(); resolve(false); }
    });
  });

  const cargar = async () => {
    try{
      setLoading(true); setError(null);
      const data = (modo==='ventas')
        ? await DevolucionVentaUI.listar({ desde, hasta })
        : await DevolucionCompraUI.listar({ desde, hasta });
      setLista(Array.isArray(data)? data : []);
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  };

  useEffect(()=> { cargar(); }, [modo]);

  // Handlers de menú nativo de Electron para esta ventana
  useEffect(() => {
    if(!window?.electronAPI?.onMenuAction) return;
    const remove = window.electronAPI.onMenuAction(async (action) => {
      if(action === 'devoluciones-actualizar') {
        await cargar();
      }
      if(action === 'devoluciones-modo-ventas') {
        setModo('ventas'); setSelectedSet(new Set()); setSelectedId(null);
      }
      if(action === 'devoluciones-modo-compras') {
        setModo('compras'); setSelectedSet(new Set()); setSelectedId(null);
      }
      if(action === 'devoluciones-ver-detalles') {
        if(selectedSet.size !== 1){ await modalAlert('Seleccione una sola devolución para ver detalles.', 'Información'); return; }
        setSelectedId(Array.from(selectedSet)[0]);
        setDetalleOpen(true);
      }
      if(action === 'devoluciones-eliminar-seleccion'){
        if(selectedSet.size === 0){ await modalAlert('Seleccione al menos una devolución para eliminar.', 'Información'); return; }
        await eliminarDevolucionesSeleccionadas();
      }
    });
    return () => { if(remove) remove(); };
  }, [selectedId, selectedSet, lista]);

  // Selecciones
  const toggleSeleccionTodo = () => {
    if (selectedSet.size === lista.length) {
      setSelectedSet(new Set());
    } else {
      setSelectedSet(new Set(lista.map(d => d.id)));
    }
  };
  const toggleSeleccionId = (id) => {
    const ns = new Set(selectedSet);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setSelectedSet(ns);
    setSelectedId(id);
  };

  // Eliminar devoluciones seleccionadas (revierte stock y borra cabecera/detalle)
  const eliminarDevolucionesSeleccionadas = async () => {
    if(selectedSet.size === 0) return;
    const ok = await modalConfirm(`¿Eliminar ${selectedSet.size} devolución(es) seleccionada(s)? Esto revertirá el stock.`, 'Confirmación');
    if(!ok) return;
    try{
      setLoading(true);
      try{
        if(modo==='ventas') await DevolucionVentaUI.eliminar(Array.from(selectedSet));
        else await DevolucionCompraUI.eliminar(Array.from(selectedSet));
      }catch(_){ /* continuar */ }
      setSelectedSet(new Set()); setSelectedId(null);
      await cargar();
      await modalAlert('Devolución(es) eliminada(s).', 'Información');
    } finally { setLoading(false); }
  };

  const totals = useMemo(()=>{
    const t = { subtotal:0, descuento:0, total:0 };
    for(const r of lista){ t.subtotal += Number(r.subtotal)||0; t.descuento += Number(r.descuento)||0; t.total += Number(r.total)||0; }
    return t;
  }, [lista]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Devoluciones ({modo==='ventas'?'Ventas':'Compras'})</h1>
        <div className="flex gap-2">
          <button onClick={()=> setCrearOpen(true)} className="bg-emerald-600 text-white text-sm px-3 py-1 rounded">Nueva devolución</button>
          <button onClick={cargar} className="bg-blue-600 text-white text-sm px-3 py-1 rounded" disabled={loading}>{loading? 'Cargando...' : 'Actualizar'}</button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input type="date" value={desde} onChange={e=> setDesde(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input type="date" value={hasta} onChange={e=> setHasta(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          </div>
          <button onClick={cargar} className="bg-blue-600 text-white text-sm px-3 py-1 rounded" disabled={loading}>{loading? 'Cargando...' : 'Aplicar filtros'}</button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="bg-white rounded border shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-center">
                  <input type="checkbox" checked={selectedSet.size === lista.length && lista.length>0} onChange={toggleSeleccionTodo} />
                </th>
                <th className="text-left px-2 py-1">#</th>
                <th className="text-left px-2 py-1">Fecha</th>
                <th className="text-left px-2 py-1">{modo==='ventas' ? 'Cliente' : 'Proveedor'}</th>
                <th className="text-right px-2 py-1">Subtotal</th>
                <th className="text-right px-2 py-1">Descuento</th>
                <th className="text-right px-2 py-1">Total</th>
                <th className="text-left px-2 py-1">FPago</th>
              </tr>
            </thead>
            <tbody>
              {lista.length===0 && (
                <tr><td className="px-2 py-3 text-center text-gray-500" colSpan={8}>Sin devoluciones.</td></tr>
              )}
              {lista.map(d => (
                <tr key={d.id} className={`border-t cursor-pointer ${selectedSet.has(d.id)? 'bg-blue-50':''}`} onClick={()=> toggleSeleccionId(d.id)}>
                  <td className="px-2 py-1 text-center align-middle" onClick={e=> e.stopPropagation()}>
                    <input type="checkbox" checked={selectedSet.has(d.id)} onChange={()=> toggleSeleccionId(d.id)} />
                  </td>
                  <td className="px-2 py-1">{d.id}</td>
                  <td className="px-2 py-1">{String(d.fecha).replace('T',' ').slice(0,19)}</td>
                  <td className="px-2 py-1">{modo==='compras' ? (d.proveedorNombre||d.tercero||'') : (d.tercero||'')}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(d.subtotal)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(d.descuento)}</td>
                  <td className="px-2 py-1 text-right">{formatMoney(d.total)}</td>
                  <td className="px-2 py-1">{Number(d.fpago)===1?'Efectivo':Number(d.fpago)===2?'Cheque':Number(d.fpago)===3?'Tarjeta':Number(d.fpago)===4?'Transferencia':'—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-2 py-2 font-semibold text-right" colSpan={7}>Total USD $ {formatMoney(totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {crearOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center overflow-auto z-50">
          <div className="bg-white rounded shadow-lg mt-10 w-[1000px] max-w-full">
            {modo==='ventas' ? (
              <NuevaDevolucionVenta onClose={()=> setCrearOpen(false)} onSaved={()=> { setCrearOpen(false); cargar(); }} />
            ) : (
              <NuevaDevolucionCompra onClose={()=> setCrearOpen(false)} onSaved={()=> { setCrearOpen(false); cargar(); }} />
            )}
          </div>
        </div>
      )}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onClose || (()=> setModalState(s=> ({...s, isOpen:false})))}
      />
      {/* Modal de detalle de devolución */}
      {modo==='ventas' ? (
        <DetalleDevolucionModal iddev={selectedId} open={!!selectedId && detalleOpen} onClose={()=> setDetalleOpen(false)} />
      ) : (
        <DetalleDevolucionCompraModal iddev={selectedId} open={!!selectedId && detalleOpen} onClose={()=> setDetalleOpen(false)} />
      )}
    </div>
  );
};

export default DevolucionesIndex;
