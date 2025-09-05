import React, { useEffect, useState } from 'react';
import ActionPanel from './ActionPanel';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from '../../components/BuscarProductoModal';
import BuscarProveedorModal from '../../components/BuscarProveedorModal';

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

	return (
		<div className="min-h-screen bg-gray-300 flex flex-col">
			<div className="flex flex-1">
				<ActionPanel
					onNuevo={nuevaCompra}
					onEditar={editarCompra}
					onRehacer={rehacerAccion}
					onEliminar={eliminarCompra}
					onGuardar={guardarCompra}
					onCerrar={cerrarVentana}
					loading={false}
					disabled={!habilitado}
				/>
				<div className="flex-1 p-2 min-h-0 flex flex-col">
					<div className="mb-2"><div className="text-sm font-bold text-black">Compra # ---</div></div>
					<div className="mb-2 bg-gray-200 border border-gray-400 rounded-sm">
						<div className="px-2 py-1 bg-gray-300 border-b border-gray-400"><div className="text-sm font-semibold text-black">Compra a proveedor</div></div>
						<div className="p-2">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
								<div className="space-y-2">
									<div className="flex items-center space-x-2">
										<label className="text-sm font-medium text-black w-20">Proveedor:</label>
										<input type="text" value={proveedor? proveedor.nombre: ''} readOnly onClick={()=> habilitado && setOpenProvModal(true)} placeholder={habilitado? 'Seleccionar':'(Nuevo primero)'} className="flex-1 px-2 py-1 border border-gray-400 bg-white text-sm cursor-pointer" />
									</div>
									<div className="flex items-center space-x-2">
										<label className="text-sm font-medium text-black w-20">N° factura:</label>
										<input type="text" disabled={!habilitado} value={compraData.numfactura} onChange={e=> setCompraData(c=>({...c, numfactura:e.target.value}))} className="flex-1 px-2 py-1 border border-gray-400 bg-white text-sm disabled:bg-gray-100" />
									</div>
								</div>
								<div className="flex items-center space-x-2 justify-self-end">
									<label className="text-sm font-medium text-black">Fecha:</label>
									<input type="date" disabled={!habilitado} value={compraData.fecha} onChange={e=> setCompraData(c=>({...c, fecha:e.target.value}))} className="px-2 py-1 border border-gray-400 bg-white text-sm disabled:bg-gray-100" />
								</div>
							</div>
						</div>
					</div>
					<div className="flex-1 min-h-0 bg-white border-2 border-black flex flex-col">
						<div className="flex-1 overflow-auto">
							<table className="w-full border-collapse">
								<thead className="bg-gray-200">
									<tr>
										<th className="text-left py-1 px-2 text-sm font-semibold text-black border-r border-b border-black">Item</th>
										<th className="text-left py-1 px-2 text-sm font-semibold text-black border-r border-b border-black">Cód. barra</th>
										<th className="text-left py-1 px-2 text-sm font-semibold text-black border-r border-b border-black">Cantidad</th>
										<th className="text-left py-1 px-2 text-sm font-semibold text-black border-r border-b border-black">Producto</th>
										<th className="text-right py-1 px-2 text-sm font-semibold text-black border-r border-b border-black">P. Unitario</th>
										<th className="text-right py-1 px-2 text-sm font-semibold text-black border-b border-black">P. Total</th>
									</tr>
								</thead>
								<tbody>
									{productos.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-600 text-sm">{habilitado? 'Presione F2 para buscar productos.':'Pulse Nuevo para iniciar una compra.'}</td></tr>}
									{productos.map((p,i)=>(
										<tr key={p.codigo} className="hover:bg-gray-50">
											<td className="py-1 px-2 text-sm text-black border-r border-b border-gray-300">{i+1}</td>
											<td className="py-1 px-2 text-sm text-black border-r border-b border-gray-300">{p.codbarra || <span className="text-gray-400 italic text-xs">N/A</span>}</td>
											<td className="py-1 px-2 border-r border-b border-gray-300">
												<input type="number" min="1" disabled={!habilitado} value={p.cantidad} onChange={e=>{
													const val = parseInt(e.target.value)||0; setProductos(prev=> prev.map(x=> x.codigo===p.codigo?{...x, cantidad:val}:x));
												}} className="w-16 text-center text-sm border border-gray-400 bg-white px-1 disabled:bg-gray-100" />
											</td>
											<td className="py-1 px-2 text-sm text-black border-r border-b border-gray-300">{p.descripcion}</td>
											<td className="py-1 px-2 text-right border-r border-b border-gray-300">
												<input type="number" min="0" step="0.01" disabled={!habilitado} value={p.precio} onChange={e=>{
													const val = parseFloat(e.target.value)||0; setProductos(prev=> prev.map(x=> x.codigo===p.codigo?{...x, precio:val}:x));
												}} className="w-20 text-right text-sm border border-gray-400 bg-white px-1 disabled:bg-gray-100" />
											</td>
											<td className="py-1 px-2 text-right text-sm font-medium text-black border-b border-gray-300">{(p.cantidad * p.precio).toFixed(2)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
				<div className="w-64 p-2 bg-gray-300 border-l-2 border-black">
					<TotalesPanel compraData={compraData} setCompraData={setCompraData} totales={totales} />
				</div>
			</div>
			<BuscarProductoModal isOpen={openProdModal} onClose={()=> setOpenProdModal(false)} onSelect={agregarProducto} />
			<BuscarProveedorModal isOpen={openProvModal} onClose={()=> setOpenProvModal(false)} onSelect={seleccionarProveedor} />
		</div>
	);
};

export default ComprasView;
