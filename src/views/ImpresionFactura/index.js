import React, { useEffect, useState, useMemo } from 'react';
import ImpresionController from '../../controllers/ImpresionController';

const ELEMENTOS_FACTURA_BASE = [
  { objeto: 'Fecha' },
  { objeto: 'Cliente' },
  { objeto: 'Direccion' },
  { objeto: 'Telefono' },
  { objeto: 'RUC' },
  { objeto: 'Detalle Cantidad' },
  { objeto: 'Detalle Codigo Auxiliar' },
  { objeto: 'Detalle Producto' },
  { objeto: 'Detalle Precio Unitario' },
  { objeto: 'Detalle Precio Total' },
  { objeto: 'Subtotal con IVA' },
  { objeto: 'Subtotal sin IVA' },
  { objeto: 'Subtotal' },
  { objeto: 'IVA' },
  { objeto: 'Total' }
];

// Elementos que en el sistema legado se marcan con * (omisión si Posición Y = 0)
const ELEMENTOS_CON_ASTERISCO = new Set([
  'Direccion',
  'Telefono',
  'Detalle Codigo Auxiliar',
  'Subtotal con IVA',
  'Subtotal sin IVA'
]);

const ImpresionFacturaConfig = () => {
  const controller = useMemo(()=> new ImpresionController(), []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState([]); // impresion
  const [search, setSearch] = useState('');

  // document.title eliminado: ahora el título se fija desde el proceso principal

  useEffect(()=>{ loadData(); }, []);

  async function loadData(){
    try {
      setLoading(true);
      const res = await controller.listarTodo();
      if(res.success){
        let lista = res.data?.impresion || [];
        // Asegurar que todos los elementos base existan (merge por objeto)
        ELEMENTOS_FACTURA_BASE.forEach(base => {
          if(!lista.find(l => l.objeto === base.objeto)){
            lista.push({ objeto: base.objeto, posx: '', posy: '', TEXTo: '', trial275:'' });
          }
        });
        setItems(lista.sort((a,b)=> a.objeto.localeCompare(b.objeto)));
        setOffset(res.data?.offset?.offset || 0);
      } else {
        setMessage({ type:'error', text: res.error });
      }
    } catch(e){ setMessage({ type:'error', text: e.message }); } finally { setLoading(false); }
  }

  function updateItem(index, field, value){
    setItems(prev => prev.map((it,i)=> i===index? { ...it, [field]: value }: it));
  }

  async function handleSave(){
    try {
      setLoading(true); setMessage(null);
      // Convertir posx,posy a float o null
      const payload = items.map(it=> ({ ...it, posx: it.posx===''? null: parseFloat(it.posx), posy: it.posy===''? null: parseFloat(it.posy) }));
      const res = await controller.guardar({ impresion: payload, offset: parseFloat(offset)||0 });
      if(res.success){ setMessage({ type:'success', text:'Configuración guardada' }); loadData(); }
      else setMessage({ type:'error', text: res.error });
    } catch(e){ setMessage({ type:'error', text: e.message }); } finally { setLoading(false); }
  }

  function handleClose(){
    if(window.electronAPI?.closeCurrentWindow){ window.electronAPI.closeCurrentWindow(); } else { window.close(); }
  }

  const filteredItems = items.filter(it=> it.objeto.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 font-sans bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Configuración de Impresión de Facturas</h1>
      <div className="flex gap-4 items-end mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600">Espacio entre ítems (offset)</label>
          <input type="number" step="0.1" value={offset} onChange={e=> setOffset(e.target.value)} className="border px-2 py-1 rounded text-sm w-32" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-600">Buscar</label>
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Buscar elemento" className="border px-2 py-1 rounded text-sm w-full" />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">{loading? 'Guardando...':'Grabar'}</button>
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 rounded text-sm">Cerrar</button>
        </div>
      </div>
      {message && (
        <div className={`mb-4 text-sm px-3 py-2 rounded ${message.type==='success'? 'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{message.text}</div>
      )}
      <div className="overflow-auto border rounded" style={{ maxHeight:'60vh' }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1 border">Elemento</th>
              <th className="text-left px-2 py-1 border">Posición X</th>
              <th className="text-left px-2 py-1 border">Posición Y</th>
              <th className="text-left px-2 py-1 border">Texto</th>
              {/* Columna Tipo eliminada */}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it, idx)=> (
              <tr key={it.objeto} className="odd:bg-white even:bg-gray-50 hover:bg-blue-50">
                <td className="px-2 py-1 border whitespace-nowrap">
                  {ELEMENTOS_CON_ASTERISCO.has(it.objeto) ? `${it.objeto} *` : it.objeto}
                </td>
                <td className="px-2 py-1 border">
                  <input value={it.posx ?? ''} onChange={e=> updateItem(idx, 'posx', e.target.value)} type="number" step="0.01" className="w-24 border px-1 py-0.5 rounded" />
                </td>
                <td className="px-2 py-1 border">
                  <input value={it.posy ?? ''} onChange={e=> updateItem(idx, 'posy', e.target.value)} type="number" step="0.01" className="w-24 border px-1 py-0.5 rounded" />
                </td>
                <td className="px-2 py-1 border">
                  <input value={it.TEXTo || ''} onChange={e=> updateItem(idx, 'TEXTo', e.target.value)} type="text" className="w-56 border px-1 py-0.5 rounded" />
                </td>
                {/* Columna tipo eliminada */}
              </tr>
            ))}
            {filteredItems.length===0 && (
              <tr><td colSpan={4} className="text-center py-4 text-gray-500">Sin elementos</td></tr>
            )}
          </tbody>
        </table>
      </div>
  <div className="mt-4 text-xs text-gray-500">Nota: Campos marcados con * se dejan de imprimir colocando valor 0 en Posición Y (Dirección, Teléfono, Detalle Código Auxiliar, Subtotal con IVA, Subtotal sin IVA).</div>
    </div>
  );
};

export default ImpresionFacturaConfig;
