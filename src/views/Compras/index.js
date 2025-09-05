import React, { useEffect, useState, useCallback } from 'react';
import ActionPanel from './ActionPanel';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from '../../components/BuscarProductoModal';
import BuscarProveedorModal from '../../components/BuscarProveedorModal';
import ProductoController from '../../controllers/ProductoController';
import * as BD from '../../utils/barcodeDetector';

const ComprasView = () => {
	const [productos, setProductos] = useState([]); // {codigo, descripcion, cantidad, precio, codbarra}
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

	// Controlador de productos
	const productoController = new ProductoController();

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

	const nuevaCompra = () => { setHabilitado(true); setProductos([]); setProveedor(null); setCompraData(c=>({...c, numfactura:'', fecha:new Date().toISOString().split('T')[0]})); };
	const editarCompra = () => { /* placeholder editar */ };
	const rehacerAccion = () => { /* placeholder rehacer */ };
	const eliminarCompra = () => { if(!habilitado) return; if(window.confirm('Eliminar items de la compra actual?')) setProductos([]); };
	const guardarCompra = () => { /* placeholder guardar */ };
	const cerrarVentana = () => window.electronAPI?.closeCurrentWindow?.();
	const agregarProducto = (p) => {
		setProductos(prev => {
			const existe = prev.find(x => x.codigo === p.codigo);
			if(existe) return prev.map(x => x.codigo===p.codigo?{...x, cantidad:x.cantidad+1}:x);
			return [...prev, { codigo:p.codigo, descripcion:p.descripcion, cantidad:1, precio: p.precio_compra||p.precio||0, codbarra: p.codigobarra||p.codigoaux||'' }];
		});
		setOpenProdModal(false);
	};
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
		setCodigoBarras(nuevo);
		if(!deteccionAutomaticaActiva && nuevo.length >= 10) {
			if(window.__comprasTimeout) clearTimeout(window.__comprasTimeout);
			window.__comprasTimeout = setTimeout(()=> detectarCodigoBarras(nuevo), 300);
		}
	}, [deteccionAutomaticaActiva, detectarCodigoBarras]);

	const toggleDeteccionAutomatica = useCallback(() => {
		if(!habilitado) return; // no activar si no está habilitado
		setDeteccionAutomaticaActiva(prev => {
			const next = !prev;
			if(!next && window.barcodeDetectorInstance) {
				window.barcodeDetectorInstance.stopListening?.();
				delete window.barcodeDetectorInstance;
				delete window.__barcodeAutoScanActive;
			}
			return next;
		});
	}, [habilitado]);

	// useEffect para detector físico (paridad completa con Ventas, adaptado a Compras)
	useEffect(()=>{
		if(!deteccionAutomaticaActiva) {
			if (window.barcodeDetectorInstance) {
				window.barcodeDetectorInstance.stopListening?.();
				delete window.barcodeDetectorInstance;
			}
			delete window.__barcodeAutoScanActive;
			return;
		}
		const Ctor = BarcodeDetectorCtor();
		let detector = null;
		if(!Ctor) {
			// Fallback inline similar al de Ventas pero con contexto compras
			const config = { minLen:4, maxLen:50, maxGap:120 };
			let buffer=''; let last=0; let endTimer=null;
			const commit = ()=> { if(buffer.length>=config.minLen){ const code=buffer; buffer=''; last=0; setCodigoBarras(code); setTimeout(()=> buscarPorCodigoBarras(code),100);} };
			const onKeyDown = (e)=> {
				if(!deteccionAutomaticaActiva) return;
				// limitar a ruta compras
				const loc=(window.location && (window.location.hash||window.location.pathname)||'').toLowerCase();
				if(!loc.includes('compra')) return;
				const now=Date.now();
				if(e.key && e.key.length===1){ if(now-last>config.maxGap) buffer=''; last=now; e.preventDefault(); buffer+=e.key; if(buffer.length>config.maxLen) buffer=buffer.slice(-config.maxLen); if(endTimer) clearTimeout(endTimer); endTimer=setTimeout(commit, config.maxGap+20);} else if(e.key==='Enter'){ e.preventDefault(); if(endTimer){clearTimeout(endTimer); endTimer=null;} commit(); }
			};
			detector = { startListening(){ document.addEventListener('keydown', onKeyDown, true); }, stopListening(){ document.removeEventListener('keydown', onKeyDown, true); buffer=''; if(endTimer){clearTimeout(endTimer); endTimer=null;} } };
			detector.startListening();
			window.barcodeDetectorInstance = detector;
			window.__barcodeAutoScanActive = true;
		} else {
			detector = new Ctor((barcode)=> {
				setCodigoBarras(barcode);
				setTimeout(()=> buscarPorCodigoBarras(barcode), 150);
			}, { moduleContext:'compras', targetInputId:'codigoBarrasCompras', minBarcodeLength:4, maxBarcodeLength:30, sounds:{enabled:true}, vibration:{enabled:true} });
			window.barcodeDetectorInstance = detector;
			window.__barcodeAutoScanActive = true;
			// hidden sink para capturar enfoque y evitar escribir en inputs no deseados
			const ensureSink = () => { let el=document.getElementById('__autoScanSinkCompras'); if(!el){ el=document.createElement('input'); el.type='text'; el.id='__autoScanSinkCompras'; el.style.position='fixed'; el.style.left='-9999px'; el.style.top='0'; el.style.opacity='0'; el.style.width='1px'; el.style.height='1px'; el.setAttribute('aria-hidden','true'); document.body.appendChild(el);} return el; };
			const sink = ensureSink();
			const refocus = () => { if(!deteccionAutomaticaActiva || window.__barcodeAutoScanPaused) return; try { sink.focus(); } catch(_){} };
			sink.addEventListener('blur', ()=> setTimeout(refocus,0));
			refocus();
			detector.startListening();
			// Pausar cuando se enfoca un input editable distinto al de código directo
			const onFocusIn = (ev)=> { const t=ev.target; const tag=(t && t.tagName||'').toLowerCase(); if(tag==='input' || tag==='textarea' || (t && t.isContentEditable)){ const id=(t.id||'').toLowerCase(); const name=(t.name||'').toLowerCase(); if(id!=='códigobarrascompras' && name!=='códigobarrascompras' && id!=='codigobarrascompras' && name!=='codigobarrascompras'){ window.__barcodeAutoScanPaused = true; } } };
			const onFocusOut = ()=> { setTimeout(()=> { const a=document.activeElement; const tag=(a && a.tagName||'').toLowerCase(); const editable = a && (tag==='input'||tag==='textarea'||a.isContentEditable); if(!editable && !window.__barcodeModalOpen) delete window.__barcodeAutoScanPaused; },120); };
			document.addEventListener('focusin', onFocusIn, true);
			document.addEventListener('focusout', onFocusOut, true);
			// cleanup extended
			return () => {
				try { detector.stopListening?.(); } catch(_){}
				if(window.barcodeDetectorInstance === detector) delete window.barcodeDetectorInstance;
				delete window.__barcodeAutoScanActive;
				const existing=document.getElementById('__autoScanSinkCompras'); if(existing){ try { existing.remove(); } catch(_){ existing.parentNode?.removeChild(existing);} }
				document.removeEventListener('focusin', onFocusIn, true);
				document.removeEventListener('focusout', onFocusOut, true);
			};
		}
		return () => {
			// fallback cleanup para rama fallback
			if(detector && detector.stopListening) {
				try { detector.stopListening(); } catch(_){}}
			if(window.barcodeDetectorInstance === detector) delete window.barcodeDetectorInstance;
			delete window.__barcodeAutoScanActive;
		};
	}, [deteccionAutomaticaActiva, BarcodeDetectorCtor, buscarPorCodigoBarras]);

	// Cleanup timeout al desmontar
	useEffect(()=>()=> { if(window.__comprasTimeout) clearTimeout(window.__comprasTimeout); }, []);

	return (
		<div className="min-h-screen bg-gray-100 flex flex-col">
			<div className="flex flex-1">
				<ActionPanel
					onNuevo={nuevaCompra}
					onEditar={editarCompra}
					onRehacer={rehacerAccion}
					onEliminar={eliminarCompra}
					onGuardar={guardarCompra}
					onCerrar={cerrarVentana}
					loading={loading}
					disabled={!habilitado}
				/>
				<div className="flex-1 p-4 min-h-0 flex flex-col gap-4 overflow-hidden">
					<div className="flex items-center justify-between">
						<h1 className="text-lg font-semibold text-gray-800">Compra # ---</h1>
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
					{/* Tabla productos */}
					<div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden">
						<div className="flex-1 overflow-auto">
							<table className="w-full text-sm">
								<thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
									<tr>
										<th className="text-left py-2 px-2 font-medium w-12">Item</th>
										<th className="text-left py-2 px-2 font-medium w-32">Cód. barra</th>
										<th className="text-left py-2 px-2 font-medium w-24">Cantidad</th>
										<th className="text-left py-2 px-2 font-medium">Producto</th>
										<th className="text-right py-2 px-2 font-medium w-32">P. Unitario</th>
										<th className="text-right py-2 px-2 font-medium w-32">P. Total</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100">
									{productos.length === 0 && (
										<tr>
											<td colSpan={6} className="text-center py-12 text-gray-500 text-sm">
												{habilitado? 'Presione F2 para buscar productos.' : 'Pulse Nuevo para iniciar una compra.'}
											</td>
										</tr>
									)}
									{productos.map((p,i)=>(
										<tr key={p.codigo} className="hover:bg-blue-50/70">
											<td className="py-2 px-2 text-gray-700">{i+1}</td>
											<td className="py-2 px-2 text-gray-700">{p.codbarra || <span className="text-gray-400 italic text-xs">N/A</span>}</td>
											<td className="py-2 px-2">
												<input type="number" min="1" disabled={!habilitado} value={p.cantidad} onChange={e=>{
													const val = parseInt(e.target.value)||0; setProductos(prev=> prev.map(x=> x.codigo===p.codigo?{...x, cantidad:val}:x));
												}} className="w-20 text-center text-sm border border-gray-300 rounded bg-white px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
											</td>
											<td className="py-2 px-2 text-gray-700">{p.descripcion}</td>
											<td className="py-2 px-2 text-right">
												<input type="number" min="0" step="0.01" disabled={!habilitado} value={p.precio} onChange={e=>{
													const val = parseFloat(e.target.value)||0; setProductos(prev=> prev.map(x=> x.codigo===p.codigo?{...x, precio:val}:x));
												}} className="w-24 text-right text-sm border border-gray-300 rounded bg-white px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-gray-100" />
											</td>
											<td className="py-2 px-2 text-right font-medium text-gray-800">{(p.cantidad * p.precio).toFixed(2)}</td>
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
	);
};

export default ComprasView;
