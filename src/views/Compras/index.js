import React, { useEffect, useState, useCallback } from 'react';
import { TrashIcon } from '../../components/Icons';
import ActionPanel from './ActionPanel';
import ImeiModal from './ImeiModal';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from '../../components/BuscarProductoModal';
import BuscarProveedorModal from '../../components/BuscarProveedorModal';
import ProductoController from '../../controllers/ProductoController';
import * as BD from '../../utils/barcodeDetector';
import CompraController from '../../controllers/CompraController';

const ComprasView = () => {
	const [productos, setProductos] = useState([]); // {codigo, descripcion, cantidad, precio, codbarra}
	const [compraId, setCompraId] = useState(null); // próximo ID sugerido
	const [proveedor, setProveedor] = useState(null);
	const [compraData, setCompraData] = useState({
		fecha: new Date().toISOString().split('T')[0],
		numfactura: '',
		considerar_iva: true
	});
	const [totales, setTotales] = useState({ subtotal:0, iva:0, total:0 });
	const [openProdModal, setOpenProdModal] = useState(false);
	const [openProvModal, setOpenProvModal] = useState(false);
	const [habilitado, setHabilitado] = useState(false);
	// Scanner / búsqueda rápida (replicado desde Ventas adaptado a Compras)
	const [codigoBarras, setCodigoBarras] = useState('');
	const [loading, setLoading] = useState(false);
	const [deteccionAutomaticaActiva, setDeteccionAutomaticaActiva] = useState(false);
	const [imeiModalOpen, setImeiModalOpen] = useState(false);
	const [imeiProductoSel, setImeiProductoSel] = useState(null); // producto seleccionado para IMEIs
	const [imeiMap, setImeiMap] = useState({}); // codigo -> array de imeis
	const [devolucionActiva, setDevolucionActiva] = useState(false);

	// Controladores
	const productoController = new ProductoController();
	const compraController = new CompraController();

	// Resolver constructor detector
	const BarcodeDetectorCtor = useCallback(() => {
		if (typeof BD.BarcodeDetector === 'function') return BD.BarcodeDetector;
		if (typeof BD.default === 'function') return BD.default;
		return null;
	}, []);

	// Recalcular totales
	useEffect(()=>{
		const subtotal = productos.reduce((s,p)=> s + p.cantidad * p.precio, 0);
		const iva = compraData.considerar_iva ? subtotal * 0.15 : 0;
		setTotales({ subtotal, iva, total: subtotal + iva });
	}, [productos, compraData.considerar_iva]);

	// Atajo F2
	useEffect(()=>{
		const handler = e => { if(e.key === 'F2'){ e.preventDefault(); if(habilitado) setOpenProdModal(true);} };
		window.addEventListener('keydown', handler);
		return ()=> window.removeEventListener('keydown', handler);
	}, [habilitado]);

	const obtenerProximoId = useCallback(async ()=>{
		try {
			if(!window.electronAPI?.dbGetSingle) return null;
			const res = await window.electronAPI.dbGetSingle('SELECT MAX(id) as lastId FROM compra');
			if(res?.success){ const last = parseInt(res.data?.lastId)||0; return last + 1; }
			return null;
		}catch(e){ console.warn('No se pudo obtener MAX(id) compra:', e); return null; }
	},[]);

	const nuevaCompra = useCallback(async () => {
		setHabilitado(true); setProductos([]); setProveedor(null);
		setCompraData(c=>({...c, numfactura:'', fecha:new Date().toISOString().split('T')[0]}));
		const nextId = await obtenerProximoId();
		setCompraId(nextId);
	}, [obtenerProximoId]);
	const editarCompra = () => { /* placeholder editar */ };
	const rehacerAccion = () => { /* placeholder rehacer */ };
	const eliminarCompra = () => { if(!habilitado) return; if(window.confirm('Eliminar items de la compra actual?')) setProductos([]); };
	const cerrarVentana = () => window.electronAPI?.closeCurrentWindow?.();
	const abrirImei = () => { if(!habilitado) return; if(productos.length===0){ window.alert?.('Agregue productos primero'); return; }
		const prodPend = productos.find(p=> !(imeiMap[p.codigo]) || imeiMap[p.codigo].length < p.cantidad);
		setImeiProductoSel(prodPend || productos[0]);
		setImeiModalOpen(true);
	};
	const toggleDevolucion = () => { setDevolucionActiva(d=> !d); };
	const agregarProducto = (p) => {
		const precioBase = parseFloat(p.pcompra ?? p.precio_compra ?? p.precio ?? p.pvp ?? 0) || 0;
		if(precioBase <= 0){
			window.alert?.('El producto no tiene precio de compra definido. Ajuste el precio en la ventana de Productos.');
			return;
		}
		setProductos(prev => {
			const existe = prev.find(x => x.codigo === p.codigo);
			if(existe) return prev.map(x => x.codigo===p.codigo?{...x, cantidad:x.cantidad+1}:x);
			return [...prev, { 
				codigo: p.codigo,
				descripcion: p.descripcion || p.producto,
				cantidad: 1,
				precio: precioBase,
				codbarra: p.codigobarra||p.codbarra||p.codigoaux||'',
				gravaiva: (p.grabaiva ?? p.gravaiva) === '0' ? '0' : '1'
			}];
		});
		setOpenProdModal(false);
	};

	const eliminarProducto = useCallback((codigo)=>{
		setProductos(prev=> prev.filter(p=> p.codigo!==codigo));
	},[]);

	const actualizarCantidad = useCallback((codigo, nueva)=>{
		setProductos(prev => prev.map(p=> p.codigo===codigo? { ...p, cantidad: Math.max(1, nueva) }:p));
	},[]);
	const seleccionarProveedor = (prov) => { setProveedor(prov); setOpenProvModal(false); };

	// Buscar por código de barras / código / auxiliar (similar a Ventas pero sin validar stock)
	const buscarPorCodigoBarras = useCallback(async (codigo) => {
		if(!codigo?.trim()) return;
		setLoading(true);
		try {
			let response = await productoController.getProductoByCodigoBarra(codigo.trim());
			if(!response.success || !response.data) {
				response = await productoController.getProductoByCodaux(codigo.trim());
			}
			if(!response.success || !response.data) {
				response = await productoController.getProductoByCodigo(codigo.trim());
			}
			if(response.success && response.data) {
				agregarProducto(response.data);
				setCodigoBarras('');
				if(window.barcodeDetectorInstance) {
					window.barcodeDetectorInstance.playSuccessSound?.();
					window.barcodeDetectorInstance.vibrate?.('success');
				}
			} else {
				if(window.barcodeDetectorInstance) {
					window.barcodeDetectorInstance.playErrorSound?.();
					window.barcodeDetectorInstance.vibrate?.('error');
				}
				window.alert?.('Producto no encontrado: '+codigo);
			}
		} catch(e){
			console.error('Error buscando producto en compras:', e);
			window.alert?.('Error buscando producto');
		} finally {
			setLoading(false);
		}
	}, [productoController]);

	// Guardar compra: encabezado, detalle (compradet), actualización stock y pcompra.
	const guardarCompra = useCallback(async () => {
		if(!habilitado) return;
		if(productos.length===0){ window.alert?.('No hay productos en la compra'); return; }
		if(!proveedor){ window.alert?.('Seleccione un proveedor'); return; }
		// Validación IMEIs (heurística simple)
		const productosConImeiPend = productos.filter(p=> {
			const requiere = /imei/i.test(p.descripcion||'') || (p.codbarra && p.codbarra.length>=14 && p.codbarra.length<=17);
			if(!requiere) return false;
			const arr = imeiMap[p.codigo]||[];
			return arr.length !== p.cantidad;
		});
		if(productosConImeiPend.length>0){
			if(!window.confirm('Faltan IMEIs para algunos productos. ¿Desea guardar de todas formas?')) return;
		}
		const subtotalGravado = productos.filter(p=> p.gravaiva==='1').reduce((s,p)=> s + (p.cantidad * p.precio), 0);
		const subtotalCero = productos.filter(p=> p.gravaiva!=='1').reduce((s,p)=> s + (p.cantidad * p.precio), 0);
		const subtotal = subtotalGravado + subtotalCero;
		const iva = compraData.considerar_iva ? subtotalGravado * 0.15 : 0; // 15% actual
		const total = subtotal + iva;
		try {
			const numfact = compraData.numfactura?.trim() || ('CF-' + Date.now().toString().slice(-6));
			const payload = {
				idprov: proveedor?.id || proveedor?.ruc || proveedor?.cedula || '',
				fecha: compraData.fecha,
				subtotal: subtotal,
				descuento: 0,
				total: total,
				fpago: 0,
				codempresa: 1,
				iva: iva,
				descripcion: `Compra proveedor ${proveedor?.empresa || proveedor?.nombre || ''}`.slice(0,190),
				numfactura: numfact,
				autorizacion: '',
				subtotal0: subtotalCero,
				credito: '', anticipada:'', pagado:'S', plazodias:0, tipo:'', sustento:'', trial272:''
			};
			const resp = await compraController.saveCompra(payload);
			if(!resp.success){ window.alert?.('Error guardando compra: '+resp.message); return; }
			const saved = resp.data;
			if(window.electronAPI?.dbRun){
				try {
					await window.electronAPI.dbRun('BEGIN');
					let hasDet=null; try { hasDet = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='compradet'"); } catch(_){ }
					let hasImei=null; try { hasImei = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='compraimei'"); } catch(_){ }
					const permitirDet = hasDet?.data?.name === 'compradet';
					const permitirImei = hasImei?.data?.name === 'compraimei';
					const procesar = async ()=>{
						for(const [idx, pr] of productos.entries()){
							try {
								await window.electronAPI.dbRun('UPDATE producto SET almacen = COALESCE(almacen,0) + ?, pcompra = ? WHERE codigo = ?', [pr.cantidad, pr.precio, pr.codigo]);
								if(permitirDet){
									await window.electronAPI.dbRun('INSERT INTO compradet (item, codprod, cantidad, precio, gravaiva, trial272, idcompra) VALUES (?, ?, ?, ?, ?, ?, ?)', [idx+1, pr.codigo, pr.cantidad, pr.precio, pr.gravaiva || pr.gravaiva || '1', '', saved.id]);
								}
								if(permitirImei){
									const imeis = imeiMap[pr.codigo] || [];
									for(const imei of imeis){
										await window.electronAPI.dbRun('INSERT INTO compraimei (codprod, idcompra, imei) VALUES (?, ?, ?)', [pr.codigo, saved.id, imei]);
									}
								}
							} catch(e){ console.warn('[COMPRAS] Error detalle/stock producto', pr.codigo, e); }
						}
					};
					await procesar();
					await window.electronAPI.dbRun('COMMIT');
				} catch(e){ console.error('[COMPRAS] Error transacción stock/detalle, rollback', e); try { await window.electronAPI.dbRun('ROLLBACK'); } catch(_){} }
			}
			setCompraId(saved.id);
			window.alert?.('Compra guardada');
		}catch(e){ console.error('Error guardando compra', e); window.alert?.('Error guardando compra'); }
	}, [habilitado, productos, proveedor, compraData, compraController, imeiMap]);

	// Detección automática simple por longitud/numerico (cuando NO está el detector físico)
	const detectarCodigoBarras = useCallback((valor) => {
		const v = valor.trim();
		if(v.length >= 8 && /[0-9A-Za-z]/.test(v)) {
			buscarPorCodigoBarras(v);
			return true;
		}
		return false;
	}, [buscarPorCodigoBarras]);

	const handleCodigoBarrasChange = useCallback((nuevo) => {
		// Solo actualizar el estado; no ejecutar búsqueda automática cuando AUTO está OFF.
		// El usuario debe presionar Enter o el botón Agregar.
		setCodigoBarras(nuevo);
		if(window.__comprasTimeout){ clearTimeout(window.__comprasTimeout); delete window.__comprasTimeout; }
	}, []);

	const toggleDeteccionAutomatica = useCallback(() => {
		if(!habilitado) return; // no activar si no está habilitado
		setDeteccionAutomaticaActiva(prev => {
			const next = !prev;
			if(!next) {
				if(window.barcodeDetectorInstance){
					try { window.barcodeDetectorInstance.stopListening?.(); } catch(_){}
					if(window.barcodeDetectorInstance) delete window.barcodeDetectorInstance;
				}
				delete window.__barcodeAutoScanActive;
			} else {
				window.__barcodeAutoScanActive = true; // mismo flag que Ventas
			}
			return next;
		});
	}, [habilitado]);

	// useEffect para detector físico (paridad cercana a Ventas, adaptado a Compras)
	useEffect(()=>{
		// Solo activar si habilitado y auto ON
		if(!deteccionAutomaticaActiva || !habilitado){
			if(window.barcodeDetectorInstance){
				try { window.barcodeDetectorInstance.stopListening?.(); } catch(_){ }
				delete window.barcodeDetectorInstance;
			}
			delete window.__barcodeAutoScanActive;
			return; 
		}
		let detector = null;
		const Ctor = BarcodeDetectorCtor();
		if(!Ctor){
			console.warn('[COMPRAS] BarcodeDetector no disponible; usando fallback inline');
			const config={ minLen:4, maxLen:50, maxGap:120 };
			let buffer=''; let last=0; let endTimer=null;
			const commit=()=>{ if(buffer.length>=config.minLen){ const code=buffer; buffer=''; last=0; setCodigoBarras(code); 
				// reflejar en input visible
				const input = document.querySelector('input[name="codigoBarrasCompras"], input[id="codigoBarrasCompras"]');
				if(input){ try { input.value = code; } catch(_){} const evt = new Event('input', { bubbles:true }); input.dispatchEvent(evt); }
				setTimeout(()=> buscarPorCodigoBarras(code),120);} };
			const onKeyDown=(e)=>{ const loc=(window.location && (window.location.hash||window.location.pathname)||'').toLowerCase(); if(!loc.includes('compra')) return; if(window.__barcodeAutoScanPaused) return; const now=Date.now(); if(e.key && e.key.length===1){ if(now-last>config.maxGap) buffer=''; last=now; e.preventDefault(); buffer+=e.key; if(buffer.length>config.maxLen) buffer=buffer.slice(-config.maxLen); if(endTimer) clearTimeout(endTimer); endTimer=setTimeout(commit, config.maxGap+25);} else if(e.key==='Enter' || e.key==='Tab'){ e.preventDefault(); if(endTimer){ clearTimeout(endTimer); endTimer=null;} commit(); } };
			detector={ startListening(){ document.addEventListener('keydown', onKeyDown, true); }, stopListening(){ document.removeEventListener('keydown', onKeyDown, true); buffer=''; if(endTimer){clearTimeout(endTimer); endTimer=null;} }, playSuccessSound() {}, playErrorSound(){}, vibrate(){} };
			detector.startListening();
		} else {
			detector = new Ctor((barcode)=>{
				console.log('[COMPRAS] Código escaneado:', barcode);
				setCodigoBarras(barcode);
				// actualizar input visible igual que en ventas
				const input = document.querySelector('input[name="codigoBarrasCompras"], input[id="codigoBarrasCompras"]');
				if(input){ try { input.value = barcode; } catch(_){} const evt = new Event('input', { bubbles:true }); input.dispatchEvent(evt); }
				setTimeout(()=> buscarPorCodigoBarras(barcode),150);
			}, { moduleContext:'compras', targetInputId:'codigoBarrasCompras', minBarcodeLength:4, maxBarcodeLength:30, sounds:{enabled:true}, vibration:{enabled:true} });
		}
		window.barcodeDetectorInstance = detector;
		window.__barcodeAutoScanActive = true;
		// Hidden sink para mantener foco
		const ensureSink=()=>{ let el=document.getElementById('__autoScanSinkCompras'); if(!el){ el=document.createElement('input'); el.type='text'; el.id='__autoScanSinkCompras'; el.setAttribute('autocomplete','off'); el.style.position='fixed'; el.style.left='-9999px'; el.style.top='0'; el.style.opacity='0'; el.style.width='1px'; el.style.height='1px'; el.style.pointerEvents='none'; el.setAttribute('aria-hidden','true'); document.body.appendChild(el);} return el; };
		const sink=ensureSink();
		const refocus=()=>{ if(!deteccionAutomaticaActiva || window.__barcodeAutoScanPaused) return; try { sink.focus(); } catch(_){} };
		sink.addEventListener('blur', ()=> setTimeout(refocus,0));
		refocus();
		detector.startListening?.();
		// Pausa al enfocar otros inputs
		const onFocusIn=(ev)=>{ const t=ev.target; const tag=(t&&t.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'||(t&&t.isContentEditable)){ const id=(t.id||'').toLowerCase(); const name=(t.name||'').toLowerCase(); if(id!=='codigobarrascompras' && name!=='codigobarrascompras'){ window.__barcodeAutoScanPaused=true; } } };
		const onFocusOut=()=>{ setTimeout(()=>{ const a=document.activeElement; const tag=(a&&a.tagName||'').toLowerCase(); const editable=a && (tag==='input'||tag==='textarea'||a.isContentEditable); if(!editable && !window.__barcodeModalOpen) delete window.__barcodeAutoScanPaused; },120); };
		document.addEventListener('focusin', onFocusIn, true);
		document.addEventListener('focusout', onFocusOut, true);
		return ()=>{
			try { detector.stopListening?.(); } catch(_){}
			if(window.barcodeDetectorInstance===detector) delete window.barcodeDetectorInstance;
			delete window.__barcodeAutoScanActive;
			const existing=document.getElementById('__autoScanSinkCompras'); if(existing){ try { existing.remove(); } catch(_) { existing.parentNode?.removeChild(existing);} }
			document.removeEventListener('focusin', onFocusIn, true);
			document.removeEventListener('focusout', onFocusOut, true);
		};
	}, [deteccionAutomaticaActiva, habilitado, BarcodeDetectorCtor, buscarPorCodigoBarras]);

	// Pausar escaneo si se abren modales de producto/proveedor (igual que en Ventas)
	useEffect(()=>{
		const anyModal = openProdModal || openProvModal;
		if(anyModal){ window.__barcodeAutoScanPaused = true; } else { delete window.__barcodeAutoScanPaused; }
		return ()=> { if(!openProdModal && !openProvModal) delete window.__barcodeAutoScanPaused; };
	}, [openProdModal, openProvModal]);

	// Cleanup timeout al desmontar
	useEffect(()=>()=> { if(window.__comprasTimeout) clearTimeout(window.__comprasTimeout); }, []);

	return (
		<>
		<div className="min-h-screen bg-gray-100 flex flex-col">
			<div className="flex flex-1">
				<ActionPanel
					onNuevo={nuevaCompra}
					onEditar={editarCompra}
					onRehacer={rehacerAccion}
					onEliminar={eliminarCompra}
					onGuardar={devolucionActiva ? guardarDevolucion : guardarCompra}
					onAbrirImei={abrirImei}
					onDevolucion={toggleDevolucion}
					onCerrar={cerrarVentana}
					loading={loading}
					disabled={!habilitado}
				/>
				<div className="flex-1 p-4 min-h-0 flex flex-col gap-4 overflow-hidden">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold text-gray-800">Compra # {compraId ?? '---'}</h1>
						{/* Espacio futuro para estado / número real */}
					</div>
					{/* Datos proveedor */}
					<div className="bg-white rounded-lg shadow border border-gray-200 p-4">
						<h2 className="text-sm font-semibold text-gray-700 mb-3">Compra a proveedor</h2>
						<div className="space-y-4">
							{/* Selector y datos del proveedor */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-2">
									<label className="text-xs font-medium text-gray-600 w-24">Proveedor</label>
									<input
										type="text"
										value={proveedor ? (proveedor.empresa || proveedor.nombre || '') : ''}
										readOnly
										onClick={()=> habilitado && setOpenProvModal(true)}
										placeholder={habilitado? 'Seleccionar':'(Nuevo primero)'}
										className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer disabled:bg-gray-100"
									/>
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
							{/* Factura y fecha */}
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
					{/* Panel Escáner / Búsqueda rápida */}
					<div className="bg-white rounded-lg shadow border border-gray-200 p-4">
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M8 8h4m0 0V4.01M12 8V4m8 4h1m-1 0v1m-1 0h-4m4 0V8m-4 8V8m0 8v4m-4-4h4"/></svg>
								<span className="text-sm font-medium text-gray-800">Escáner de Código / Búsqueda</span>
								{loading && <span className="text-xs text-blue-600 ml-2">Buscando...</span>}
							</div>
							<button
								type="button"
								onClick={toggleDeteccionAutomatica}
								className={`px-3 py-1 rounded text-xs font-medium transition-colors ${deteccionAutomaticaActiva ? 'bg-green-600 text-white hover:bg-green-700':'bg-gray-600 text-white hover:bg-gray-700'} disabled:opacity-40`}
								disabled={!habilitado}
								title={deteccionAutomaticaActiva? 'Detección automática activada':'Activar detección automática'}
							>
								{deteccionAutomaticaActiva? 'AUTO ON':'AUTO OFF'}
							</button>
						</div>
						<form onSubmit={(e)=> { e.preventDefault(); if(codigoBarras.trim()) buscarPorCodigoBarras(codigoBarras.trim()); }}>
							<div className="flex gap-2">
								<input
									id="codigoBarrasCompras"
									name="codigoBarrasCompras"
									type="text"
									placeholder={habilitado? (deteccionAutomaticaActiva? 'AUTO ON: escanee':'Escanee o escriba código / nombre y Enter') : '(Nuevo primero)'}
									className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
									value={codigoBarras}
									onChange={(e)=> handleCodigoBarrasChange(e.target.value)}
									disabled={!habilitado || loading || deteccionAutomaticaActiva}
									autoComplete="off"
								/>
								<button type="submit" disabled={!habilitado || loading || !codigoBarras.trim()} className="px-4 py-2 bg-gray-800 text-white rounded text-sm disabled:opacity-50">{loading? '...':'Agregar'}</button>
							</div>
						</form>
						<div className="text-xs text-gray-600 mt-2">
							{habilitado ? (deteccionAutomaticaActiva ? 'Detección automática activa: escanee directamente.':'Ingrese o escanee un código y presione Agregar / Enter. F2 abre el buscador avanzado.') : 'Inicie una compra para usar el escáner.'}
						</div>
					</div>
					{/* Tabla productos estandarizada */}
					<div className="flex-1 min-h-0 bg-white rounded border border-gray-200 flex flex-col">
						<div className="p-3 border-b border-gray-200">
							<h3 className="text-sm font-semibold text-gray-700">Productos en la Compra {devolucionActiva && <span className="text-red-600 font-normal">(Modo Devolución)</span>}</h3>
						</div>
						<div className="flex-1 overflow-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-50 sticky top-0">
									<tr>
										<th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Item</th>
										<th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Código</th>
										<th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cód. Barras</th>
										<th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cantidad</th>
										<th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Descripción</th>
										<th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. U.</th>
										<th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. Total</th>
										<th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Eliminar</th>
									</tr>
								</thead>
								<tbody>
								{!habilitado ? (
									<tr><td colSpan="8" className="text-center py-8 text-gray-500 text-sm">Pulse "Nuevo" para iniciar una compra.</td></tr>
								) : productos.length === 0 ? (
									<tr><td colSpan="8" className="text-center py-8 text-gray-500 text-sm">Sin productos. Use el escáner o F2.</td></tr>
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
											<input type="number" min="0" step="0.01" disabled={!habilitado} value={p.precio} onChange={e=>{
												const val = parseFloat(e.target.value)||0; setProductos(prev=> prev.map(x=> x.codigo===p.codigo?{...x, precio:val}:x));
											}} className="w-24 text-right text-sm border border-gray-300 rounded bg-white px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
										</td>
										<td className="py-2 px-3 text-right font-medium text-gray-900">{(p.cantidad * p.precio).toFixed(2)}</td>
										<td className="py-2 px-3 text-center">
											<button onClick={()=> eliminarProducto(p.codigo)} disabled={!habilitado} className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/40 disabled:opacity-40" title="Eliminar producto" type="button">
												<TrashIcon size={16} />
											</button>
										</td>
									</tr>
								))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<div className="w-72 p-4 bg-gray-50 border-l border-gray-200">
					<TotalesPanel compraData={compraData} setCompraData={setCompraData} totales={totales} />
				</div>
			</div>
			<BuscarProductoModal isOpen={openProdModal} onClose={()=> setOpenProdModal(false)} onSelect={agregarProducto} />
			<BuscarProveedorModal isOpen={openProvModal} onClose={()=> setOpenProvModal(false)} onSelect={seleccionarProveedor} />
		</div>
		<ImeiModal
			isOpen={imeiModalOpen}
			onClose={()=> setImeiModalOpen(false)}
			producto={imeiProductoSel}
			cantidad={imeiProductoSel?.cantidad || 0}
			onSave={(producto, imeis)=>{
				setImeiMap(prev=> ({ ...prev, [producto.codigo]: imeis }));
				setImeiModalOpen(false);
				// Seleccionar siguiente producto pendiente automáticamente
				const siguiente = productos.find(p=> {
					if(p.codigo===producto.codigo) return false; const arr=prev[p.codigo]||[]; return arr.length < p.cantidad;
				});
				if(siguiente){ setTimeout(()=> { setImeiProductoSel(siguiente); setImeiModalOpen(true); }, 200); }
			}}
		/>
	</>
);
};

export default ComprasView;
