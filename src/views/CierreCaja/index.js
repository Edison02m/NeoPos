import React, { useEffect, useState, useMemo } from 'react';
import CierreCajaController from '../../controllers/CierreCajaController';
import ActionPanel from './ActionPanel';
import TableModel from '../../components/TableModel';

const DENOMINACIONES_BILLETES = [100,50,20,10,5,1];
const DENOMINACIONES_MONEDAS = [1,0.50,0.25,0.10,0.05,0.01];

const CierreCajaView = () => {
  const controller = useMemo(()=> new CierreCajaController(), []);
  const hoy = useMemo(()=> new Date().toISOString().slice(0,10), []);
  const [cantidadesBilletes, setCantidadesBilletes] = useState({});
  const [cantidadesMonedas, setCantidadesMonedas] = useState({});
  const [cierreHoy, setCierreHoy] = useState(null);
  const [lista, setLista] = useState([]);
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState('idle'); // idle | creating | editing
  const [selected, setSelected] = useState(null); // fila seleccionada (por fecha)
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // document.title eliminado: el título lo fija WindowManager
  useEffect(()=>{ cargar(); },[]);

  async function cargar(){
    setLoading(true);
    const res = await controller.obtenerResumen(hoy);
    if(res.success){
      setCierreHoy(res.data.cierreHoy);
      setLista(res.data.lista);
    } else setMensaje({ type:'error', text: res.error });
    setLoading(false);
  }

  const totalBilletes = DENOMINACIONES_BILLETES.reduce((acc,v)=> acc + (parseInt(cantidadesBilletes[v])||0)*v,0);
  const totalMonedas = DENOMINACIONES_MONEDAS.reduce((acc,v)=> acc + (parseInt(cantidadesMonedas[v])||0)*v,0);
  const total = totalBilletes + totalMonedas;

  function updateBillete(v, val){ setCantidadesBilletes(p=> ({ ...p, [v]: val })); }
  function updateMoneda(v, val){ setCantidadesMonedas(p=> ({ ...p, [v]: val })); }

  function limpiarFormulario(){
    setCantidadesBilletes({});
    setCantidadesMonedas({});
  }

  function nuevo(){
    limpiarFormulario();
    setSelected(null);
    setModo('creating');
  }

  function editar(){
    if(!selected) return;
    // cargar datos seleccionados en formularios
    const s = selected;
    setCantidadesBilletes({
      100: s.bill100, 50: s.bill50, 20: s.bill20, 10: s.bill10, 5: s.bill5, 1: s.bill1
    });
    setCantidadesMonedas({
      1: s.mon1, 0.50: s.mon50c, 0.25: s.mon25c, 0.10: s.mon10c, 0.05: s.mon5c, 0.01: s.mon1c
    });
    setModo('editing');
  }

  async function eliminar(){
    if(!selected) return;
    setLoading(true);
    setMensaje(null);
    try {
      const resp = await controller.eliminarCierre(selected.fecha);
      if(resp.success){
        setMensaje({ type:'success', text:'Cierre eliminado.' });
        await cargar();
        setSelected(null);
        setModo('idle');
      } else setMensaje({ type:'error', text: resp.error });
    } catch(e){ setMensaje({ type:'error', text:e.message }); }
    finally { setLoading(false); }
  }

  async function guardar(){
    setLoading(true);
    setMensaje(null);
    try {
      const datos = {
        bill100: parseInt(cantidadesBilletes[100])||0,
        bill50: parseInt(cantidadesBilletes[50])||0,
        bill20: parseInt(cantidadesBilletes[20])||0,
        bill10: parseInt(cantidadesBilletes[10])||0,
        bill5: parseInt(cantidadesBilletes[5])||0,
        bill1: parseInt(cantidadesBilletes[1])||0,
        mon1: parseInt(cantidadesMonedas[1])||0,
        mon50c: parseInt(cantidadesMonedas[0.50])||0,
        mon25c: parseInt(cantidadesMonedas[0.25])||0,
        mon10c: parseInt(cantidadesMonedas[0.10])||0,
        mon5c: parseInt(cantidadesMonedas[0.05])||0,
        mon1c: parseInt(cantidadesMonedas[0.01])||0,
        codempresa: 1
      };
      if(modo==='creating'){
        const resp = await controller.guardarCierre({ fecha: hoy, ...datos });
        if(resp.success){ setMensaje({ type:'success', text:'Cierre creado.' }); await cargar(); setModo('idle'); limpiarFormulario(); }
        else setMensaje({ type:'error', text: resp.error });
      } else if(modo==='editing' && selected){
        const resp = await controller.actualizarCierre(selected.fecha, datos);
        if(resp.success){ setMensaje({ type:'success', text:'Cierre actualizado.' }); await cargar(); setModo('idle'); setSelected(null); limpiarFormulario(); }
        else setMensaje({ type:'error', text: resp.error });
      }
    } catch(e){ setMensaje({ type:'error', text:e.message }); }
    finally { setLoading(false); }
  }

  function cancelarModo(){
    limpiarFormulario();
    setModo('idle');
    if(selected) editar; // no recarga nada, se queda datos originales
  }

  function handleClose(){
    if(window.electronAPI?.closeCurrentWindow) window.electronAPI.closeCurrentWindow(); else window.close();
  }

  const filtrados = searchTerm
    ? lista.filter(l=> l.fecha.includes(searchTerm))
    : lista;

  function toggleSearch(){ setShowSearch(s=> !s); if(showSearch){ setSearchTerm(''); } }

  function seleccionar(row){ setSelected(row); if(modo!=='creating'){ setModo('idle'); } }

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
          <div className="max-w-5xl mx-auto">
            <header className="mb-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Cierre de Caja</h1>
              {cierreHoy && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200">Cierre registrado hoy</span>
              )}
            </header>
            {showSearch && (
              <div className="mb-3 bg-white border rounded p-3 flex items-center gap-2">
                <span className="text-xs text-gray-600">Buscar por fecha:</span>
                <input value={searchTerm} onChange={e=> setSearchTerm(e.target.value)} placeholder="YYYY-MM-DD" className="px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={()=> { setSearchTerm(''); }} className="text-xs text-gray-500 hover:text-gray-700">Limpiar</button>
              </div>
            )}
            {mensaje && <div className={`mb-3 px-4 py-2 rounded text-xs shadow ${mensaje.type==='success'? 'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{mensaje.text}</div>}
            <div className="h-[65vh]">
              <TableModel
                title="Historial de Cierres"
                data={filtrados.map(row=> ({
                  ...row,
                  total: (row.bill100+row.bill50+row.bill20+row.bill10+row.bill5+row.bill1) + (row.mon1+row.mon50c+row.mon25c+row.mon10c+row.mon5c+row.mon1c)
                }))}
                columns={[
                  { key:'fecha', title:'Fecha', width:'110px', fontWeight:'bold' },
                  ...DENOMINACIONES_BILLETES.map(v=> ({ key:'bill'+v, title:'B'+v, align:'right', width:'70px', render:val=> val })),
                  ...DENOMINACIONES_MONEDAS.map(v=> ({ key: v===1?'mon1': v===0.50?'mon50c': v===0.25?'mon25c': v===0.10?'mon10c': v===0.05?'mon5c':'mon1c', title:'M'+(v===1? '1.00': v.toFixed(2)), align:'right', width:'70px', render:val=> val })),
                  { key:'total', title:'Total', align:'right', width:'100px', render:v=> <span className="text-blue-600 font-semibold">{v}</span> }
                ]}
                selectedRow={selected}
                onRowClick={row=> seleccionar(row)}
                loading={loading}
                emptyMessage="Sin cierres"
                showRowNumbers={false}
              />
            </div>
            <p className="mt-3 text-[11px] text-gray-500">Use el panel de acciones para crear, editar, eliminar o buscar.</p>
          </div>
        </div>
        {/* Panel derecho */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-900">{modo==='creating' ? 'Nuevo Cierre' : modo==='editing' ? 'Editar Cierre' : 'Detalle Cierre'}</div>
          </div>
          <div className="flex-1 overflow-auto p-3 text-xs">
            {(modo==='creating' || modo==='editing') ? (
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-[11px] font-medium text-gray-600">Fecha</label>
                  <input value={modo==='creating'? hoy : (selected?.fecha || hoy)} disabled className="w-full border rounded px-2 py-1 bg-gray-50 text-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-700 mb-1">Billetes</h3>
                    <div className="space-y-1">
                      {DENOMINACIONES_BILLETES.map(v=> (
                        <div key={v} className="flex items-center justify-between">
                          <label className="mr-2 w-12 text-right text-[11px] text-gray-600">${v}</label>
                          <input value={cantidadesBilletes[v]||''} onChange={e=> updateBillete(v,e.target.value)} type="number" className="border w-20 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-right" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-1 border-t text-[11px] font-semibold text-blue-600 flex justify-between">
                      <span>Total</span>
                      <span>${totalBilletes.toFixed(2)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[11px] font-semibold text-gray-700 mb-1">Monedas</h3>
                    <div className="space-y-1">
                      {DENOMINACIONES_MONEDAS.map(v=> (
                        <div key={v} className="flex items-center justify-between">
                          <label className="mr-2 w-12 text-right text-[11px] text-gray-600">${v.toFixed(2)}</label>
                          <input value={cantidadesMonedas[v]||''} onChange={e=> updateMoneda(v,e.target.value)} type="number" className="border w-20 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-right" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-1 border-t text-[11px] font-semibold text-blue-600 flex justify-between">
                      <span>Total</span>
                      <span>${totalMonedas.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-gray-600 mb-1"><span>Total General</span><span className="font-semibold text-green-600">${total.toFixed(2)}</span></div>
                  <p className="text-[10px] text-blue-600">Presione Guardar en el panel izquierdo para confirmar.</p>
                </div>
              </div>
            ) : (
              <div className="text-gray-600 space-y-2">
                {selected ? (
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="font-medium">Fecha:</span><span>{selected.fecha}</span></div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-700 mb-1">Billetes</h4>
                        {DENOMINACIONES_BILLETES.map(v=> (
                          <div key={v} className="flex justify-between text-[10px]"><span>${v}</span><span>{selected['bill'+v]}</span></div>
                        ))}
                        <div className="flex justify-between text-[10px] font-semibold text-blue-600 border-t mt-1 pt-1"><span>Total</span><span>${(selected.bill100+selected.bill50+selected.bill20+selected.bill10+selected.bill5+selected.bill1).toFixed(2)}</span></div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-semibold text-gray-700 mb-1">Monedas</h4>
                        {DENOMINACIONES_MONEDAS.map(v=> (
                          <div key={v} className="flex justify-between text-[10px]"><span>${v.toFixed(2)}</span><span>{selected[v===1?'mon1': v===0.50?'mon50c': v===0.25?'mon25c': v===0.10?'mon10c': v===0.05?'mon5c':'mon1c']}</span></div>
                        ))}
                        <div className="flex justify-between text-[10px] font-semibold text-blue-600 border-t mt-1 pt-1"><span>Total</span><span>${(selected.mon1+selected.mon50c+selected.mon25c+selected.mon10c+selected.mon5c+selected.mon1c).toFixed(2)}</span></div>
                      </div>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-semibold text-green-700 text-[11px]"><span>Total General</span><span>${( (selected.bill100+selected.bill50+selected.bill20+selected.bill10+selected.bill5+selected.bill1) + (selected.mon1+selected.mon50c+selected.mon25c+selected.mon10c+selected.mon5c+selected.mon1c) ).toFixed(2)}</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">Seleccione un cierre para ver detalles o presione Nuevo para registrar el cierre del día.</p>
                )}
                {(modo==='idle' && cierreHoy && !selected) && <div className="mt-2 text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">Ya existe cierre hoy.</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CierreCajaView;