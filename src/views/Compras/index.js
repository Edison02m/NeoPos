import React from 'react';
import { useEffect, useState, useCallback } from 'react';
import ActionPanel from './ActionPanel';
import TotalesPanel from './TotalesPanel';
import BuscarProductoModal from './BuscarProductoModal';
import BuscarProveedorModal from './BuscarProveedorModal';
import { TrashIcon } from '../../components/Icons';
import CompraController from '../../controllers/CompraController';
import Compra from '../../models/Compra';

const ComprasView = () => {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [compraData, setCompraData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    numfactura: '',
    autorizacion: '',
    fpago: 'efectivo',
    considerar_iva: true,
    descripcion: ''
  });
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [totales, setTotales] = useState({
    subtotal: 0,
    descuento: 0,
    iva: 0,
    total: 0
  });
  const [buscarProductoModalOpen, setBuscarProductoModalOpen] = useState(false);
  const [buscarProveedorModalOpen, setBuscarProveedorModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Función para calcular totales
  const calcularTotales = useCallback(() => {
    const subtotal = productos.reduce((sum, p) => sum + (p.cantidad * p.preciocompra), 0);
    const descuentoVal = compraData.descuento || 0;
    const subtotalConDescuento = subtotal - descuentoVal;
    const iva = compraData.considerar_iva ? subtotalConDescuento * 0.12 : 0;
    const total = subtotalConDescuento + iva;
    
    setTotales({
      subtotal: subtotal,
      descuento: descuentoVal,
      iva: iva,
      total: total
    });
  }, [productos, compraData.descuento, compraData.considerar_iva]);

  // Efecto para recalcular totales
  useEffect(() => {
    calcularTotales();
  }, [calcularTotales]);

  // Funciones del panel de acciones
  const nuevaCompra = () => {
    setProductos([]);
    setProveedorSeleccionado(null);
    setCompraData({
      fecha: new Date().toISOString().split('T')[0],
      numfactura: '',
      autorizacion: '',
      fpago: 'efectivo',
      considerar_iva: true,
      descripcion: ''
    });
  };

  const deshacer = () => {
    if (productos.length > 0) {
      const nuevosProductos = [...productos];
      nuevosProductos.pop();
      setProductos(nuevosProductos);
    }
  };

  const guardarCompra = async () => {
    try {
      setLoading(true);
      
      if (!proveedorSeleccionado) {
        alert('Debe seleccionar un proveedor');
        return;
      }

      if (productos.length === 0) {
        alert('Debe agregar al menos un producto');
        return;
      }

      const compra = new Compra({
        idprov: proveedorSeleccionado.id,
        fecha: compraData.fecha,
        numfactura: compraData.numfactura,
        autorizacion: compraData.autorizacion,
        subtotal: totales.subtotal,
        descuento: totales.descuento,
        iva: totales.iva,
        total: totales.total,
        fpago: compraData.fpago,
        descripcion: compraData.descripcion
      });

      await CompraController.crearCompra(compra, productos);
      alert('Compra guardada correctamente');
      nuevaCompra();
      
    } catch (error) {
      console.error('Error al guardar compra:', error);
      alert('Error al guardar la compra');
    } finally {
      setLoading(false);
    }
  };

  const limpiarCompra = () => {
    nuevaCompra();
  };

  const imprimirComprobante = () => {
    console.log('Imprimir comprobante');
  };

  const salir = () => {
    const ventana = require('electron').remote?.getCurrentWindow();
    if (ventana) {
      ventana.close();
    } else {
      window.close();
    }
  };

  // Función para agregar producto
  const agregarProducto = (producto) => {
    const productoExistente = productos.find(p => p.id === producto.id);
    
    if (productoExistente) {
      const nuevosProductos = productos.map(p => 
        p.id === producto.id 
          ? { ...p, cantidad: p.cantidad + 1 }
          : p
      );
      setProductos(nuevosProductos);
    } else {
      const nuevoProducto = {
        ...producto,
        cantidad: 1,
        preciocompra: producto.preciocompra || 0
      };
      setProductos([...productos, nuevoProducto]);
    }
  };

  // Función para actualizar cantidad
  const actualizarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarProducto(id);
      return;
    }
    
    const nuevosProductos = productos.map(p => 
      p.id === id ? { ...p, cantidad: parseInt(nuevaCantidad) } : p
    );
    setProductos(nuevosProductos);
  };

  // Función para actualizar precio
  const actualizarPrecio = (id, nuevoPrecio) => {
    const nuevosProductos = productos.map(p => 
      p.id === id ? { ...p, preciocompra: parseFloat(nuevoPrecio) || 0 } : p
    );
    setProductos(nuevosProductos);
  };

  // Función para eliminar producto
  const eliminarProducto = (id) => {
    const nuevosProductos = productos.filter(p => p.id !== id);
    setProductos(nuevosProductos);
  };

  // Función para seleccionar proveedor
  const seleccionarProveedor = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setBuscarProveedorModalOpen(false);
  };

  // Eventos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2 para buscar producto
      if (e.key === 'F2') {
        e.preventDefault();
        setBuscarProductoModalOpen(true);
      }
      // Escape para cerrar modales
      if (e.key === 'Escape') {
        setBuscarProductoModalOpen(false);
        setBuscarProveedorModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex h-screen bg-gray-100">
        {/* Panel de acciones izquierdo */}
        <ActionPanel
          onNuevo={nuevaCompra}
          onDeshacer={deshacer}
          onGuardar={guardarCompra}
          onLimpiar={limpiarCompra}
          onBuscar={() => setBuscarProductoModalOpen(true)}
          onImprimir={imprimirComprobante}
          onSalir={salir}
          loading={loading}
        />

        {/* Área principal */}
        <div className="flex-1 flex flex-col">
          {/* Encabezado */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-800">Compras</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestión de compras y proveedores - Presiona F2 para buscar productos
            </p>
          </div>

          {/* Tabla de productos */}
          <div className="flex-1 p-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow h-full flex flex-col">
              <div className="flex-1 overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Item</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cód. Barras</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Cantidad</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Producto</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. Unitario</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">P. Total</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-b border-gray-200">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto, index) => (
                      <tr key={producto.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="py-2 px-3 text-sm text-gray-700">{producto.codigobarras || '-'}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min="1"
                            value={producto.cantidad}
                            onChange={(e) => actualizarCantidad(producto.id, e.target.value)}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-sm text-gray-900">{producto.nombre}</td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={producto.preciocompra}
                            onChange={(e) => actualizarPrecio(producto.id, e.target.value)}
                            className="w-20 px-2 py-1 text-sm text-right border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-sm text-right text-gray-900">
                          ${(producto.cantidad * producto.preciocompra).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => eliminarProducto(producto.id)}
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {productos.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500">
                          No hay productos agregados. Presiona F2 para buscar productos.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de totales derecho */}
        <TotalesPanel
          compraData={compraData}
          totales={totales}
          proveedorSeleccionado={proveedorSeleccionado}
          onProveedorClick={() => setBuscarProveedorModalOpen(true)}
          onCompraDataChange={setCompraData}
        />
      </div>

      {/* Modales */}
      {buscarProductoModalOpen && (
        <BuscarProductoModal
          onClose={() => setBuscarProductoModalOpen(false)}
          onSelect={(producto) => {
            agregarProducto(producto);
            setBuscarProductoModalOpen(false);
          }}
        />
      )}

      {buscarProveedorModalOpen && (
        <BuscarProveedorModal
          onClose={() => setBuscarProveedorModalOpen(false)}
          onSelectProveedor={seleccionarProveedor}
        />
      )}
    </>
  );
};

export default ComprasView;
