import React, { useEffect, useState, useCallback } from 'react';
import { TrashIcon } from '../../components/Icons';
import ActionPanel from './ActionPanel';
import HistorialCompras from './HistorialCompras';
import ComprasPorProveedor from './ComprasPorProveedor';
import ImeiModal from './ImeiModal';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from '../../components/BuscarProductoModal';
import BuscarProveedorModal from '../../components/BuscarProveedorModal';
import ProductoController from '../../controllers/ProductoController';
import CompraController from '../../controllers/CompraController';
// Vista principal de Compras con historial integrado
const ComprasView = () => {
	const [productos, setProductos] = useState([]);
	const [compraId, setCompraId] = useState(null);
	const [proveedor, setProveedor] = useState(null);
  const [compraData, setCompraData] = useState({ fecha: new Date().toISOString().split('T')[0], numfactura:'', considerar_iva:true, fpago:'CONTADO', plazodias:0 });
  const [totales, setTotales] = useState({ subtotal:0, subtotal0:0, descuento:0, iva:0, total:0 });
  const [modoDescuento, setModoDescuento] = useState(false);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(false); // true = %, false = valor absoluto
	const [openProdModal, setOpenProdModal] = useState(false);
	const [openProvModal, setOpenProvModal] = useState(false);
	const [habilitado, setHabilitado] = useState(false);
	const [codigoBarras, setCodigoBarras] = useState('');
	const [loading, setLoading] = useState(false);
	const [deteccionAutomaticaActiva, setDeteccionAutomaticaActiva] = useState(false);
	const [imeiModalOpen, setImeiModalOpen] = useState(false);
	const [imeiProductoSel, setImeiProductoSel] = useState(null);
	const [imeiMap, setImeiMap] = useState({});
	const [devolucionActiva, setDevolucionActiva] = useState(false);
	const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [mostrarPorProveedor, setMostrarPorProveedor] = useState(false);
  const [comprasProveedor, setComprasProveedor] = useState([]);
  const [cargandoComprasProv, setCargandoComprasProv] = useState(false);
  const [proveedorFiltro, setProveedorFiltro] = useState(null);
  const [detalleCompraSel, setDetalleCompraSel] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
	const [historial, setHistorial] = useState([]);
	const [cargandoHistorial, setCargandoHistorial] = useState(false);
	const [history, setHistory] = useState([]);
	const [future, setFuture] = useState([]);

	const productoController = new ProductoController();
	const compraController = new CompraController();

	const captureState = useCallback(()=>({
		productos: JSON.parse(JSON.stringify(productos)),
		proveedor,
		compraData: { ...compraData },
		imeiMap: JSON.parse(JSON.stringify(imeiMap)),
		devolucionActiva
	}), [productos, proveedor, compraData, imeiMap, devolucionActiva]);
  const pushHistory = useCallback(()=>{ setHistory(h=>[...h, captureState()]); setFuture([]); }, [captureState]);
  const deshacerAccion = useCallback(()=>{ setHistory(h=>{ if(h.length===0) return h; setFuture(f=>[captureState(), ...f]); const last=h[h.length-1]; setProductos(last.productos); setProveedor(last.proveedor); setCompraData(last.compraData); setImeiMap(last.imeiMap); setDevolucionActiva(last.devolucionActiva); return h.slice(0,-1);}); }, [captureState]);

  useEffect(()=>{ const handler=(e)=>{ if((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key.toLowerCase()==='z'){ e.preventDefault(); deshacerAccion(); } }; window.addEventListener('keydown', handler); return ()=> window.removeEventListener('keydown', handler); }, [deshacerAccion]);

  // Recalculo de totales considerando descuentos por producto
  useEffect(()=>{
    let subtotalGravado = 0, subtotalCero = 0, descGravado = 0, descCero = 0;
    for(const p of productos){
      const linea = p.cantidad * p.precio;
      let desc;
      if (descuentoPorcentaje) {
        // Si está en modo porcentaje, p.descuento es un porcentaje
        const porcentaje = Math.min(Math.max(p.descuento||0,0), 100);
        desc = (linea * porcentaje) / 100;
      } else {
        // Si está en modo absoluto, p.descuento es un valor fijo
        desc = Math.min(Math.max(p.descuento||0,0), linea);
      }
      if(p.gravaiva==='1') { subtotalGravado += linea; descGravado += desc; }
      else { subtotalCero += linea; descCero += desc; }
    }
    const subtotal = subtotalGravado + subtotalCero; // antes de descuento
    const descuento = descGravado + descCero;
    const baseIva = subtotalGravado - descGravado; // descuento antes de IVA
    const iva = compraData.considerar_iva ? baseIva * 0.15 : 0;
    const total = subtotal - descuento + iva;
    setTotales({ subtotal, subtotal0: subtotalCero, descuento, iva, total });
  }, [productos, compraData.considerar_iva, descuentoPorcentaje]);

	const obtenerProximoId = useCallback(async ()=>{ try { const res = await window.electronAPI?.dbGetSingle?.('SELECT MAX(id) as lastId FROM compra'); if(res?.success){ const last=parseInt(res.data?.lastId)||0; return last+1;} } catch(_){} return null; }, []);
  const nuevaCompra = useCallback(async ()=>{ setHabilitado(true); setProductos([]); setProveedor(null); setCompraData(c=>({...c, numfactura:'', fecha:new Date().toISOString().split('T')[0], considerar_iva:true, fpago:'CONTADO', plazodias:0 })); const next=await obtenerProximoId(); setCompraId(next); }, [obtenerProximoId]);
	const editarCompra = ()=>{}; // Placeholder
	const cerrarVentana = ()=> { try { window.close(); } catch(_){} };
	const abrirImei = ()=>{ if(!habilitado) return; if(productos.length===0){ window.alert?.('Agregue productos primero'); return;} const prodPend = productos.find(p=> !(imeiMap[p.codigo]) || imeiMap[p.codigo].length < p.cantidad); setImeiProductoSel(prodPend || productos[0]); setImeiModalOpen(true); };
  const eliminarCompra = ()=>{ if(!habilitado) return; if(window.confirm('¿Desea limpiar completamente el formulario de compra?')){ pushHistory(); setProductos([]); setProveedor(null); setCompraData({ fecha:new Date().toISOString().split('T')[0], numfactura:'', considerar_iva:true, fpago:'CONTADO', plazodias:0 }); setTotales({subtotal:0, subtotal0:0, descuento:0, iva:0,total:0}); setCodigoBarras(''); setImeiMap({}); setImeiProductoSel(null); setImeiModalOpen(false); setDeteccionAutomaticaActiva(false); setDevolucionActiva(false); setCompraId(null); setHabilitado(false); setModoDescuento(false); try{ window.electronAPI?.setComprasDescuentoMenu?.(false);}catch(_){} } };
	const toggleDevolucion = ()=>{ pushHistory(); setDevolucionActiva(d=>!d); };
  const agregarProducto = (p)=>{ if(!habilitado) return; pushHistory(); const precioBase=parseFloat(p.pcompra ?? p.precio_compra ?? p.precio ?? p.pvp ?? 0)||0; if(precioBase<=0){ window.alert?.('El producto no tiene precio de compra definido'); return;} setProductos(prev=>{ const existe=prev.find(x=>x.codigo===p.codigo); if(existe) return prev.map(x=> x.codigo===p.codigo?{...x, cantidad:x.cantidad+1}:x); return [...prev, { codigo:p.codigo, descripcion:p.descripcion||p.producto, cantidad:1, precio:precioBase, descuento:0, codbarra:p.codigobarra||p.codbarra||p.codigoaux||'', gravaiva:(p.grabaiva ?? p.gravaiva)==='0'? '0':'1' }]; }); setOpenProdModal(false); };
	const eliminarProducto = useCallback(codigo=>{ pushHistory(); setProductos(prev=> prev.filter(p=> p.codigo!==codigo)); }, [pushHistory]);
	const actualizarCantidad = useCallback((codigo,nueva)=>{ 
    pushHistory(); 
    setProductos(prev=> prev.map(p=> {
      if (p.codigo === codigo) {
        const nuevaCantidad = Math.max(1, nueva);
        const nuevoTotalLinea = nuevaCantidad * p.precio;
        let descuentoAjustado = p.descuento;
        
        // Si el descuento actual excede el nuevo total de línea (en modo absoluto)
        if (!descuentoPorcentaje && p.descuento > nuevoTotalLinea) {
          descuentoAjustado = nuevoTotalLinea;
        }
        
        return {...p, cantidad: nuevaCantidad, descuento: descuentoAjustado};
      }
      return p;
    })); 
  }, [pushHistory, descuentoPorcentaje]);
  const actualizarPrecio = useCallback((codigo,nuevo)=>{ 
    pushHistory(); 
    setProductos(prev=> prev.map(p=> {
      if (p.codigo === codigo) {
        const nuevoPrecio = Math.max(0, nuevo);
        const nuevoTotalLinea = p.cantidad * nuevoPrecio;
        let descuentoAjustado = p.descuento;
        
        // Si el descuento actual excede el nuevo total de línea (en modo absoluto)
        if (!descuentoPorcentaje && p.descuento > nuevoTotalLinea) {
          descuentoAjustado = nuevoTotalLinea;
        }
        
        return {...p, precio: nuevoPrecio, descuento: descuentoAjustado};
      }
      return p;
    })); 
  }, [pushHistory, descuentoPorcentaje]);
  const actualizarDescuento = useCallback((codigo,nuevo)=>{ 
    pushHistory(); 
    setProductos(prev=> prev.map(p=> {
      if(p.codigo === codigo) {
        let descuentoFinal = Math.max(0, nuevo);
        // Si es porcentaje, limitar a 100%
        if(descuentoPorcentaje) {
          descuentoFinal = Math.min(descuentoFinal, 100);
        } else {
          // Si es valor absoluto, limitar al total de la línea
          const totalLinea = p.cantidad * p.precio;
          descuentoFinal = Math.min(descuentoFinal, totalLinea);
        }
        return {...p, descuento: descuentoFinal};
      }
      return p;
    })); 
  }, [pushHistory, descuentoPorcentaje]);
  const seleccionarProveedor = (prov)=> { 
    pushHistory(); 
    setProveedor(prov); 
    setOpenProvModal(false); 
    if(mostrarPorProveedor){ setProveedorFiltro(prov); cargarComprasProveedor(prov); }
  };
	const handleCodigoBarrasChange = (v)=> setCodigoBarras(v);
	const toggleDeteccionAutomatica = ()=>{ if(!habilitado) return; setDeteccionAutomaticaActiva(a=>!a); };

	const guardarCompra = useCallback(async ()=>{ if(!habilitado) return; if(productos.length===0){ window.alert?.('No hay productos'); return;} if(!proveedor){ window.alert?.('Seleccione un proveedor'); return;} const productosConImeiPend=productos.filter(p=>{ const requiere=/imei/i.test(p.descripcion||'') || (p.codbarra && p.codbarra.length>=14 && p.codbarra.length<=17); if(!requiere) return false; const arr=imeiMap[p.codigo]||[]; return arr.length!==p.cantidad; }); if(productosConImeiPend.length>0){ if(!window.confirm('Faltan IMEIs. ¿Guardar de todas formas?')) return; } // Calcular totales coherentes
    let subtotalGravado=0, subtotalCero=0, descGrav=0, descCero=0; const lineas=[];
    for(const p of productos){ const linea=p.cantidad*p.precio; const desc=Math.min(Math.max(p.descuento||0,0), linea); if(p.gravaiva==='1'){ subtotalGravado+=linea; descGrav+=desc; } else { subtotalCero+=linea; descCero+=desc; } lineas.push(p); }
    const subtotal = subtotalGravado + subtotalCero; const descuento = descGrav + descCero; const baseIva = subtotalGravado - descGrav; const iva = compraData.considerar_iva ? baseIva * 0.15 : 0; const total = subtotal - descuento + iva; try { const numfact = compraData.numfactura?.trim() || ('CF-'+Date.now().toString().slice(-6)); const idprovReal = proveedor?.cod || proveedor?.codigo || ''; if(!idprovReal){ console.warn('Proveedor sin cod/codigo definido. Se usará id/ruc/cedula como fallback y esto afectará consultas agrupadas.'); } const idprovFallback = proveedor?.id || proveedor?.ruc || proveedor?.cedula || ''; // Descripción basada en productos
      let descProductos = productos.map(p=>`${p.codigo}x${p.cantidad}`).join(', ');
      if(descProductos.length>190) descProductos = descProductos.slice(0,187)+'...';
      const esCredito = compraData.fpago==='CREDITO';
      const payload={ idprov: idprovReal || idprovFallback, fecha:compraData.fecha, subtotal, descuento, total, fpago:compraData.fpago, codempresa:1, iva, descripcion:descProductos, numfactura:numfact, autorizacion:'', subtotal0:subtotalCero, credito: esCredito ? 'S':'', anticipada:'', pagado: esCredito ? 'N':'S', plazodias: esCredito ? (parseInt(compraData.plazodias)||0):0, tipo:'', sustento:'', trial272:'' };
  const resp=await compraController.saveCompra(payload); if(!resp.success){ window.alert?.('Error guardando compra: '+resp.message); return;} const saved=resp.data; if(window.electronAPI?.dbRun){ try { await window.electronAPI.dbRun('BEGIN'); for(const [idx,pr] of productos.entries()){ await window.electronAPI.dbRun('UPDATE producto SET almacen = COALESCE(almacen,0) + ?, pcompra = ? WHERE codigo = ?', [pr.cantidad, pr.precio, pr.codigo]); // Intentar agregar columna descuento si no existe (una sola vez)
    if(idx===0){ try { await window.electronAPI.dbRun('ALTER TABLE compradet ADD COLUMN descuento REAL(9,3)'); } catch(_ignored){} }
    const lineaDesc = Math.min(Math.max(pr.descuento||0,0), pr.cantidad*pr.precio);
    await window.electronAPI.dbRun('INSERT INTO compradet (item, codprod, cantidad, precio, gravaiva, descuento, trial272, idcompra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [idx+1, pr.codigo, pr.cantidad, pr.precio, pr.gravaiva||'1', lineaDesc,'', saved.id]); const imeis=imeiMap[pr.codigo]||[]; for(const imei of imeis){ await window.electronAPI.dbRun('INSERT INTO compraimei (codprod, idcompra, imei) VALUES (?, ?, ?)', [pr.codigo, saved.id, imei]); } } await window.electronAPI.dbRun('COMMIT'); } catch(e){ try{ await window.electronAPI.dbRun('ROLLBACK'); }catch(_){} } } setCompraId(saved.id); window.alert?.('Compra guardada'); } catch(e){ window.alert?.('Error guardando compra'); } }, [habilitado, productos, proveedor, compraData, imeiMap, compraController]);

  const guardarDevolucion = useCallback(async ()=>{ if(!habilitado) return; if(productos.length===0){ window.alert?.('No hay productos para devolver'); return;} if(!proveedor){ window.alert?.('Seleccione un proveedor'); return;} try { if(!window.confirm('Confirmar devolución?')) return; let subtotal = productos.reduce((s,p)=> s + p.cantidad*p.precio,0); await window.electronAPI.dbRun('BEGIN'); let nextId=Date.now(); try{ const r=await window.electronAPI.dbGetSingle('SELECT MAX(id) as lastId FROM devcompra'); if(r?.data?.lastId) nextId=(parseInt(r.data.lastId)||0)+1;}catch(_){ } await window.electronAPI.dbRun('INSERT INTO devcompra (id, fecha, subtotal, total, descripcion, idcompra, trial272) VALUES (?, ?, ?, ?, ?, ?, ?)', [nextId, new Date().toISOString().split('T')[0], subtotal, subtotal, 'Devolución compra', compraId||'', '']); for(const [idx,pr] of productos.entries()){ await window.electronAPI.dbRun('UPDATE producto SET almacen = COALESCE(almacen,0) - ? WHERE codigo = ?', [pr.cantidad, pr.codigo]); await window.electronAPI.dbRun('INSERT INTO devcompradet (item, codprod, cantidad, precio, gravaiva, trial272, iddevcompra) VALUES (?, ?, ?, ?, ?, ?, ?)', [idx+1, pr.codigo, pr.cantidad, pr.precio, pr.gravaiva||'1','', nextId]); } await window.electronAPI.dbRun('COMMIT'); window.alert?.('Devolución registrada'); } catch(e){ try{ await window.electronAPI.dbRun('ROLLBACK'); }catch(_){} window.alert?.('Error devolución'); } }, [habilitado, productos, proveedor, compraId]);

  const cargarHistorial = useCallback(async ()=>{ setCargandoHistorial(true); try{ const resp=await compraController.getHistorialCompras(300); if(resp.success) setHistorial(resp.data); } catch(e){} finally{ setCargandoHistorial(false);} }, [compraController]);

  useEffect(()=>{ if(!window.electronAPI?.onMenuAction) return; const off=window.electronAPI.onMenuAction((action)=>{ 
    if(action==='menu-nueva-compra') nuevaCompra(); 
    else if(action==='menu-guardar-compra'){ (devolucionActiva? guardarDevolucion: guardarCompra)(); } 
    else if(action==='menu-buscar-producto'){ if(habilitado) setOpenProdModal(true);} 
    else if(action==='menu-seleccionar-proveedor'){ if(habilitado) setOpenProvModal(true);} 
    else if(action==='menu-aplicar-iva'){ setCompraData(c=>({...c, considerar_iva:!c.considerar_iva})); } 
    else if(action==='menu-historial-compras'){ setMostrarHistorial(true); cargarHistorial(); }
    // Sincronizar formas de pago del menú con TotalesPanel
    else if(action==='menu-pago-efectivo'){ setCompraData(c=>({...c, fpago:'CONTADO'})); }
    else if(action==='menu-pago-cheque'){ setCompraData(c=>({...c, fpago:'TRANSFERENCIA'})); }
    else if(action==='menu-pago-credito'){ setCompraData(c=>({...c, fpago:'CREDITO'})); }
    // DESCUENTO: Alternar visibilidad de columna descuento
    else if(action==='menu-aplicar-descuento'){ 
      console.log('[COMPRAS] Toggle descuento, estado actual:', modoDescuento);
      if(!habilitado){
        setHabilitado(true);
        setCompraData(c=>({...c, fecha:new Date().toISOString().split('T')[0], considerar_iva:true }));
      }
      setModoDescuento(prev => {
        console.log('[COMPRAS] Cambiando modoDescuento de', prev, 'a', !prev);
        return !prev;
      });
    }
  }); return ()=> { try { off?.(); } catch(_){} }; }, [nuevaCompra, guardarCompra, guardarDevolucion, habilitado, devolucionActiva, cargarHistorial, modoDescuento]);

  // REMOVER EL LISTENER DUPLICADO - Ahora está integrado arriba
  // Sincronizar menú (checkbox) con estado local modoDescuento
  useEffect(()=>{ 
    console.log('[SYNC] modoDescuento cambió a:', modoDescuento);
    try { window.electronAPI?.setComprasDescuentoMenu?.(modoDescuento); } catch(_){} 
  }, [modoDescuento]);
  // Sincronizar radio buttons forma de pago en menú con compraData.fpago
  useEffect(()=>{ try { window.electronAPI?.setComprasFormaPagoMenu?.(compraData.fpago); } catch(_){} }, [compraData.fpago]);
  // Enfocar primer input de descuento al habilitar modo
  useEffect(()=>{ if(modoDescuento){ setTimeout(()=>{ try { const el=document.querySelector('input.input-descuento'); el?.focus(); el?.select(); } catch(_){} },50);} }, [modoDescuento]);

  // Placeholder para menú "Compras por Proveedor" (pendiente vista específica)
  // Manejo menú Compras por Proveedor
  const cargarComprasProveedor = useCallback(async (prov)=>{
    if(!prov) return;
    setCargandoComprasProv(true);
    try {
      const keys = [prov.cod, prov.codigo, prov.ruc, prov.cedula, prov.id].filter(Boolean);
      let data=[]; let used=null;
      for(const k of keys){
        const resp = await compraController.getComprasByProveedor(k);
        if(resp.success && resp.data && resp.data.length>0){ data=resp.data; used=k; break; }
      }
      if(data.length===0){
        console.warn('Sin compras para proveedor con claves', keys);
      }
      setComprasProveedor(data);
      if(used && used!==prov.cod){ console.info('Compras encontradas usando clave alternativa', used); }
    } catch(e){ console.error('Error cargando compras proveedor', e); }
    finally { setCargandoComprasProv(false); }
  }, [compraController]);

  // Eliminar productos agregados y botón de migración
  // Migración de compras antiguas (idprov con ruc/cedula -> cod)
  const verDetalleCompra = useCallback(async (compra)=>{
    if(!compra) return; setCargandoDetalle(true); try { const resp = await compraController.getDetalleCompra(compra.id); if(resp.success){ setDetalleCompraSel(resp.data); } else { window.alert?.('No se pudo cargar detalle'); } } catch(e){ console.error(e); } finally { setCargandoDetalle(false);} }, [compraController]);

  useEffect(()=>{ if(!window.electronAPI?.onMenuAction) return; const off2 = window.electronAPI.onMenuAction((action)=>{ if(action==='menu-compras-proveedor'){ setMostrarHistorial(false); setMostrarPorProveedor(true); if(proveedorFiltro){ cargarComprasProveedor(proveedorFiltro); } } }); return ()=> { try { off2?.(); } catch(_){} }; }, [proveedorFiltro, cargarComprasProveedor]);

  // (Recalculado arriba, se elimina duplicado)

  // Búsqueda rápida por código de barras (placeholder)
  const buscarPorCodigoBarras = async (codigo)=>{ if(!codigo) return; try { const resp = await productoController.getProductoByCodigo?.(codigo); if(resp?.success && resp.data){ agregarProducto(resp.data); setCodigoBarras(''); } else { window.alert?.('Producto no encontrado'); } } catch(_){} };
  // Limpieza simple (el escáner avanzado se re-implementará luego si es necesario)
  useEffect(()=>()=> { if(window.__comprasTimeout) clearTimeout(window.__comprasTimeout); }, []);

  // Efecto para ajustar descuentos cuando se cambia entre modo porcentaje y absoluto
  useEffect(() => {
    if (!modoDescuento) return; // Solo si el modo descuento está activo
    
    setProductos(prev => prev.map(p => {
      if (!p.descuento || p.descuento === 0) return p; // Sin descuento, no hace falta ajustar
      
      const totalLinea = p.cantidad * p.precio;
      let nuevoDescuento = p.descuento;
      
      if (descuentoPorcentaje) {
        // Cambio a modo porcentaje: si el descuento actual es muy alto, ajustar
        if (p.descuento > 100) {
          nuevoDescuento = 100; // Máximo 100%
        }
      } else {
        // Cambio a modo absoluto: si el descuento excede el total de línea, ajustar
        if (p.descuento > totalLinea) {
          nuevoDescuento = totalLinea;
        }
      }
      
      return {...p, descuento: nuevoDescuento};
    }));
  }, [descuentoPorcentaje, modoDescuento]);

  return (
    <>
      {/* DEBUG: {JSON.stringify({modoDescuento, habilitado})} */}
      {mostrarHistorial ? (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">Historial de Compras</h1>
            <button onClick={()=> setMostrarHistorial(false)} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded">Volver</button>
          </div>
          <div className="flex-1 p-4 pt-0 overflow-auto">
            <div className="mb-2 flex justify-end">
              <button onClick={cargarHistorial} disabled={cargandoHistorial} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{cargandoHistorial? 'Cargando...':'Actualizar'}</button>
            </div>
            <HistorialCompras compras={historial} onVerDetalle={(c)=> verDetalleCompra(c)} />
          </div>
        </div>
      ) : mostrarPorProveedor ? (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-800">Compras por Proveedor</h1>
            <button onClick={()=> { setMostrarPorProveedor(false); setProveedorFiltro(null); }} className="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded">Volver</button>
          </div>
          <div className="flex-1 p-4 pt-0 overflow-auto">
            <ComprasPorProveedor
              proveedor={proveedorFiltro}
              compras={comprasProveedor}
              cargando={cargandoComprasProv}
              onSeleccionarProveedor={()=> { setOpenProvModal(true); }}
              onActualizar={()=> { if(proveedorFiltro) cargarComprasProveedor(proveedorFiltro); }}
              onVerDetalle={(c)=> verDetalleCompra(c)}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <div className="flex flex-1 overflow-hidden">
            <ActionPanel
              onNuevo={nuevaCompra}
              onEditar={editarCompra}
              onRehacer={deshacerAccion}
              onEliminar={eliminarCompra}
              onGuardar={devolucionActiva ? guardarDevolucion : guardarCompra}
              onAbrirImei={abrirImei}
              onDevolucion={toggleDevolucion}
              onCerrar={cerrarVentana}
              undoAvailable={history.length>0}
              loading={loading}
              disabled={!habilitado}
            />
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 p-4 min-h-0 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold text-gray-800">Compra # {compraId ?? '---'}</h1>
                </div>
                {/* Datos proveedor */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Compra a proveedor</h2>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600 w-24">Proveedor</label>
                        <input type="text" disabled={!habilitado} value={proveedor ? (proveedor.empresa || proveedor.nombre || '') : ''} onClick={()=> { if(habilitado) setOpenProvModal(true); }} readOnly className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer disabled:bg-gray-100" />
                        <button type="button" disabled={!habilitado} onClick={()=> setOpenProvModal(true)} className="px-2 py-2 text-xs bg-blue-600 text-white rounded disabled:opacity-50">Buscar</button>
                      </div>
                      {proveedor && (
                        <div className="ml-24 pl-2 border-l border-gray-200 text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
                          {proveedor.ruc && <div><span className="font-medium">RUC:</span> {proveedor.ruc}</div>}
                          {proveedor.representante && <div><span className="font-medium">Rep:</span> {proveedor.representante}</div>}
                          {proveedor.telefono && <div><span className="font-medium">Tel:</span> {proveedor.telefono}</div>}
                          {proveedor.mail && <div className="col-span-2 truncate"><span className="font-medium">Email:</span> {proveedor.mail}</div>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div className="flex items-center gap-2 md:col-span-1">
                        <label className="text-xs font-medium text-gray-600 w-24">N° factura</label>
                        <input type="text" disabled={!habilitado} value={compraData.numfactura} onChange={e=> setCompraData(c=>({...c, numfactura:e.target.value}))} className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
                      </div>
                      <div className="flex items-center gap-2 md:col-span-1">
                        <label className="text-xs font-medium text-gray-600 w-24">Fecha</label>
                        <input type="date" disabled={!habilitado} value={compraData.fecha} onChange={e=> setCompraData(c=>({...c, fecha:e.target.value}))} className="px-2 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Escáner */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M8 8h4m0 0V4.01M12 8V4m8 4h1m-1 0v1m-1 0h-4m4 0V8m-4 8V8m0 8v4m-4-4h4"/></svg>
                      <span className="text-sm font-medium text-gray-800">Escáner / Búsqueda</span>
                      {loading && <span className="text-xs text-blue-600 ml-2">Buscando...</span>}
                    </div>
                    <button type="button" onClick={toggleDeteccionAutomatica} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${deteccionAutomaticaActiva ? 'bg-green-600 text-white hover:bg-green-700':'bg-gray-600 text-white hover:bg-gray-700'} disabled:opacity-40`} disabled={!habilitado} title={deteccionAutomaticaActiva? 'Detección automática activada':'Activar detección automática'}>{deteccionAutomaticaActiva? 'AUTO ON':'AUTO OFF'}</button>
                  </div>
                  <form onSubmit={(e)=> { e.preventDefault(); if(codigoBarras.trim()) buscarPorCodigoBarras(codigoBarras.trim()); }}>
                    <div className="flex gap-2">
                      <input id="codigoBarrasCompras" name="codigoBarrasCompras" type="text" placeholder={habilitado? (deteccionAutomaticaActiva? 'AUTO ON: escanee':'Escanee o escriba código / nombre y Enter') : '(Nuevo primero)'} className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" value={codigoBarras} onChange={(e)=> handleCodigoBarrasChange(e.target.value)} disabled={!habilitado || loading || deteccionAutomaticaActiva} autoComplete="off" />
                      <button type="submit" disabled={!habilitado || loading || !codigoBarras.trim()} className="px-4 py-2 bg-gray-800 text-white rounded text-sm disabled:opacity-50">{loading? '...':'Agregar'}</button>
                    </div>
                  </form>
                  <div className="text-xs text-gray-600 mt-2">{habilitado ? (deteccionAutomaticaActiva ? 'Detección automática activa: escanee directamente.':'Ingrese o escanee un código y presione Agregar / Enter.') : 'Inicie una compra para usar el escáner.'}</div>
                </div>
                {/* Tabla productos */}
                <div className="flex-1 min-h-0 bg-white rounded border border-gray-200 flex flex-col">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Productos {devolucionActiva && <span className="text-red-600 font-normal">(Devolución)</span>}</h3>
                    {modoDescuento && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">Tipo descuento:</span>
                        <button
                          onClick={() => setDescuentoPorcentaje(!descuentoPorcentaje)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            descuentoPorcentaje 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {descuentoPorcentaje ? '% Porcentaje' : '$ Absoluto'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Item</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Código</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cód. Barras</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cant.</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Descripción</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. U.</th>
                          {modoDescuento && <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Descuento</th>}
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. Total</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Eliminar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!habilitado ? (
                          <tr><td colSpan={modoDescuento ? "9" : "8"} className="text-center py-8 text-gray-500 text-sm">Pulse "Nuevo" para iniciar.</td></tr>
                        ) : productos.length === 0 ? (
                          <tr><td colSpan={modoDescuento ? "9" : "8"} className="text-center py-8 text-gray-500 text-sm">Sin productos.</td></tr>
                        ) : productos.map((p,i)=>(
                          <tr key={p.codigo} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-700">{i+1}</td>
                            <td className="py-2 px-3 text-gray-700 font-mono">{p.codigo}</td>
                            <td className="py-2 px-3 text-gray-700">{p.codbarra && p.codbarra !== p.codigo ? <span className="font-mono">{p.codbarra}</span> : <span className="text-gray-400 italic">N/A</span>}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1">
                                <button onClick={()=> actualizarCantidad(p.codigo, p.cantidad-1)} disabled={!habilitado || p.cantidad<=1} className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:opacity-40" type="button">-</button>
                                <span className="w-8 text-center text-sm">{p.cantidad}</span>
                                <button onClick={()=> actualizarCantidad(p.codigo, p.cantidad+1)} disabled={!habilitado} className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:opacity-40" type="button">+</button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-800">{p.descripcion}</td>
                            <td className="py-2 px-3 text-right">
                              <input type="number" min="0" step="0.01" disabled={!habilitado} value={p.precio} onChange={e=>{ const val=parseFloat(e.target.value)||0; actualizarPrecio(p.codigo,val); }} className="w-24 text-right text-sm border border-gray-300 rounded bg-white px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
                            </td>
                            {modoDescuento && (
                              <td className="py-2 px-3 text-right">
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    step={descuentoPorcentaje ? "0.1" : "0.01"}
                                    max={descuentoPorcentaje ? "100" : (p.cantidad * p.precio).toFixed(2)}
                                    data-descuento="1" 
                                    disabled={!habilitado} 
                                    value={p.descuento||0} 
                                    placeholder={descuentoPorcentaje ? "%" : "$"}
                                    onChange={e=>{ 
                                      const val = parseFloat(e.target.value) || 0;
                                      const maxLinea = p.cantidad * p.precio;
                                      
                                      if (descuentoPorcentaje) {
                                        // Modo porcentaje: máximo 100%
                                        if (val > 100) {
                                          e.target.value = 100;
                                          actualizarDescuento(p.codigo, 100);
                                          return;
                                        }
                                      } else {
                                        // Modo absoluto: máximo el valor de la línea
                                        if (val > maxLinea) {
                                          e.target.value = maxLinea.toFixed(2);
                                          actualizarDescuento(p.codigo, maxLinea);
                                          return;
                                        }
                                      }
                                      
                                      actualizarDescuento(p.codigo, val); 
                                    }}
                                    onBlur={e => {
                                      // Validación adicional al perder el foco
                                      const val = parseFloat(e.target.value) || 0;
                                      const maxLinea = p.cantidad * p.precio;
                                      
                                      if (descuentoPorcentaje && val > 100) {
                                        e.target.value = 100;
                                        actualizarDescuento(p.codigo, 100);
                                      } else if (!descuentoPorcentaje && val > maxLinea) {
                                        e.target.value = maxLinea.toFixed(2);
                                        actualizarDescuento(p.codigo, maxLinea);
                                      }
                                    }}
                                    className={`w-20 text-right text-xs border rounded bg-white px-1 py-1 focus:outline-none focus:ring-2 disabled:bg-gray-100 input-descuento ${
                                      descuentoPorcentaje 
                                        ? (p.descuento > 100 ? 'border-red-300 focus:ring-red-500/40' : 'border-gray-300 focus:ring-blue-500/40')
                                        : (p.descuento > (p.cantidad * p.precio) ? 'border-red-300 focus:ring-red-500/40' : 'border-gray-300 focus:ring-blue-500/40')
                                    }`}
                                  />
                                  {descuentoPorcentaje && (
                                    <span className="absolute right-2 top-1 text-xs text-gray-500 pointer-events-none">%</span>
                                  )}
                                </div>
                                {descuentoPorcentaje && p.descuento > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    ${((p.cantidad * p.precio * (p.descuento || 0)) / 100).toFixed(2)}
                                  </div>
                                )}
                                {/* Indicador de error */}
                                {((descuentoPorcentaje && p.descuento > 100) || (!descuentoPorcentaje && p.descuento > (p.cantidad * p.precio))) && (
                                  <div className="text-xs text-red-500 mt-1">
                                    Excede el máximo
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="py-2 px-3 text-right font-medium text-gray-900">
                              {(() => {
                                const linea = p.cantidad * p.precio;
                                let descuento = 0;
                                if (descuentoPorcentaje) {
                                  descuento = (linea * (p.descuento || 0)) / 100;
                                } else {
                                  descuento = Math.min(p.descuento || 0, linea);
                                }
                                return (linea - descuento).toFixed(2);
                              })()}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button onClick={()=> eliminarProducto(p.codigo)} disabled={!habilitado} className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-40" title="Eliminar" type="button"><TrashIcon size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="w-80 p-4 bg-gray-50 border-l border-gray-200">
                <TotalesPanel compraData={compraData} setCompraData={setCompraData} totales={totales} />
              </div>
            </div>
          </div>
        </div>
      )}
      <BuscarProductoModal isOpen={openProdModal} onClose={()=> setOpenProdModal(false)} onSelect={agregarProducto} />
      <BuscarProveedorModal isOpen={openProvModal} onClose={()=> setOpenProvModal(false)} onSelect={seleccionarProveedor} />
      <ImeiModal
        isOpen={imeiModalOpen}
        onClose={()=> setImeiModalOpen(false)}
        producto={imeiProductoSel}
        cantidad={imeiProductoSel?.cantidad || 0}
        onSave={(producto, imeis)=>{
          setImeiMap(prev=>{
            const updated={ ...prev, [producto.codigo]: imeis };
            // Buscar siguiente producto pendiente
            const siguiente = productos.find(p=>{
              if(p.codigo===producto.codigo) return false;
              const arr=updated[p.codigo]||[]; return arr.length < p.cantidad;
            });
            if(siguiente){ setTimeout(()=> { setImeiProductoSel(siguiente); setImeiModalOpen(true); }, 200); }
            return updated;
          });
          setImeiModalOpen(false);
        }}
      />
      {detalleCompraSel && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg w-[750px] max-h-[90vh] flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Detalle Compra #{detalleCompraSel.cabecera?.id}</h3>
              <button onClick={()=> setDetalleCompraSel(null)} className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded">Cerrar</button>
            </div>
            <div className="p-3 space-y-3 overflow-auto">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div><span className="font-medium">Fecha:</span> {detalleCompraSel.cabecera?.fecha}</div>
                <div><span className="font-medium">Factura:</span> {detalleCompraSel.cabecera?.numfactura}</div>
                <div><span className="font-medium">Proveedor:</span> {detalleCompraSel.cabecera?.idprov}</div>
                <div><span className="font-medium">Total:</span> {Number(detalleCompraSel.cabecera?.total||0).toFixed(2)}</div>
                <div><span className="font-medium">Descuento:</span> {Number(detalleCompraSel.cabecera?.descuento||0).toFixed(2)}</div>
                <div><span className="font-medium">Forma Pago:</span> {detalleCompraSel.cabecera?.fpago || ''} {detalleCompraSel.cabecera?.credito==='S' && detalleCompraSel.cabecera?.plazodias? `(Plazo ${detalleCompraSel.cabecera.plazodias} días)`:''}</div>
              </div>
              <div className="border border-gray-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b">Item</th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b">Código</th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b">Cantidad</th>
                      <th className="px-2 py-1 text-right font-medium text-gray-600 border-b">Precio</th>
                      <th className="px-2 py-1 text-right font-medium text-gray-600 border-b">Descuento</th>
                      <th className="px-2 py-1 text-right font-medium text-gray-600 border-b">Subtotal</th>
                      <th className="px-2 py-1 text-left font-medium text-gray-600 border-b">IMEIs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleCompraSel.detalles?.map(d=>(
                      <tr key={d.item} className="border-b">
                        <td className="px-2 py-1">{d.item}</td>
                        <td className="px-2 py-1 font-mono">{d.codprod}</td>
                        <td className="px-2 py-1">{d.cantidad}</td>
                        <td className="px-2 py-1 text-right">{Number(d.precio||0).toFixed(2)}</td>
                        <td className="px-2 py-1 text-right text-red-600">{Number(d.descuento||0).toFixed(2)}</td>
                        <td className="px-2 py-1 text-right">{(d.cantidad * d.precio - (d.descuento||0)).toFixed(2)}</td>
                        <td className="px-2 py-1 text-[10px] whitespace-pre-wrap max-w-[140px]">{(detalleCompraSel.imeis?.[d.codprod]||[]).join('\n')}</td>
                      </tr>
                    ))}
                    {(!detalleCompraSel.detalles || detalleCompraSel.detalles.length===0) && (
                      <tr><td colSpan="7" className="text-center py-4 text-gray-500">Sin detalles</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ComprasView;
