import React, { useEffect, useRef, useState } from 'react';
import ProductoController from '../controllers/ProductoController';
import { Package, Search, X } from 'lucide-react';

const BuscarProductoModal = ({ isOpen, onClose, onSelect }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const controller = new ProductoController();
  const debounceRef = useRef();

  const performLoad = async (text = '') => {
    setLoading(true); setError(null);
    try {
      let res = text.trim() ? await controller.searchProductos(text, 'producto') : await controller.getAllProductos();
      if (res.success) setItems(res.data || []); else setError(res.message || 'Error');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (isOpen) { setQuery(''); setFocusIndex(-1); performLoad(''); } }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performLoad(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusIndex(i => Math.min(items.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusIndex(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter' && focusIndex >= 0) { e.preventDefault(); onSelect(items[focusIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, items, focusIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e)=> e.target===e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-lg shadow-xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-800">Buscar Productos</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"><X size={16} /></button>
        </div>
        {/* Search */}
        <div className="p-4 border-b bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={e=> setQuery(e.target.value)}
              placeholder="Buscar por descripción, código, barra o auxiliar..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div className="mt-1 text-[11px] text-gray-500">Escriba para filtrar (250ms debounce). Enter selecciona.</div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-2 text-xs text-gray-600">Cargando productos...</p>
              </div>
            </div>
          )}
          {!loading && error && (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="p-12 text-center text-gray-500 text-sm">Sin resultados</div>
          )}
          {!loading && !error && items.length > 0 && (
            <div className="h-full overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-100 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium w-20">Código</th>
                    <th className="text-left py-2 px-3 font-medium">Descripción</th>
                    <th className="text-right py-2 px-3 font-medium w-28">P. Compra</th>
                    <th className="text-center py-2 px-3 font-medium w-20">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((p, idx) => (
                    <tr
                      key={p.codigo}
                      onDoubleClick={() => onSelect(p)}
                      onClick={() => setFocusIndex(idx)}
                      className={`${idx === focusIndex ? 'bg-blue-50' : 'bg-white'} hover:bg-blue-50 cursor-pointer transition-colors`}
                    >
                      <td className="py-2 px-3 text-gray-700 font-medium whitespace-nowrap">{p.codigo}</td>
                      <td className="py-2 px-3 text-gray-700">
                        <div className="font-medium leading-tight">{p.producto}</div>
                        <div className="text-[11px] text-gray-500 flex gap-3">
                          {p.codbarra && <span>CB: {p.codbarra}</span>}
                          {p.codaux && <span>Aux: {p.codaux}</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">{parseFloat(p.pcompra || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ (p.almacen||0) < 10 ? 'bg-red-100 text-red-700' : (p.almacen||0) < 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{p.almacen || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t bg-white flex items-center justify-between text-[11px] text-gray-600">
          <div className="space-x-4">
            <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">↑↓</kbd> Navegar</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">Enter</kbd> Seleccionar</span>
            <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px]">Esc</kbd> Cerrar</span>
          </div>
          <div className="font-medium">{items.length} item(s)</div>
        </div>
      </div>
    </div>
  );
};

export default BuscarProductoModal;
