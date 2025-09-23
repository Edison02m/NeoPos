import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  const [openPrint, setOpenPrint] = useState(false);

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
      return ok;
    });
  },[creditos, filtroFecha, filtroSaldo, hoyStr]);

  useEffect(()=>{
    if(!window.electronAPI?.onMenuAction) return;
    const requireSelected = (fn) => {
      if(!selectedRef.current){
        alert('Seleccione un crédito primero.');
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
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Créditos de Clientes</h1>
        <button onClick={cargar} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Actualizar</button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-center"><input type="checkbox" disabled className="opacity-40" /></th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Num.</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Cliente</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Fecha</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Plazo</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Saldo</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="7" className="text-center py-6 text-gray-500">Cargando...</td></tr>}
              {!loading && creditosFiltrados.length===0 && <tr><td colSpan="7" className="text-center py-6 text-gray-500">Sin créditos.</td></tr>}
              {creditosFiltrados.map(c => {
                const checked = selected===c.idventa;
                return (
                <tr key={c.idventa} className={`border-t hover:bg-gray-50 ${checked?'bg-blue-50':''}`}> 
                  <td className="px-2 py-2 text-center align-middle">
                    <input type="checkbox" checked={checked} onChange={()=> setSelected(checked? null : c.idventa)} />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{c.num}</td>
                  <td className="px-3 py-2 text-gray-700 truncate max-w-[160px]" title={c.cliente}>{c.cliente || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{c.fecha || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{c.plazo}</td>
                  <td className="px-3 py-2 text-right text-gray-900 font-medium">{Number(c.saldo).toFixed(2)}</td>
                  <td className="px-3 py-2 text-gray-700">{c.empresa || '—'}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <DetalleCreditoModal idventa={selected} open={openDetalle && !!selected} initialTab={detalleInitialTab} onClose={()=> setOpenDetalle(false)} />
      <CreditoPrintModal idventa={selected} open={openPrint && !!selected} onClose={()=> setOpenPrint(false)} />
    </div>
  );
};

export default CreditoView;
