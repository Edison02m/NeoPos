import React from 'react';
import useVentas from '../../hooks/useVentas';
import ActionPanel from './ActionPanel';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from './BuscarProductoModal';
import TipoPagoModal from './TipoPagoModal';
import Modal from '../../components/Modal';
import { useEffect, useState } from 'react';

const VentasView = () => {
  const {
    // Estados
    productos,
    codigoBarras,
    busquedaProducto,
    cliente,
    ventaData,
    ventaActiva,
  tipoVenta,
  formaPago,
    searchModalOpen,
    resultadosBusqueda,
    clienteSugerencias,
    showClienteSugerencias,
    loading,
    totales,
    deteccionAutomaticaActiva,
    
    // Setters
    setCodigoBarras,
    setBusquedaProducto,
    setVentaData,
  setTipoVenta,
  setFormaPago,
  setCreditoConfig,
    setSearchModalOpen,
    
    // Funciones
    nuevaVenta,
    deshacerVenta,
    buscarPorCodigoBarras,
    buscarProductos,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    updateClienteField,
    seleccionarCliente,
    limpiarVenta,
    guardarVenta,
    cambiarTipoComprobante,
    handleCodigoBarrasChange,
    detectarCodigoBarras,
    toggleDeteccionAutomatica,
    // Modal functions and state
    modalState,
    showAlert,
    showConfirm
  } = useVentas();

  // Ensure a comprobante number is always present for the current type
  useEffect(() => {
    if (!ventaData?.numero_comprobante) {
      cambiarTipoComprobante(ventaData?.tipo_comprobante || 'nota');
    }
  }, [ventaData?.tipo_comprobante]);

  // Historial de ventas (simple)
  const [historialOpen, setHistorialOpen] = useState(false);
  const [ventasHistorial, setVentasHistorial] = useState([]);
  const [tipoPagoModalOpen, setTipoPagoModalOpen] = useState(false);

  // Pause auto-scan while any modal is open to avoid input blocking
  useEffect(() => {
    const anyModal = tipoPagoModalOpen || searchModalOpen || historialOpen;
    if (anyModal) {
      window.__barcodeAutoScanPaused = true;
    } else {
      delete window.__barcodeAutoScanPaused;
    }
    return () => { delete window.__barcodeAutoScanPaused; };
  }, [tipoPagoModalOpen, searchModalOpen, historialOpen]);

  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;
    const remove = window.electronAPI.onMenuAction(async (action) => {
      switch (action) {
        case 'menu-nueva-venta':
          // Equivalente a botón Nuevo: limpiar y activar
          nuevaVenta();
          break;
        case 'menu-buscar-producto':
          setSearchModalOpen(true);
          break;
        case 'menu-guardar-venta':
          guardarVenta();
          break;
        case 'menu-nuevo-cliente':
          if (window.electronAPI?.openClienteWindow) {
            await window.electronAPI.openClienteWindow();
          }
          break;
        case 'menu-historial-ventas':
          try {
            const res = await window.electronAPI.dbQuery(
              `SELECT id, fecha, total, fpago, formapago, comprob, numfactura FROM venta ORDER BY fecha DESC, id DESC LIMIT 200`
            );
            if (res.success) setVentasHistorial(res.data || []);
            setHistorialOpen(true);
          } catch (_) {}
          break;
        case 'menu-venta-contado':
          setTipoVenta('contado');
          break;
        case 'menu-venta-credito':
          setTipoVenta('credito');
          break;
        case 'menu-venta-plan':
          setTipoVenta('plan');
          break;
        case 'menu-pago-efectivo':
          setFormaPago({ tipo: 'efectivo', tarjeta: null });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-cheque':
          setFormaPago({ tipo: 'cheque', tarjeta: null });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-tarjeta-mastercard':
          setFormaPago({ tipo: 'tarjeta', tarjeta: 'Mastercard' });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-tarjeta-visa':
          setFormaPago({ tipo: 'tarjeta', tarjeta: 'Visa' });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-tarjeta-diners':
          setFormaPago({ tipo: 'tarjeta', tarjeta: 'Diners Club' });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-tarjeta-cuota-facil':
          setFormaPago({ tipo: 'tarjeta', tarjeta: 'Cuota Fácil' });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-pago-tarjeta-amex':
          setFormaPago({ tipo: 'tarjeta', tarjeta: 'American Express' });
          setTipoPagoModalOpen(true);
          break;
        case 'menu-editar-comprobante':
          {
            const nuevoTipo = window.prompt('Tipo de comprobante (nota/factura):', ventaData.tipo_comprobante || 'nota');
            if (nuevoTipo && (nuevoTipo === 'nota' || nuevoTipo === 'factura')) {
              const nuevoNumero = window.prompt('Número de comprobante:', ventaData.numero_comprobante || '');
              if (nuevoNumero) {
                setVentaData({ ...ventaData, tipo_comprobante: nuevoTipo, numero_comprobante: nuevoNumero });
              }
            }
          }
          break;
        default:
          break;
      }
    });
    return () => { if (remove) remove(); };
  }, [nuevaVenta, guardarVenta, setSearchModalOpen]);

  const handleBuscar = () => {
    setSearchModalOpen(true);
  };

  const handleImprimir = () => {
    alert('Función de impresión en desarrollo');
  };

  const handleSalir = () => {
    if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow();
    } else {
      window.close();
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Panel izquierdo - Acciones */}
        <ActionPanel 
          onNuevo={nuevaVenta}
          onDeshacer={deshacerVenta}
          onGuardar={guardarVenta}
          onLimpiar={limpiarVenta}
          onBuscar={handleBuscar}
          onImprimir={handleImprimir}
          onSalir={handleSalir}
          loading={loading}
        />

        {/* Área central - Formulario y productos */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          {/* Header Section - Comprobante */}
          <div className="mb-2 p-3 bg-white rounded border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Comprobante</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Tipo de Comprobante */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tipo de Comprobante
                </label>
                <select
                  value={ventaData.tipo_comprobante || 'nota'}
                  onChange={(e) => cambiarTipoComprobante(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="nota">Nota de venta</option>
                  <option value="factura">Factura</option>
                </select>
              </div>

              {/* Número de Comprobante */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  No.
                </label>
                <input
                  type="text"
                  value={ventaData.numero_comprobante || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 text-sm"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Fecha
                </label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString('es-ES')}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 text-sm"
                />
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Tipo de venta: <span className="font-semibold">{tipoVenta}</span> · Forma de pago: <span className="font-semibold">{formaPago?.tipo}{formaPago?.tarjeta ? ` (${formaPago.tarjeta})` : ''}</span>
              <button className="ml-3 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300" onClick={() => setTipoPagoModalOpen(true)}>Cambiar…</button>
            </div>
          </div>

          {/* Client Section */}
          <div className="mb-2 p-3 bg-white rounded border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={cliente.apellidos}
                  onChange={(e) => updateClienteField('apellidos', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Apellidos"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                <input
                  type="text"
                  value={cliente.nombres}
                  onChange={(e) => updateClienteField('nombres', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombres"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CI/RUC</label>
                <input
                  type="text"
                  value={cliente.ruc}
                  onChange={(e) => updateClienteField('ruc', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      updateClienteField('ruc', e.target.value.trim());
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="RUC/CI y presione ENTER"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={cliente.telefono}
                  onChange={(e) => updateClienteField('telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Teléfono"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección</label>
              <input
                type="text"
                value={cliente.direccion}
                onChange={(e) => updateClienteField('direccion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dirección"
              />
            </div>
            
            {/* Client Suggestions */}
            {showClienteSugerencias && clienteSugerencias.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-32 overflow-y-auto">
                {clienteSugerencias.map((sugerencia, index) => (
                  <div
                    key={index}
                    onClick={() => seleccionarCliente(sugerencia)}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 text-sm">
                      {sugerencia.nombres} {sugerencia.apellidos}
                    </div>
                    <div className="text-xs text-gray-500">
                      {sugerencia.cedula && `CI/RUC: ${sugerencia.cedula}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barcode Scanner Section */}
          <div className="mb-2 p-3 bg-white rounded border border-gray-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-black mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M8 8h4m0 0V4.01M12 8V4m8 4h1m-1 0v1m-1 0h-4m4 0V8m-4 8V8m0 8v4m-4-4h4"></path>
                </svg>
                <span className="text-sm font-medium text-black">Escáner de Código de Barras</span>
                {loading && (
                  <div className="ml-2 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-1 text-xs text-black">Buscando...</span>
                  </div>
                )}
              </div>
              
              {/* Botón de detección automática */}
              <button
                type="button"
                onClick={toggleDeteccionAutomatica}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  deteccionAutomaticaActiva
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
                title={deteccionAutomaticaActiva ? 'Detección automática activada - Click para desactivar' : 'Detección automática desactivada - Click para activar'}
              >
                {deteccionAutomaticaActiva ? (
                  <>
                    <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    AUTO ON
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    AUTO OFF
                  </>
                )}
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (codigoBarras.trim()) {
                buscarPorCodigoBarras(codigoBarras.trim());
              }
            }}>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    name="codigoBarras"
                    id="codigoBarras"
                    value={codigoBarras}
                    onChange={(e) => handleCodigoBarrasChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (codigoBarras.trim()) {
                          buscarPorCodigoBarras(codigoBarras.trim());
                        }
                      }
                    }}
                    className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${deteccionAutomaticaActiva ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500'}`}
                    placeholder={deteccionAutomaticaActiva ? 'AUTO ON: escanee sin seleccionar este campo' : 'Escanear código de barras o digitar código...'}
                    disabled={loading || deteccionAutomaticaActiva}
                    autoComplete="off"
                    autoFocus={!deteccionAutomaticaActiva}
                  />
                  {codigoBarras && (
                    <button
                      type="button"
                      onClick={() => setCodigoBarras('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !codigoBarras.trim()}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {loading ? 'Buscando...' : 'Agregar'}
                </button>
              </div>
            </form>
            
            {/* Instrucciones de uso */}
            <div className="text-xs text-gray-600 mt-2 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {deteccionAutomaticaActiva 
                ? 'Detección automática activada: Solo escanea el código para agregar productos' 
                : 'Detección automática desactivada: Escanea o escribe el código y presiona "Agregar"'
              }
            </div>
          </div>

          {/* Products Table Section */}
          <div className="flex-1 min-h-0 bg-white rounded border border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Productos en la Venta</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Item</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Código</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cód. Barras</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cantidad</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Descripción</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. U.</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. Total</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500 text-sm">
                        No hay productos agregados. Use el escáner o busque productos con F2.
                      </td>
                    </tr>
                  ) : (
                    productos.map((producto, index) => (
                      <tr key={producto.codigo} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm text-gray-700">{index + 1}</td>
                        <td className="py-2 px-3 text-sm text-gray-700 font-mono">{producto.codigo}</td>
                        <td className="py-2 px-3 text-sm text-gray-700">
                          {producto.codbarra && producto.codbarra !== producto.codigo 
                            ? <span className="font-mono">{producto.codbarra}</span>
                            : <span className="text-gray-400 italic">N/A</span>
                          }
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => actualizarCantidad(producto.codigo, producto.cantidad - 1)}
                              className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm">{producto.cantidad}</span>
                            <button
                              onClick={() => actualizarCantidad(producto.codigo, producto.cantidad + 1)}
                              disabled={producto.cantidad >= producto.stock}
                              className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-sm">
                          <div className="text-gray-900">{producto.descripcion}</div>
                          <div className="text-xs text-gray-500">Stock: {producto.stock}</div>
                        </td>
                        <td className="py-2 px-3 text-sm text-right text-gray-700">${producto.precio.toFixed(2)}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-gray-900">${producto.subtotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Panel derecho - Totales */}
        <div className="w-64 p-2 flex-shrink-0">
          <TotalesPanel totales={totales} />
        </div>
      </div>

      {/* Product Search Modal */}
      <BuscarProductoModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        busquedaProducto={busquedaProducto}
        setBusquedaProducto={setBusquedaProducto}
        resultadosBusqueda={resultadosBusqueda}
        buscarProductos={buscarProductos}
        agregarProducto={agregarProducto}
      />
  </div>

      {/* Historial ventas modal simple */}
  {historialOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[800px] max-h-[80vh] rounded shadow border p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Historial de Ventas</h3>
              <button onClick={() => setHistorialOpen(false)} className="text-gray-600 hover:text-gray-900">✕</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3">ID</th>
                    <th className="text-left py-2 px-3">Comprobante</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasHistorial.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-6 text-gray-500">Sin registros</td></tr>
                  ) : ventasHistorial.map(v => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 px-3">{v.id}</td>
                      <td className="py-2 px-3">{v.numero_comprobante}</td>
                      <td className="py-2 px-3">{v.tipo_comprobante}</td>
                      <td className="py-2 px-3">{new Date(v.fecha).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">${(Number(v.total)||0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <button onClick={() => setHistorialOpen(false)} className="px-3 py-1 bg-gray-800 text-white rounded">Cerrar</button>
            </div>
          </div>
        </div>
      )}
      <TipoPagoModal
        isOpen={tipoPagoModalOpen}
  onClose={() => setTipoPagoModalOpen(false)}
        tipoVenta={tipoVenta}
        setTipoVenta={setTipoVenta}
        formaPago={formaPago}
        setFormaPago={setFormaPago}
        creditoConfig={{}}
        setCreditoConfig={setCreditoConfig}
        total={totales.total}
      />

      {/* Modal de alertas y confirmaciones */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={modalState.onClose}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
  </>
  );
};

export default VentasView;
