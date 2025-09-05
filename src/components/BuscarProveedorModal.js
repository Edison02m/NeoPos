import React, { useEffect, useState } from 'react';
import ProveedorController from '../controllers/ProveedorController';

const BuscarProveedorModal = ({ isOpen, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const controller = new ProveedorController();

  const load = async (q='') => {
    setLoading(true); setError(null);
    try {
      let res;
      if (q.trim()==='') res = await controller.getAllProveedores();
      else res = await controller.searchProveedores(q);
      if (res.success) setItems(res.data); else setError(res.message||'Error');
    } catch(e){ setError(e.message);} finally { setLoading(false);} };

  useEffect(()=>{ if(isOpen){ load(); setQuery(''); setFocusIndex(-1);} }, [isOpen]);

  useEffect(()=>{
    if(!isOpen) return;
    const handler = (e)=>{
      if(e.key==='Escape') onClose();
      if(e.key==='ArrowDown'){ e.preventDefault(); setFocusIndex(i=>Math.min(items.length-1, i+1)); }
      if(e.key==='ArrowUp'){ e.preventDefault(); setFocusIndex(i=>Math.max(0, i-1)); }
      if(e.key==='Enter' && focusIndex>=0){ e.preventDefault(); onSelect(items[focusIndex]); }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  }, [isOpen, items, focusIndex, onSelect, onClose]);

  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 p-6" onClick={(e)=>e.target===e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-xl rounded shadow-lg flex flex-col border border-gray-500">
        <div className="px-3 py-2 border-b bg-gray-200 flex items-center space-x-2">
          <span className="font-semibold text-sm">Buscar Proveedor</span>
          <input
            autoFocus
            value={query}
            onChange={(e)=>{ setQuery(e.target.value); load(e.target.value); }}
            placeholder="Nombre / RUC / Representante..."
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button onClick={onClose} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Cerrar</button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading && <div className="p-4 text-sm text-gray-600">Cargando...</div>}
          {error && <div className="p-4 text-sm text-red-600">{error}</div>}
          {!loading && items.length===0 && !error && <div className="p-4 text-sm text-gray-500">Sin resultados</div>}
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2 py-1 border">Código</th>
                <th className="text-left px-2 py-1 border">Empresa</th>
                <th className="text-left px-2 py-1 border">RUC</th>
                <th className="text-left px-2 py-1 border">Representante</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p, idx)=>(
                <tr
                  key={p.cod}
                  onDoubleClick={()=>onSelect(p)}
                  onClick={()=>setFocusIndex(idx)}
                  className={`${idx===focusIndex? 'bg-blue-100':' '} hover:bg-blue-50 cursor-pointer`}
                >
                  <td className="px-2 py-1 border whitespace-nowrap">{p.cod}</td>
                  <td className="px-2 py-1 border">{p.empresa}</td>
                  <td className="px-2 py-1 border whitespace-nowrap">{p.ruc || ''}</td>
                  <td className="px-2 py-1 border">{p.representante || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t bg-gray-50 text-xs text-gray-600 flex justify-between">
          <span>Enter: seleccionar • Doble click: seleccionar • Esc: cerrar</span>
          <span>{items.length} items</span>
        </div>
      </div>
    </div>
  );
};

export default BuscarProveedorModal;
