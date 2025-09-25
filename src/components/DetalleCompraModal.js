import React, { useEffect, useState, useMemo } from 'react';

const TabButton = ({active, onClick, children}) => (
  <button onClick={onClick} className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 ${active? 'border-blue-600 text-blue-700 bg-white':'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{children}</button>
);

function formatMoney(n){
  const v = Number(n||0);
  return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Modal de Detalle de Compra (alineado con DetalleVentaModal)
const DetalleCompraModal = ({ open, onClose, idCompra, initialTab='resumen' }) => {
  const [tab, setTab] = useState(initialTab);
  const [cabecera, setCabecera] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [imeis, setImeis] = useState({});
  const [proveedor, setProveedor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(()=> { if(open) setTab(initialTab); }, [open, initialTab]);

  useEffect(()=> {
    if(!open || !idCompra) return;
    const load = async () => {
      try{
        setLoading(true); setError(null);
        // Cabecera
        const cab = await window.electronAPI.dbGetSingle('SELECT * FROM compra WHERE id = ?', [idCompra]);
        if(!cab.success) throw new Error(cab.error||'No se encontró compra');
        setCabecera(cab.data);
        // Proveedor
        if(cab.data?.idprov){
          const prov = await window.electronAPI.dbGetSingle('SELECT * FROM proveedor WHERE cod = ? OR ruc = ? LIMIT 1', [cab.data.idprov, cab.data.idprov]);
          if(prov.success) setProveedor(prov.data);
        }
        // Líneas + descuento dinámico
        let selectDet = 'SELECT item, codprod, cantidad, precio, gravaiva';
        try {
          const pragma = await window.electronAPI.dbQuery('PRAGMA table_info(compradet)');
          if(pragma?.success){
            const cols = (pragma.data||[]).map(c=>c.name.toLowerCase());
            if(cols.includes('descuento')) selectDet += ', descuento';
          }
        } catch(_){ }
        selectDet += ' FROM compradet WHERE idcompra = ? ORDER BY item';
        const detRes = await window.electronAPI.dbQuery(selectDet, [idCompra]);
        let lineasBase = detRes.success ? (detRes.data||[]) : [];
        // Lote: obtener todos los códigos y consultar nombres en un solo IN
        const cods = [...new Set(lineasBase.map(l => l.codprod).filter(Boolean))];
        let mapDesc = {};
        if(cods.length){
          // Construir placeholders
          const placeholders = cods.map(()=>'?').join(',');
          try {
            const prodRes = await window.electronAPI.dbQuery(`SELECT codigo, producto, descripcion FROM producto WHERE codigo IN (${placeholders})`, cods);
            if(prodRes.success){
              for(const p of prodRes.data||[]){
                mapDesc[p.codigo] = p.producto || p.descripcion || '';
              }
            }
          } catch(_){ }
        }
        const enriquecidas = lineasBase.map(l => ({ ...l, descripcionProd: mapDesc[l.codprod] || '' }));
        setLineas(enriquecidas);
        // imeis (opcional)
        try {
          const exists = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='compraimei'");
          if(exists?.success && exists.data?.name === 'compraimei'){
            const pragmaI = await window.electronAPI.dbQuery('PRAGMA table_info(compraimei)');
            if(pragmaI.success){
              const cols = (pragmaI.data||[]).map(c=>c.name.toLowerCase());
              const colProd = cols.includes('codprod') ? 'codprod' : (cols.includes('codigo') ? 'codigo' : (cols.includes('producto') ? 'producto' : null));
              const colImei = cols.includes('imei') ? 'imei' : null;
              const colIdCompra = cols.includes('idcompra') ? 'idcompra' : (cols.includes('compra') ? 'compra' : null);
              if(colProd && colImei && colIdCompra){
                const sql = `SELECT ${colProd} as codprod, ${colImei} as imei FROM compraimei WHERE ${colIdCompra} = ?`;
                const imeisRes = await window.electronAPI.dbQuery(sql, [idCompra]);
                if(imeisRes.success){
                  const map = {};
                  (imeisRes.data||[]).forEach(r=> { if(!map[r.codprod]) map[r.codprod]=[]; map[r.codprod].push(r.imei); });
                  setImeis(map);
                }
              }
            }
          }
        } catch(_){ }
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    };
    load();
  }, [open, idCompra]);

  const totals = useMemo(()=>{
    const t = { cantidad:0, subtotal:0, descuento:0, iva:0, total:0 };
    for(const l of lineas){
      const cant = Number(l.cantidad)||0;
      const precio = Number(l.precio)||0;
      const desc = Number(l.descuento)||0;
      const lineaSubtotal = cant * precio;
      t.cantidad += cant;
      t.subtotal += lineaSubtotal;
      t.descuento += desc;
      const grava = String(l.gravaiva||'').toUpperCase()==='S' || l.gravaiva===1;
      if(grava){ t.iva += (lineaSubtotal - desc) * 0.12; }
    }
    t.total = t.subtotal - t.descuento + t.iva;
    return t;
  }, [lineas]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg mt-10 w-[1000px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Detalle Compra #{idCompra}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {cabecera && !loading && (
          <div className="flex flex-col">
            <div className="flex gap-2 px-4 pt-3 border-b bg-white">
              <TabButton active={tab==='resumen'} onClick={()=> setTab('resumen')}>Resumen</TabButton>
              <TabButton active={tab==='productos'} onClick={()=> setTab('productos')}>Productos</TabButton>
              <TabButton active={tab==='imeis'} onClick={()=> setTab('imeis')}>IMEIs</TabButton>
              <div className="flex-1" />
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
              {tab==='resumen' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-700">
                  <div><span className="font-medium">Compra #:</span> {String(cabecera.id)}</div>
                  <div><span className="font-medium">Fecha:</span> {String(cabecera.fecha||'').replace('T',' ').slice(0,19) || '—'}</div>
                  <div><span className="font-medium">Proveedor:</span> {proveedor?.empresa || cabecera.idprov || '—'}</div>
                  <div><span className="font-medium">RUC:</span> {proveedor?.ruc || '—'}</div>
                  <div><span className="font-medium">Factura:</span> {cabecera.numfactura || '—'}</div>
                  <div><span className="font-medium">Subtotal 12%:</span> ${formatMoney(cabecera.subtotal)}</div>
                  <div><span className="font-medium">Subtotal 0%:</span> ${formatMoney(cabecera.subtotal0)}</div>
                  <div><span className="font-medium">Descuento:</span> ${formatMoney(cabecera.descuento)}</div>
                  <div><span className="font-medium">IVA:</span> ${formatMoney(cabecera.iva)}</div>
                  <div><span className="font-medium">Total:</span> ${formatMoney(cabecera.total)}</div>
                </div>
              )}

              {tab==='productos' && (
                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">#</th>
                        <th className="text-left px-2 py-1 font-medium text-gray-600">Producto</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Cant.</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">P. U.</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Desc.</th>
                        <th className="text-right px-2 py-1 font-medium text-gray-600">Subtotal</th>
                        <th className="text-center px-2 py-1 font-medium text-gray-600">IVA?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineas.length===0 && <tr><td colSpan="7" className="text-center py-4 text-gray-400">Sin productos.</td></tr>}
                      {lineas.map((l,i)=> {
                        const cant = Number(l.cantidad)||0;
                        const precio = Number(l.precio)||0;
                        const desc = Number(l.descuento)||0;
                        const subtotal = cant * precio - desc;
                        const grava = String(l.gravaiva||'').toUpperCase()==='S' || l.gravaiva===1;
                        const nombre = l.descripcionProd || l.codprod || '—';
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-2 py-1">{l.item}</td>
                            <td className="px-2 py-1">{nombre}</td>
                            <td className="px-2 py-1 text-right">{cant}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(precio)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(desc)}</td>
                            <td className="px-2 py-1 text-right">{formatMoney(subtotal)}</td>
                            <td className="px-2 py-1 text-center">{grava ? 'Sí':'No'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-2 py-1 font-semibold text-right">Totales</td>
                        <td className="px-2 py-1 text-right font-semibold">{totals.cantidad}</td>
                        <td></td>
                        <td className="px-2 py-1 text-right font-semibold">{formatMoney(totals.descuento)}</td>
                        <td className="px-2 py-1 text-right font-semibold">{formatMoney(totals.subtotal - totals.descuento)}</td>
                        <td className="px-2 py-1 text-right font-semibold">IVA: {formatMoney(totals.iva)}</td>
                      </tr>
                      <tr>
                        <td colSpan={7} className="px-2 py-1 text-right font-semibold">Total: $ {formatMoney(totals.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {tab==='imeis' && (
                <div className="space-y-3 text-xs">
                  {Object.keys(imeis).length===0 && <div className="text-gray-400">Sin IMEIs registrados.</div>}
                  {Object.entries(imeis).map(([codprod, lista]) => (
                    <div key={codprod} className="border rounded p-2">
                      <div className="font-medium text-gray-700 mb-1">{codprod}</div>
                      <div className="flex flex-wrap gap-2">
                        {lista.map((im,i)=>(<span key={i} className="px-2 py-1 bg-gray-100 rounded border">{im}</span>))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleCompraModal;
