import React from 'react';
import useVentas from '../../hooks/useVentas';
import ActionPanel from './ActionPanel';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from './BuscarProductoModal';
import TipoPagoModal from './TipoPagoModal';
import ComprobanteVenta from '../../components/ComprobanteVenta';
import Modal from '../../components/Modal';
import { useEffect, useState } from 'react';
import { TrashIcon } from '../../components/Icons';
import EditarComprobantesModal from './EditarComprobantesModal';

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
  creditoConfig,
    searchModalOpen,
    resultadosBusqueda,
    comprobanteModalOpen,
    comprobanteData,
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
  cerrarComprobante,
    
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
    imprimirComprobante,
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
  const [editarComprobantesOpen, setEditarComprobantesOpen] = useState(false);

  // Pause auto-scan while any modal is open to avoid input blocking
  useEffect(() => {
    const anyModal = tipoPagoModalOpen || searchModalOpen || historialOpen || comprobanteModalOpen;
    if (anyModal) {
      window.__barcodeAutoScanPaused = true;
    } else {
      delete window.__barcodeAutoScanPaused;
    }
    return () => { delete window.__barcodeAutoScanPaused; };
  }, [tipoPagoModalOpen, searchModalOpen, historialOpen, comprobanteModalOpen]);

  // Manejar tecla Escape para cerrar modal del comprobante
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        console.log('Tecla Escape presionada, cerrando modal');
              cerrarComprobante();
      }
    };
    
    if (comprobanteModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
    }, [comprobanteModalOpen, cerrarComprobante]);

  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;
    const remove = window.electronAPI.onMenuAction(async (action) => {
      switch (action) {
        case 'menu-nueva-venta':
          // Equivalente a botón Nuevo: limpiar y activar
          nuevaVenta();
          break;
        case 'menu-guardar-venta':
          guardarVenta();
          break;
        case 'menu-imprimir-comprobante':
          imprimirComprobante();
          break;
        case 'menu-nuevo-cliente':
          if (window.electronAPI?.openClienteWindow) {
            await window.electronAPI.openClienteWindow();
          }
          break;
        case 'menu-historial-ventas':
          try {
            // Consulta principal de ventas
            const res = await window.electronAPI.dbQuery(
              `SELECT id, fecha, total, fpago, formapago, numfactura FROM venta ORDER BY fecha DESC, id DESC LIMIT 200`
            );
            
            if (res.success && res.data) {
              // Para cada venta, obtener los detalles adicionales
              const ventasConDetalles = await Promise.all(res.data.map(async (venta) => {
                // Obtener productos de ventadet
                const productosRes = await window.electronAPI.dbQuery(
                  `SELECT cantidad, producto FROM ventadet WHERE idventa = ? ORDER BY item`,
                  [venta.id]
                );
                
                // Obtener información de crédito si aplica
                let creditoInfo = null;
                if (venta.fpago !== 0) { // Si no es contado
                  // Tomar info base de la tabla credito si existe
                  const creditoRes = await window.electronAPI.dbQuery(
                    `SELECT plazo_dias, abono_inicial, saldo FROM credito WHERE idventa = ? LIMIT 1`,
                    [venta.id]
                  );

                  const cuotasRes = await window.electronAPI.dbQuery(
                    `SELECT COUNT(*) as num_cuotas FROM cuotas WHERE idventa = ?`,
                    [venta.id]
                  );

                  const abonosRes = await window.electronAPI.dbQuery(
                    `SELECT COUNT(*) as num_abonos, SUM(monto) as total_abonos FROM abono WHERE idventa = ?`,
                    [venta.id]
                  );

                  creditoInfo = {
                    plazo_dias: (creditoRes.success && creditoRes.data?.[0]?.plazo_dias) || 0,
                    abono_inicial: (creditoRes.success && creditoRes.data?.[0]?.abono_inicial) || 0,
                    saldo: (creditoRes.success && creditoRes.data?.[0]?.saldo) || 0,
                    num_cuotas: (cuotasRes.success && cuotasRes.data?.[0]?.num_cuotas) || 0,
                    num_abonos: (abonosRes.success && abonosRes.data?.[0]?.num_abonos) || 0,
                    total_abonos: (abonosRes.success && abonosRes.data?.[0]?.total_abonos) || 0
                  };
                }
                
                return {
                  ...venta,
                  productos: productosRes.success ? productosRes.data.map(p => `${p.cantidad} x ${p.producto}`).join(', ') : 'Sin productos',
                  tipo_pago: venta.fpago === 0 ? 'Contado' : (venta.fpago === 1 ? 'Crédito' : 'Plan'),
                  creditoInfo
                };
              }));
              
              setVentasHistorial(ventasConDetalles);
            }
            setHistorialOpen(true);
          } catch (e) {
            console.error('Error al cargar historial:', e);
          }
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
          setEditarComprobantesOpen(true);
          break;
        default:
          break;
      }
    });
    return () => { if (remove) remove(); };
  }, [nuevaVenta, guardarVenta, setSearchModalOpen, setFormaPago, setTipoPagoModalOpen]);

  const handleBuscar = () => {
    setSearchModalOpen(true);
  };

  const handleImprimir = () => {
    imprimirComprobante();
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
          disabled={!ventaActiva}
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
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
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
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-700 text-sm disabled:opacity-70"
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
              {ventaActiva ? (
                <>
                  Tipo de venta: <span className="font-semibold">{tipoVenta}</span> · Forma de pago: <span className="font-semibold">{formaPago?.tipo}{formaPago?.tarjeta ? ` (${formaPago.tarjeta})` : ''}</span>
                  <button className="ml-3 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300" onClick={() => setTipoPagoModalOpen(true)}>Cambiar…</button>
                  {(tipoVenta === 'credito' || tipoVenta === 'plan') && (
                    <span className="ml-3 text-gray-700">
                      Abono inicial: <span className="font-semibold">${Number(creditoConfig?.abonoInicial||0).toFixed(2)}</span>
                      {` · Plazo: `}<span className="font-semibold">{Number(creditoConfig?.plazoDias||0)} días</span>
                      {tipoVenta === 'plan' && <span className="ml-2 italic text-indigo-600">(Plan: productos reservados, no se entregan aún)</span>}
                    </span>
                  )}
                </>
              ) : <span className="italic text-gray-500">Presione "Nuevo" para iniciar una venta</span>}
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
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Apellidos"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombres</label>
                <input
                  type="text"
                  value={cliente.nombres}
                  onChange={(e) => updateClienteField('nombres', e.target.value)}
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
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
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="RUC/CI y presione ENTER"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={cliente.telefono}
                  onChange={(e) => updateClienteField('telefono', e.target.value)}
                  disabled={!ventaActiva}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
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
                disabled={!ventaActiva}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${!ventaActiva ? 'bg-gray-100 text-gray-400' : (deteccionAutomaticaActiva ? 'bg-gray-50 text-gray-500' : 'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500')}`}
                    placeholder={deteccionAutomaticaActiva ? 'AUTO ON: escanee sin seleccionar este campo' : 'Escanear código de barras o digitar código...'}
                    disabled={!ventaActiva || loading || deteccionAutomaticaActiva}
                    autoComplete="off"
                    autoFocus={ventaActiva && !deteccionAutomaticaActiva}
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
                  disabled={!ventaActiva || loading || !codigoBarras.trim()}
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
              {!ventaActiva ? 'Presione "Nuevo" para iniciar una venta.' : (
                deteccionAutomaticaActiva 
                ? 'Detección automática activada: Solo escanee el código para agregar productos' 
                : 'Detección automática desactivada: Escanee o escriba el código y presione "Agregar"'
              )}
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
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {!ventaActiva ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500 text-sm">Presione "Nuevo" para iniciar una venta.</td>
                    </tr>
                  ) : productos.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-500 text-sm">
                        No hay productos agregados. Use el escáner.
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
                              disabled={!ventaActiva}
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
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => eliminarProducto(producto.codigo)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-50 text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            disabled={!ventaActiva}
                            title="Eliminar producto"
                            aria-label={`Eliminar ${producto.descripcion}`}
                            type="button"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </td>
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
          <TotalesPanel totales={totales} tipoVenta={tipoVenta} creditoConfig={creditoConfig} />
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
                    <th className="text-left py-2 px-3">Productos</th>
                    <th className="text-left py-2 px-3">Tipo Pago</th>
                    <th className="text-left py-2 px-3">Fecha</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasHistorial.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-6 text-gray-500">Sin registros</td></tr>
                  ) : ventasHistorial.map(v => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 px-3">{v.numfactura || v.id}</td>
                      <td className="py-2 px-3 max-w-xs truncate" title={v.productos}>{v.productos}</td>
                      <td className="py-2 px-3">
                        <div>
                          <span className="font-medium">{v.tipo_pago}</span>
                          {v.creditoInfo && v.fpago !== 0 && (
                            <div className="text-xs text-gray-600">
                              {v.creditoInfo.plazo_dias > 0 && <span>Plazo: {v.creditoInfo.plazo_dias} días</span>}
                              {v.creditoInfo.abono_inicial > 0 && <span> | Abono inicial: ${Number(v.creditoInfo.abono_inicial).toFixed(2)}</span>}
                              {v.creditoInfo.num_cuotas > 0 && <span> | Cuotas: {v.creditoInfo.num_cuotas}</span>}
                              {v.creditoInfo.num_abonos > 0 && <span> | Abonos: {v.creditoInfo.num_abonos}</span>}
                              {v.creditoInfo.saldo > 0 && <span> | Saldo: ${Number(v.creditoInfo.saldo).toFixed(2)}</span>}
                            </div>
                          )}
                        </div>
                      </td>
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
        creditoConfig={creditoConfig}
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

      {/* Modal del comprobante */}
      {comprobanteModalOpen && comprobanteData && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              // Cerrar modal si se hace clic fuera del contenido
              if (e.target === e.currentTarget) {
                cerrarComprobante();
              }
            }}
          >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Comprobante de Venta</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  type="button"
                >
                  Imprimir
                </button>
                <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  cerrarComprobante();
                }}
                className="text-gray-600 hover:text-gray-900 text-xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                title="Cerrar"
                type="button"
              >
                ×
              </button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-120px)]">
              <ComprobanteVenta
                ventaData={comprobanteData.ventaData}
                productos={comprobanteData.productos}
                totales={comprobanteData.totales}
                cliente={comprobanteData.cliente}
                empresa={comprobanteData.empresa}
                onClose={() => cerrarComprobante()}
              />
            </div>
            {/* Sin botones inferiores: solo se usa la X del encabezado */}
          </div>
        </div>
        </>
      )}
      <EditarComprobantesModal open={editarComprobantesOpen} onClose={() => setEditarComprobantesOpen(false)} />
  </>
  );
};

export default VentasView;
