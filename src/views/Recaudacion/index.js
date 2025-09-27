import React, { useEffect, useMemo, useState } from 'react';
import RecaudacionController from '../../controllers/RecaudacionController';
import ActionPanel from './ActionPanel';
import TableModel from '../../components/TableModel';

const RecaudacionView = () => {
  const controller = useMemo(()=> new RecaudacionController(), []);
  const hoy = useMemo(()=> new Date().toISOString().slice(0,10), []);
  const [efectivo, setEfectivo] = useState('');
  const [cheque, setCheque] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [recaudacionHoy, setRecaudacionHoy] = useState(null);
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState('idle'); // idle | creating | editing
  const [selected, setSelected] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // document.title eliminado: control centralizado en WindowManager
  useEffect(()=> { cargar(); }, []);

  async function cargar(){
    setLoading(true);
    const res = await controller.obtenerResumen(hoy);
    if(res.success){
      setRecaudacionHoy(res.data.recaudacionHoy);
      setLista(res.data.lista);
    } else setMensaje({ type:'error', text: res.error });
    setLoading(false);
  }

  const total = (parseFloat(efectivo)||0) + (parseFloat(cheque)||0) + (parseFloat(tarjeta)||0);

  function limpiarFormulario(){ setEfectivo(''); setCheque(''); setTarjeta(''); }

  function nuevo(){ limpiarFormulario(); setSelected(null); setModo('creating'); }
  function editar(){
    if(!selected) return;
    setEfectivo(selected.efectivo);
    setCheque(selected.cheque);
    setTarjeta(selected.tarjeta);
    setModo('editing');
  }
  async function eliminar(){
    if(!selected) return;
    setLoading(true); setMensaje(null);
    try {
      const resp = await controller.eliminarRecaudacion(selected.fecha);
      if(resp.success){ setMensaje({ type:'success', text:'Recaudación eliminada.' }); await cargar(); setSelected(null); setModo('idle'); }
      else setMensaje({ type:'error', text: resp.error });
    } catch(e){ setMensaje({ type:'error', text:e.message }); }
    finally { setLoading(false); }
  }

  async function guardar(){
    setLoading(true); setMensaje(null);
    try {
      const datos = {
        efectivo: parseFloat(efectivo)||0,
        cheque: parseFloat(cheque)||0,
        tarjeta: parseFloat(tarjeta)||0
      };
      if(modo==='creating'){
        const resp = await controller.guardarRecaudacion({ fecha: hoy, ...datos });
        if(resp.success){ setMensaje({ type:'success', text:'Recaudación creada.' }); await cargar(); setModo('idle'); limpiarFormulario(); }
        else setMensaje({ type:'error', text: resp.error });
      } else if(modo==='editing' && selected){
        const resp = await controller.actualizarRecaudacion(selected.fecha, datos);
        if(resp.success){ setMensaje({ type:'success', text:'Recaudación actualizada.' }); await cargar(); setModo('idle'); setSelected(null); limpiarFormulario(); }
        else setMensaje({ type:'error', text: resp.error });
      }
    } catch(e){ setMensaje({ type:'error', text:e.message }); }
    finally { setLoading(false); }
  }

  function toggleSearch(){ setShowSearch(s=> !s); if(showSearch) setSearchTerm(''); }
  const filtrados = searchTerm ? lista.filter(r=> r.fecha.includes(searchTerm)) : lista;
  function seleccionar(row){ setSelected(row); if(modo!=='creating'){ setModo('idle'); } }

  function handleClose(){
    if(window.electronAPI?.closeCurrentWindow) window.electronAPI.closeCurrentWindow(); else window.close();
  }

  return (
    <div className="min-h-screen bg-gray-100 flex text-sm font-sans">
      <ActionPanel
        selectedItem={selected}
        onNewClick={nuevo}
        onEditClick={editar}
        onDeleteClick={eliminar}
        onSearchClick={toggleSearch}
        onSaveClick={guardar}
        onExitClick={handleClose}
        loading={loading}
        canSave={modo==='creating' || modo==='editing'}
      />
      <div className="flex-1 flex min-h-0">
        {/* Área central */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <header className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Recaudación</h1>
              {(modo==='idle' && recaudacionHoy) && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200">Recaudación registrada hoy</span>
              )}
            </header>
            {showSearch && (
              <div className="mb-3 bg-white border rounded p-3 flex items-center gap-2">
                <span className="text-xs text-gray-600">Buscar por fecha:</span>
                <input value={searchTerm} onChange={e=> setSearchTerm(e.target.value)} placeholder="YYYY-MM-DD" className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={()=> setSearchTerm('')} className="text-xs text-gray-500 hover:text-gray-700">Limpiar</button>
              </div>
            )}

            {mensaje && <div className={`mb-3 px-4 py-2 rounded text-xs shadow ${mensaje.type==='success'? 'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{mensaje.text}</div>}

            <div className="h-[65vh]">
              <TableModel
                title="Historial de Recaudaciones"
                data={filtrados.map(r=> ({
                  ...r,
                  total: (r.efectivo||0)+(r.cheque||0)+(r.tarjeta||0)
                }))}
                columns={[
                  { key:'fecha', title:'Fecha', width:'110px', fontWeight:'bold' },
                  { key:'efectivo', title:'Efectivo', align:'right', width:'100px', render:v=> Number(v).toFixed(2) },
                  { key:'cheque', title:'Cheque', align:'right', width:'100px', render:v=> Number(v).toFixed(2) },
                  { key:'tarjeta', title:'Tarjeta', align:'right', width:'100px', render:v=> Number(v).toFixed(2) },
                  { key:'total', title:'Total', align:'right', width:'110px', render:v=> <span className="text-blue-600 font-semibold">{Number(v).toFixed(2)}</span> }
                ]}
                selectedRow={selected}
                onRowClick={row=> seleccionar(row)}
                loading={loading}
                emptyMessage="Sin recaudaciones"
                showRowNumbers={false}
              />
            </div>
            <p className="mt-3 text-[11px] text-gray-500">Use el panel de acciones para crear, editar, eliminar o buscar.</p>
          </div>
        </div>
        {/* Panel derecho */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-900">
              {modo==='creating' ? 'Nueva Recaudación' : modo==='editing' ? 'Editar Recaudación' : 'Detalle Recaudación'}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 text-xs">
            {(modo==='creating' || modo==='editing') ? (
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-[11px] font-medium text-gray-600">Fecha</label>
                  <input value={modo==='creating'? hoy : (selected?.fecha || hoy)} disabled className="w-full border rounded px-2 py-1 bg-gray-50 text-gray-600" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-gray-600">Efectivo</label>
                    <input type="number" step="0.01" value={efectivo} onChange={e=> setEfectivo(e.target.value)} className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-gray-600">Cheques</label>
                    <input type="number" step="0.01" value={cheque} onChange={e=> setCheque(e.target.value)} className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block mb-1 text-[11px] font-medium text-gray-600">Tarjetas</label>
                    <input type="number" step="0.01" value={tarjeta} onChange={e=> setTarjeta(e.target.value)} className="w-full border rounded px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-gray-600 mb-1"><span>Total</span><span className="font-semibold text-green-600">${total.toFixed(2)}</span></div>
                  <p className="text-[10px] text-blue-600">Presione Guardar en el panel izquierdo para confirmar.</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-600 space-y-2">
                {selected ? (
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="font-medium">Fecha:</span><span>{selected.fecha}</span></div>
                    <div className="flex justify-between"><span>Efectivo</span><span>${Number(selected.efectivo).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Cheque</span><span>${Number(selected.cheque).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Tarjeta</span><span>${Number(selected.tarjeta).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1 font-semibold text-green-700"><span>Total</span><span>${(selected.efectivo+selected.cheque+selected.tarjeta).toFixed(2)}</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">Seleccione una fila para ver detalles o presione Nuevo para crear la recaudación del día.</p>
                )}
                {(modo==='idle' && recaudacionHoy && !selected) && <div className="mt-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">Ya existe recaudación hoy.</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecaudacionView;