import React, { useEffect, useState, useMemo } from 'react';

function formatMoney(n){ const v = Number(n||0); return v.toLocaleString('es-EC',{minimumFractionDigits:2, maximumFractionDigits:2}); }

const DetalleDevolucionModal = ({ iddev, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dev, setDev] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(()=>{
    const cargar = async () => {
      if(!open || !iddev) return;
      setLoading(true); setError(null);
      try{
        // Cabecera devventa
        const d = await window.electronAPI.dbGetSingle('SELECT * FROM devventa WHERE id = ?', [iddev]);
        if(!d.success || !d.data) throw new Error('Devolución no encontrada');
        setDev(d.data);
        // Cliente
        if(d.data.idcliente){
          try{
            const c = await window.electronAPI.dbGetSingle('SELECT apellidos, nombres, cedula, direccion, telefono FROM cliente WHERE cedula = ? OR cod = ? LIMIT 1', [d.data.idcliente, d.data.idcliente]);
            if(c.success) setCliente(c.data||null);
          }catch{ setCliente(null); }
        } else { setCliente(null); }
        // Detalle: usar iddev si existe, caso contrario legacy por idventa
        let hasIdDev = false;
        try{
          const info = await window.electronAPI.dbQuery("PRAGMA table_info('devventadet')", []);
          hasIdDev = info?.success && Array.isArray(info.data) && info.data.some(col => String(col.name||'').toLowerCase()==='iddev');
        }catch(_){ hasIdDev = false; }
        if(hasIdDev){
          const det = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
            FROM devventadet dv LEFT JOIN producto p ON p.codigo = dv.codprod
            WHERE dv.iddev = ?
            ORDER BY CAST(dv.item as INTEGER) ASC`, [iddev]);
          setItems(det.success && Array.isArray(det.data) ? det.data : []);
        } else {
          const det = await window.electronAPI.dbQuery(`SELECT dv.item, dv.codprod, dv.cantidad, dv.precio, COALESCE(p.producto, '') AS descripcion
            FROM devventadet dv LEFT JOIN producto p ON p.codigo = dv.codprod
            WHERE dv.idventa = ?
            ORDER BY CAST(dv.item as INTEGER) ASC`, [iddev]);
          setItems(det.success && Array.isArray(det.data) ? det.data : []);
        }
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    };
    cargar();
  }, [open, iddev]);

  const totales = useMemo(()=>{
    const sub = (items||[]).reduce((s,it)=> s + (Number(it.cantidad)||0) * (Number(it.precio)||0), 0);
    return { sub, total: sub };
  }, [items]);

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto">
      <div className="bg-white rounded-lg shadow-lg mt-10 w-[900px] max-w-full border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Detalle Devolución #{iddev}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {loading && <div className="p-6 text-center text-sm text-gray-500">Cargando...</div>}
        {error && <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-200">{error}</div>}
        {dev && !loading && (
          <div className="p-4 space-y-4 max-h-[70vh] overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-700">
              <div><span className="font-medium">Devolución #:</span> {String(dev.id)}</div>
              <div><span className="font-medium">Fecha:</span> {String(dev.fecha||'').slice(0,10)}</div>
              <div className="md:col-span-2"><span className="font-medium">Cliente:</span> {cliente? `${cliente.apellidos||''} ${cliente.nombres||''}`.trim() : (dev.idcliente||'—')}</div>
              <div><span className="font-medium">Forma pago:</span> {(dev.formapago===1?'Efectivo':dev.formapago===2?'Cheque':dev.formapago===3?'Tarjeta':dev.formapago===4?'Transferencia':'—')}</div>
              <div><span className="font-medium">Subtotal:</span> ${formatMoney(dev.subtotal)}</div>
              <div><span className="font-medium">Descuento:</span> ${formatMoney(dev.descuento)}</div>
              <div><span className="font-medium">Total devolución:</span> ${formatMoney(dev.total)}</div>
            </div>

            <div className="border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-2 py-1">#</th>
                    <th className="text-left px-2 py-1">Código</th>
                    <th className="text-left px-2 py-1">Descripción</th>
                    <th className="text-right px-2 py-1">Cant.</th>
                    <th className="text-right px-2 py-1">P. U.</th>
                    <th className="text-right px-2 py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length===0 && <tr><td colSpan="6" className="text-center py-4 text-gray-400">Sin detalle.</td></tr>}
                  {items.map((it)=> (
                    <tr key={it.item} className="border-t">
                      <td className="px-2 py-1">{it.item}</td>
                      <td className="px-2 py-1">{it.codprod}</td>
                      <td className="px-2 py-1">{it.descripcion}</td>
                      <td className="px-2 py-1 text-right">{Number(it.cantidad)||0}</td>
                      <td className="px-2 py-1 text-right">{formatMoney(it.precio)}</td>
                      <td className="px-2 py-1 text-right">{formatMoney((Number(it.cantidad)||0) * (Number(it.precio)||0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-2 py-2 font-semibold text-right" colSpan={6}>Total devolución USD $ {formatMoney(totales.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalleDevolucionModal;
