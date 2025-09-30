import React, { useEffect, useMemo, useState, useRef } from 'react';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
import CreditoController from '../../controllers/CreditoController';
import DetalleCreditoModal from '../../components/DetalleCreditoModal';
import CreditoPrintModal from '../../components/CreditoPrintModal';

const creditoController = new CreditoController();

const CreditoView = () => {
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalleInitialTab, setDetalleInitialTab] = useState('resumen');
  const [filtroFecha, setFiltroFecha] = useState(null); // 'hoy' | '30'
  const [filtroSaldo, setFiltroSaldo] = useState(null); // 'pendiente' | 'cancelado'
  const [busqueda, setBusqueda] = useState(''); // busca por nombre o cédula
  const [agrupar, setAgrupar] = useState(true); // agrupar por cliente
  const [openPrint, setOpenPrint] = useState(false);
  const { modalState, showAlert } = useModal();

  const modalAlert = async (message, title = 'Información') => {
    try { await showAlert(message, title); } catch { alert(`${title}: ${message}`); }
  };

  const cargar = async () => {
    setLoading(true);
    const res = await creditoController.listarExtendido();
    if(res.success) setCreditos(res.data||[]);
    setLoading(false);
  };

  useEffect(()=>{ cargar(); },[]);
  useEffect(()=>{ selectedRef.current = selected; }, [selected]);

  const hoyStr = useMemo(()=> new Date().toISOString().split('T')[0], []);

  const creditosFiltrados = useMemo(()=> {
    const texto = busqueda.trim().toLowerCase();
    return creditos.filter(c => {
      let ok = true;
      if(filtroFecha === 'hoy') ok = ok && c.fecha === hoyStr;
      if(filtroFecha === '30') {
        if(c.fecha){
          const fechaC = new Date(c.fecha);
          const diff = (Date.now() - fechaC.getTime())/ (1000*60*60*24);
          ok = ok && diff <= 30;
        } else ok = false;
      }
      if(filtroSaldo === 'pendiente') ok = ok && Number(c.saldo) > 0.009;
      if(filtroSaldo === 'cancelado') ok = ok && Number(c.saldo) <= 0.009;
      if(texto){
        const nombre = (c.cliente||'').toLowerCase();
        const ced = (c.cedula||'').toLowerCase();
        ok = ok && (nombre.includes(texto) || ced.includes(texto));
      }
      return ok;
    });
  },[creditos, filtroFecha, filtroSaldo, hoyStr, busqueda]);

  const creditosAgrupados = useMemo(()=> {
    if(!agrupar) return [ { key:'__flat__', items: creditosFiltrados } ];
    const map = new Map();
    for(const c of creditosFiltrados){
      const key = c.cedula || c.cliente || 'SIN CLIENTE';
      if(!map.has(key)) map.set(key, { key, cliente: c.cliente, cedula: c.cedula, totalSaldo:0, items:[] });
      const g = map.get(key);
      g.items.push(c);
      g.totalSaldo += Number(c.saldo)||0;
    }
    return Array.from(map.values()).sort((a,b)=> a.cliente.localeCompare(b.cliente));
  },[creditosFiltrados, agrupar]);

  useEffect(()=>{
    if(!window.electronAPI?.onMenuAction) return;
    const requireSelected = (fn) => {
      if(!selectedRef.current){
        modalAlert('Seleccione un crédito primero.', 'Información');
        return;
      }
      fn();
    };
    const off = window.electronAPI.onMenuAction(action => {
      switch(action){
        case 'menu-credito-registrar-abono':
          requireSelected(()=> { setDetalleInitialTab('abonos'); setOpenDetalle(true); });
          break;
        case 'menu-credito-ver-datos-cliente':
          requireSelected(()=> { setDetalleInitialTab('resumen'); setOpenDetalle(true); });
          break;
        case 'menu-credito-ver-detalle':
          requireSelected(()=> { setDetalleInitialTab('productos'); setOpenDetalle(true); });
          break;
        case 'menu-credito-ver-abonos':
          requireSelected(()=> { setDetalleInitialTab('abonos'); setOpenDetalle(true); });
          break;
        case 'menu-credito-filtrar-fecha-hoy':
          setFiltroFecha(prev => prev==='hoy'? null : 'hoy');
          break;
        case 'menu-credito-filtrar-fecha-30':
          setFiltroFecha(prev => prev==='30'? null : '30');
          break;
        case 'menu-credito-filtrar-saldo-pendiente':
          setFiltroSaldo(prev => prev==='pendiente'? null : 'pendiente');
          break;
        case 'menu-credito-filtrar-saldo-cancelado':
          setFiltroSaldo(prev => prev==='cancelado'? null : 'cancelado');
          break;
        case 'menu-credito-imprimir':
          requireSelected(()=> { setOpenPrint(true); });
          break;
        default:
          break;
      }
    });
    return () => { try { off?.(); } catch(_){} };
  },[]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="p-4 border-b bg-white flex items-center gap-4 flex-wrap">
        <h1 className="text-lg font-semibold text-gray-800 flex-1">Créditos de Clientes</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={busqueda}
            onChange={e=> setBusqueda(e.target.value)}
            placeholder="Buscar nombre o cédula..."
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={()=> { setBusqueda(''); setFiltroFecha(null); setFiltroSaldo(null); }}
            className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
            type="button"
          >Limpiar</button>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={agrupar} onChange={e=> setAgrupar(e.target.checked)} /> Agrupar
          </label>
          <button onClick={cargar} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Actualizar</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          {loading && <div className="py-6 text-center text-gray-500 text-sm">Cargando...</div>}
          {!loading && creditosAgrupados.length===0 && <div className="py-6 text-center text-gray-500 text-sm">Sin créditos.</div>}
          {!loading && creditosAgrupados.map(group => {
            return (
              <div key={group.key} className="border-t first:border-t-0">
                {agrupar && group.key !== '__flat__' && (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <div className="font-medium text-gray-700 text-sm">
                      {group.cliente || 'Sin Nombre'} {group.cedula && <span className="text-gray-500 font-normal ml-2">({group.cedula})</span>}
                    </div>
                    <div className="text-xs text-gray-600">Saldo Total: <span className="font-semibold">{group.totalSaldo.toFixed(2)}</span> | Créditos: {group.items.length}</div>
                  </div>
                )}
                <table className="w-full text-xs">
                  <thead className="bg-white">
                    <tr className="text-gray-600">
                      <th className="px-2 py-1 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
                      {!agrupar && <th className="px-2 py-1 text-left">Cliente</th>}
                      <th className="px-2 py-1 text-left">Fecha</th>
                      <th className="px-2 py-1 text-left">Plazo</th>
                      <th className="px-2 py-1 text-right">Saldo</th>
                      <th className="px-2 py-1 text-left">Empresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map(c => {
                      const checked = selected===c.idventa;
                      return (
                        <tr key={c.idventa} className={`border-t hover:bg-gray-50 ${checked?'bg-blue-50':''}`}>
                          <td className="px-2 py-1 text-center align-middle">
                            <input type="checkbox" checked={checked} onChange={()=> setSelected(checked? null : c.idventa)} />
                          </td>
                          {!agrupar && <td className="px-2 py-1 truncate max-w-[140px]" title={c.cliente}>{c.cliente||'—'}</td>}
                          <td className="px-2 py-1">{c.fecha || '—'}</td>
                          <td className="px-2 py-1">{c.plazo}</td>
                          <td className="px-2 py-1 text-right font-medium">{Number(c.saldo).toFixed(2)}</td>
                          <td className="px-2 py-1">{c.empresa || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
      <DetalleCreditoModal idventa={selected} open={openDetalle && !!selected} initialTab={detalleInitialTab} onClose={()=> setOpenDetalle(false)} />
      <CreditoPrintModal idventa={selected} open={openPrint && !!selected} onClose={()=> setOpenPrint(false)} />
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onClose}
      />
    </div>
  );
};

export default CreditoView;
