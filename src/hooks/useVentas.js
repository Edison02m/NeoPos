import { useState, useEffect, useCallback } from 'react';
import ProductoController from '../controllers/ProductoController';
import ClienteController from '../controllers/ClienteController';
import BarcodeDetector from '../utils/barcodeDetector';

// Exportar como función nombrada (no arrow) para evitar cualquier rareza de interop
export function useVentas() {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [ventaActiva, setVentaActiva] = useState(false);
  const [tipoVenta, setTipoVenta] = useState('contado'); // contado | credito | plan
  const [deteccionAutomaticaActiva, setDeteccionAutomaticaActiva] = useState(false); // Estado para controlar detección automática
  const [cliente, setCliente] = useState({
    nombres: '',
    apellidos: '',
    ruc: '',
    telefono: '',
    direccion: ''
  });
  const [ventaData, setVentaData] = useState({
    tipo_comprobante: 'nota', // 'nota' | 'factura'
    numero_comprobante: ''
  });
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  
  // Estados para autocompletado de clientes
  const [clienteSugerencias, setClienteSugerencias] = useState([]);
  const [showClienteSugerencias, setShowClienteSugerencias] = useState(false);
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Controladores
  const productoController = new ProductoController();
  const clienteController = new ClienteController();

  // Cargar clientes al inicializar y preparar número de comprobante
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await clienteController.getAllClientes();
        if (response.success) {
          setClientesDisponibles(response.data || []);
        }
      } catch (error) {
        console.error('Error al cargar clientes:', error);
      }
    };
    
    cargarClientes();
    generarNumeroComprobante('nota');
  }, []);

  // Generar el siguiente número de comprobante consultando BD; fallback con timestamp
  const generarNumeroComprobante = useCallback(async (tipo = 'nota') => {
    try {
      if (!window?.electronAPI?.dbGetSingle) {
        const ts = Date.now().toString().slice(-6);
        const base = tipo === 'factura' ? '002-001' : '001-001';
        setVentaData(prev => ({ ...prev, tipo_comprobante: tipo, numero_comprobante: `${base}-${ts}` }));
        return;
      }
      const tipoTexto = tipo === 'factura' ? 'Factura' : 'Nota de venta';
      const res = await window.electronAPI.dbGetSingle(
        'SELECT numero_comprobante FROM ventas WHERE tipo_comprobante = ? ORDER BY id DESC LIMIT 1',
        [tipoTexto]
      );
      let nuevo;
      if (res?.success && res.data?.numero_comprobante) {
        const partes = String(res.data.numero_comprobante).split('-');
        if (partes.length === 3) {
          const sec = String((parseInt(partes[2], 10) || 0) + 1).padStart(5, '0');
          nuevo = `${partes[0]}-${partes[1]}-${sec}`;
        }
      }
      if (!nuevo) {
        nuevo = tipo === 'factura' ? '002-001-00001' : '001-001-00001';
      }
      setVentaData(prev => ({ ...prev, tipo_comprobante: tipo, numero_comprobante: nuevo }));
    } catch (e) {
      console.error('Error generando número de comprobante:', e);
      const ts = Date.now().toString().slice(-5);
      const base = tipo === 'factura' ? '002-001' : '001-001';
      setVentaData(prev => ({ ...prev, tipo_comprobante: tipo, numero_comprobante: `${base}-${ts}` }));
    }
  }, []);

  // Función para agregar producto a la lista
  const agregarProducto = useCallback((producto) => {
    setProductos(prev => {
      const productoExistente = prev.find(p => p.codigo === producto.codigo);
      
      if (productoExistente) {
        // Si el producto ya existe, aumentar cantidad
        return prev.map(p => 
          p.codigo === producto.codigo 
            ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio }
            : p
        );
      } else {
        // Agregar nuevo producto
        const nuevoProducto = {
          codigo: producto.codigo,
          codbarra: producto.codbarra || producto.codigo,  // Guardar código de barras
          descripcion: producto.producto || producto.descripcion,
          precio: parseFloat(producto.pvp) || 0,
          cantidad: 1,
          stock: producto.almacen || 0,
          subtotal: parseFloat(producto.pvp) || 0
        };
        return [...prev, nuevoProducto];
      }
    });
  }, []);

  // Función para buscar productos por código de barras
  const buscarPorCodigoBarras = useCallback(async (codigo) => {
    if (!codigo.trim()) return;
    
    setLoading(true);
    console.log('Buscando producto con código:', codigo);
    
    try {
      // Primero buscar por código de barras
      let response = await productoController.getProductoByCodigoBarra(codigo);
      
      // Si no encuentra, buscar por código auxiliar
      if (!response.success || !response.data) {
        response = await productoController.getProductoByCodaux(codigo);
      }
      
      // Si no encuentra, buscar por código principal
      if (!response.success || !response.data) {
        response = await productoController.getProductoByCodigo(codigo);
      }
      
      if (response.success && response.data) {
        console.log('Producto encontrado:', response.data);
        
        // Agregar el producto automáticamente
        agregarProducto(response.data);
        setCodigoBarras(''); // Limpiar campo de código de barras
        
        // Feedback visual opcional
        if (window.barcodeDetectorInstance) {
          window.barcodeDetectorInstance.playSuccessSound();
          window.barcodeDetectorInstance.vibrate('success');
        }
      } else {
        console.log('Producto no encontrado para código:', codigo);
        
        // Feedback de error
        if (window.barcodeDetectorInstance) {
          window.barcodeDetectorInstance.playErrorSound();
          window.barcodeDetectorInstance.vibrate('error');
        }
        
        alert(`Producto no encontrado para el código: ${codigo}`);
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      alert('Error al buscar producto');
    } finally {
      setLoading(false);
    }
  }, [agregarProducto]);

  // Función para detectar automáticamente códigos de barras en el input
  const detectarCodigoBarras = useCallback((codigo) => {
    const codigoLimpio = codigo.trim();
    
    // Verificar si parece un código de barras válido
    if (codigoLimpio.length >= 8 && /^\d+$/.test(codigoLimpio)) {
      // Es probable que sea un código de barras, buscarlo automáticamente
      console.log('Detectando código de barras automáticamente:', codigoLimpio);
      buscarPorCodigoBarras(codigoLimpio);
      return true;
    }
    return false;
  }, [buscarPorCodigoBarras]);

  // Función mejorada para manejar cambios en el input de código de barras
  const handleCodigoBarrasChange = useCallback((nuevoValor) => {
    setCodigoBarras(nuevoValor);
    
    // Solo hacer detección automática si está habilitada y no hay escáner físico activo
    if (!deteccionAutomaticaActiva && nuevoValor.length >= 10) {
      const timeoutId = setTimeout(() => {
        detectarCodigoBarras(nuevoValor);
      }, 300); // Esperar 300ms después del último cambio
      
      // Limpiar timeout anterior si existe
      if (window.barcodeTimeout) {
        clearTimeout(window.barcodeTimeout);
      }
      window.barcodeTimeout = timeoutId;
    }
  }, [deteccionAutomaticaActiva, detectarCodigoBarras]);

  // Función para alternar la detección automática
  const toggleDeteccionAutomatica = useCallback(() => {
    setDeteccionAutomaticaActiva(prev => {
      const newValue = !prev;
      console.log(`Detección automática ${newValue ? 'ACTIVADA' : 'DESACTIVADA'}`);
      return newValue;
    });
  }, []);

  // Listener para códigos de barras escaneados - DESPUÉS de definir buscarPorCodigoBarras
  useEffect(() => {
    // Solo activar si la detección automática está habilitada
    if (!deteccionAutomaticaActiva) {
      // Limpiar cualquier detector anterior
      if (window.barcodeDetectorInstance) {
        window.barcodeDetectorInstance.stopListening();
        delete window.barcodeDetectorInstance;
      }
      return;
    }

    // Crear instancia del detector de códigos de barras para escáneres físicos
    const barcodeDetector = new BarcodeDetector((barcode) => {
      console.log('Código de barras escaneado con escáner físico:', barcode);
      setCodigoBarras(barcode); // Poner el código en el input
      buscarPorCodigoBarras(barcode); // Y buscarlo automáticamente
    }, {
      minBarcodeLength: 4,
      maxBarcodeLength: 30,
      sounds: { enabled: true },
      vibration: { enabled: true }
    });
    
    // Guardar referencia global para usar en otras funciones
    window.barcodeDetectorInstance = barcodeDetector;
    
    // Iniciar escucha
    barcodeDetector.startListening();
    
    // Cleanup
    return () => {
      barcodeDetector.stopListening();
      if (window.barcodeDetectorInstance === barcodeDetector) {
        delete window.barcodeDetectorInstance;
      }
      if (window.barcodeTimeout) {
        clearTimeout(window.barcodeTimeout);
        delete window.barcodeTimeout;
      }
    };
  }, [deteccionAutomaticaActiva, buscarPorCodigoBarras]);

  // Función para buscar productos por descripción
  const buscarProductos = useCallback(async (termino) => {
    if (!termino.trim()) {
      setResultadosBusqueda([]);
      return;
    }
    
    try {
      const response = await productoController.searchProductos(termino);
      if (response.success) {
        setResultadosBusqueda(response.data || []);
      } else {
        setResultadosBusqueda([]);
      }
    } catch (error) {
      console.error('Error al buscar productos:', error);
      setResultadosBusqueda([]);
    }
  }, [productoController]);

  // Función para buscar clientes con autocompletado
  const buscarClientes = useCallback(async (termino, campo) => {
    if (!termino.trim()) {
      setClienteSugerencias([]);
      setShowClienteSugerencias(false);
      return;
    }

    try {
      const response = await clienteController.searchClientes(termino);
      if (response.success && response.data) {
        const sugerencias = response.data.filter(cliente => {
          switch (campo) {
            case 'nombres':
              return cliente.nombres && cliente.nombres.toLowerCase().includes(termino.toLowerCase());
            case 'apellidos':
              return cliente.apellidos && cliente.apellidos.toLowerCase().includes(termino.toLowerCase());
            case 'ruc':
              return cliente.cedula && cliente.cedula.includes(termino);
            default:
              return cliente.nombres?.toLowerCase().includes(termino.toLowerCase()) ||
                     cliente.apellidos?.toLowerCase().includes(termino.toLowerCase()) ||
                     cliente.cedula?.includes(termino);
          }
        });
        setClienteSugerencias(sugerencias.slice(0, 5)); // Limitar a 5 sugerencias
        setShowClienteSugerencias(sugerencias.length > 0);
      } else {
        setClienteSugerencias([]);
        setShowClienteSugerencias(false);
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error);
      setClienteSugerencias([]);
      setShowClienteSugerencias(false);
    }
  }, [clienteController]);

  // Función para seleccionar cliente del autocompletado
  const seleccionarCliente = (clienteSeleccionado) => {
    setCliente({
      nombres: clienteSeleccionado.nombres || '',
      apellidos: clienteSeleccionado.apellidos || '',
      ruc: clienteSeleccionado.cedula || '',
      telefono: clienteSeleccionado.telefono || '',
      direccion: clienteSeleccionado.direccion || ''
    });
    setClienteSugerencias([]);
    setShowClienteSugerencias(false);
  };

  // Función para actualizar campo de cliente con autocompletado
  const updateClienteField = (field, value) => {
    setCliente(prev => ({ ...prev, [field]: value }));
    
    // Activar autocompletado si el campo es nombres, apellidos o ruc
    if (['nombres', 'apellidos', 'ruc'].includes(field)) {
      buscarClientes(value, field);
    }
  };

  // Función para actualizar cantidad de producto
  const actualizarCantidad = (codigo, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarProducto(codigo);
      return;
    }
    
    setProductos(productos.map(p => 
      p.codigo === codigo 
        ? { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precio }
        : p
    ));
  };

  // Función para eliminar producto
  const eliminarProducto = (codigo) => {
    setProductos(productos.filter(p => p.codigo !== codigo));
  };

  // Calcular totales
  const totales = {
    subtotal: productos.reduce((sum, p) => sum + p.subtotal, 0),
    get iva() { return this.subtotal * 0.12; },
    get total() { return this.subtotal + this.iva; }
  };

  // Función para limpiar venta
  const limpiarVenta = () => {
    setProductos([]);
    setCliente({
      nombres: '',
      apellidos: '',
      ruc: '',
      telefono: '',
      direccion: ''
    });
    setCodigoBarras('');
    setBusquedaProducto('');
    setResultadosBusqueda([]);
    setClienteSugerencias([]);
    setShowClienteSugerencias(false);
  setTipoVenta('contado');
  setVentaData(prev => ({ ...prev, numero_comprobante: '', tipo_comprobante: prev.tipo_comprobante || 'nota' }));
  };

  // Nueva venta
  const nuevaVenta = () => {
    limpiarVenta();
    setVentaActiva(true);
  generarNumeroComprobante(ventaData.tipo_comprobante || 'nota');
  };

  // Deshacer venta
  const deshacerVenta = () => {
    limpiarVenta();
    setVentaActiva(false);
  };

  // Función para guardar venta
  const guardarVenta = async () => {
    if (productos.length === 0) {
      alert('Debe agregar al menos un producto');
      return;
    }

    if ((tipoVenta === 'credito' || tipoVenta === 'plan') && (!cliente.ruc && !cliente.nombres)) {
      alert('Para ventas a crédito o plan acumulativo debe seleccionar/ingresar un cliente');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos de la venta
      const tipoTexto = (ventaData.tipo_comprobante === 'factura') ? 'Factura' : 'Nota de venta';
      const fechaIso = new Date().toISOString();

      // Iniciar transacción
      await window.electronAPI.dbRun('BEGIN TRANSACTION');

      // Insertar venta
      const ventaInsert = await window.electronAPI.dbRun(
        `INSERT INTO ventas (
          numero_comprobante, tipo_comprobante, fecha,
          cliente_nombres, cliente_apellidos, cliente_ruc_ci,
          cliente_telefono, cliente_direccion,
          subtotal, descuento, iva, total, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaData.numero_comprobante,
          tipoTexto,
          fechaIso,
          cliente.nombres || null,
          cliente.apellidos || null,
          cliente.ruc || null,
          cliente.telefono || null,
          cliente.direccion || null,
          Number(totales.subtotal) || 0,
          0,
          Number(totales.iva) || 0,
          Number(totales.total) || 0,
          'completada'
        ]
      );

      const ventaId = ventaInsert?.id;

      // Insertar items y actualizar stock
      for (const item of productos) {
        await window.electronAPI.dbRun(
          `INSERT INTO venta_items (
            venta_id, producto_id, codigo_barras, descripcion,
            cantidad, precio_unitario, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            parseInt(item.codigo, 10) || 0,
            item.codbarra || null,
            item.descripcion,
            Number(item.cantidad) || 0,
            Number(item.precio) || 0,
            Number(item.subtotal) || 0
          ]
        );

        // Actualizar stock por código
        await window.electronAPI.dbRun(
          'UPDATE producto SET almacen = almacen - ? WHERE codigo = ?',
          [Number(item.cantidad) || 0, item.codigo]
        );
      }

      // Confirmar transacción
      await window.electronAPI.dbRun('COMMIT');

      alert('Venta guardada exitosamente');
      limpiarVenta();
      setVentaActiva(false);
      // Preparar siguiente número para la próxima venta
      await generarNumeroComprobante(ventaData.tipo_comprobante || 'nota');
    } catch (error) {
      console.error('Error al guardar venta:', error);
      try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
      alert('Error al guardar venta');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar tipo de comprobante y generar número automáticamente
  const cambiarTipoComprobante = async (nuevoTipo) => {
    await generarNumeroComprobante(nuevoTipo);
  };

  return {
    // Estados
    productos,
    codigoBarras,
    busquedaProducto,
    cliente,
  ventaData,
  ventaActiva,
  tipoVenta,
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
    setCliente,
  setVentaData,
  setTipoVenta,
    setSearchModalOpen,
    
    // Funciones
  nuevaVenta,
  deshacerVenta,
  cambiarTipoComprobante,
    buscarPorCodigoBarras,
    buscarProductos,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    updateClienteField,
    seleccionarCliente,
    limpiarVenta,
    guardarVenta,
    handleCodigoBarrasChange,
    detectarCodigoBarras,
    toggleDeteccionAutomatica
  };
}

export default useVentas;
