import { useState, useEffect, useCallback } from 'react';
import ProductoController from '../controllers/ProductoController';
import ClienteController from '../controllers/ClienteController';
import * as BD from '../utils/barcodeDetector';
// Resolver compatible: intenta named, default o factory
const __resolveBarcodeCtor = () => {
  if (typeof BD.BarcodeDetector === 'function') return BD.BarcodeDetector;
  if (typeof BD.default === 'function') return BD.default;
  return null;
};
const BarcodeDetectorCtor = __resolveBarcodeCtor();

// Exportar como función nombrada (no arrow) para evitar cualquier rareza de interop
export function useVentas() {
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [ventaActiva, setVentaActiva] = useState(false);
  const [tipoVenta, setTipoVenta] = useState('contado'); // contado | credito | plan
  // Forma de pago y detalle de tarjeta (cuando aplique)
  const [formaPago, setFormaPago] = useState({ tipo: 'efectivo', tarjeta: null });
  // Configuración de crédito/plan: plazo y abono inicial
  const [creditoConfig, setCreditoConfig] = useState({ plazoDias: 30, abonoInicial: 0 });
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
      const stock = parseInt(producto.almacen ?? producto.stock ?? 0, 10) || 0;
      const existente = prev.find(p => p.codigo === producto.codigo);

      // No permitir venta si no hay stock
      if (!existente && stock <= 0) {
        if (window.barcodeDetectorInstance) {
          window.barcodeDetectorInstance.playErrorSound?.();
          window.barcodeDetectorInstance.vibrate?.('error');
        }
        alert('Stock insuficiente: el producto no tiene existencias.');
        return prev;
      }

      if (existente) {
        if (existente.cantidad >= (existente.stock || stock || 0)) {
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          alert('No puede superar el stock disponible para este producto.');
          return prev;
        }
        // Incrementar sin superar stock
        return prev.map(p => {
          if (p.codigo !== producto.codigo) return p;
          const nuevaCantidad = Math.min((p.cantidad + 1), (p.stock || stock || 0));
          return { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precio };
        });
      }

      // Agregar nuevo producto (cantidad inicial 1, ya validado stock>0)
      const precio = parseFloat(producto.pvp) || 0;
      const nuevoProducto = {
        codigo: producto.codigo,
        codbarra: producto.codbarra || producto.codigo,
        descripcion: producto.producto || producto.descripcion,
        precio,
        cantidad: 1,
        stock: stock,
        subtotal: precio
      };
      return [...prev, nuevoProducto];
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
        // Validar stock antes de agregar
        const stock = parseInt(response.data.almacen ?? 0, 10) || 0;
        if (stock <= 0) {
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          alert('Producto sin existencias. No se puede vender.');
          setCodigoBarras('');
          return;
        }

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
      console.log(`[VENTAS] Detección automática ${newValue ? 'ACTIVADA' : 'DESACTIVADA'}`);
      
      // Si se está desactivando, limpiar inmediatamente el detector
      if (!newValue && window.barcodeDetectorInstance) {
        console.log('[VENTAS] Limpiando detector en toggle OFF');
        window.barcodeDetectorInstance.stopListening();
        delete window.barcodeDetectorInstance;
      }
      // Comunicar al ScanGuard para que bloquee escritura en inputs mientras AUTO está activo
      if (newValue) {
        window.__barcodeAutoScanActive = true;
      } else {
        delete window.__barcodeAutoScanActive;
      }
      
      return newValue;
    });
  }, []);

  // Listener para códigos de barras escaneados - DESPUÉS de definir buscarPorCodigoBarras
  useEffect(() => {
    console.log(`[VENTAS] useEffect detector - deteccionAutomaticaActiva: ${deteccionAutomaticaActiva}`);
    
    // Solo activar si la detección automática está habilitada
    if (!deteccionAutomaticaActiva) {
      // Limpiar cualquier detector anterior
      if (window.barcodeDetectorInstance) {
        console.log('[VENTAS] Deteniendo detector anterior');
        window.barcodeDetectorInstance.stopListening();
        delete window.barcodeDetectorInstance;
      }
  // Desactivar el flag global
  delete window.__barcodeAutoScanActive;
      return;
    }

  console.log('[VENTAS] Creando nuevo detector de códigos de barras');
    
    // Crear instancia del detector específico para ventas
  let barcodeDetector = null;
    if (!BarcodeDetectorCtor) {
      // Intentar con la factory si existe
      if (typeof BD.createBarcodeDetector === 'function') {
        try {
          barcodeDetector = BD.createBarcodeDetector((barcode) => {
            console.log('[VENTAS] Código de barras escaneado con escáner físico:', barcode);
            setCodigoBarras(barcode);
            setTimeout(() => {
              console.log('[VENTAS] Buscando producto automáticamente:', barcode);
              buscarPorCodigoBarras(barcode);
            }, 150);
            const barcodeInput = document.querySelector('input[name="codigoBarras"], input[id="codigoBarras"], input[placeholder*="buscar producto"]');
            if (barcodeInput) {
              barcodeInput.value = barcode;
              const inputEvent = new Event('input', { bubbles: true });
              barcodeInput.dispatchEvent(inputEvent);
            }
          }, {
            moduleContext: 'ventas',
            targetInputId: 'codigoBarras',
            minBarcodeLength: 4,
            maxBarcodeLength: 30,
            sounds: { enabled: true },
            vibration: { enabled: true }
          });
        } catch (err) {
          console.error('[VENTAS] Error creando detector con factory:', err);
        }
      }
      if (!barcodeDetector) {
        console.warn('[VENTAS] Módulo BarcodeDetector no disponible; usando detector mínimo inline');
        // Fallback mínimo: detector inline basado en keydown/keypress
        const config = { minLen: 4, maxLen: 50, maxGap: 120 };
        let buffer = '';
        let last = 0;
        let endTimer = null;
        const handleCommit = () => {
          if (buffer.length >= config.minLen) {
            const code = buffer;
            buffer = '';
            last = 0;
            // Disparar flujo de búsqueda como hace el detector real
            console.log('[VENTAS][InlineDetector] Código detectado:', code);
            setCodigoBarras(code);
            setTimeout(() => buscarPorCodigoBarras(code), 100);
            const barcodeInput = document.querySelector('input[name="codigoBarras"], input[id="codigoBarras"], input[placeholder*="buscar producto"]');
            if (barcodeInput) {
              barcodeInput.value = code;
              const inputEvent = new Event('input', { bubbles: true });
              barcodeInput.dispatchEvent(inputEvent);
            }
          }
        };
        const onKeyDown = (e) => {
          // Solo en ruta de ventas
          const loc = (window.location && (window.location.hash || window.location.pathname)).toLowerCase();
          if (!(loc.includes('venta'))) return;
          const now = Date.now();
          if (e.key && e.key.length === 1) {
            // reinicio por pausa larga
            if (now - last > config.maxGap) buffer = '';
            last = now;
            // bloquear escritura para no ensuciar inputs
            e.preventDefault();
            buffer += e.key;
            if (buffer.length > config.maxLen) buffer = buffer.slice(-config.maxLen);
            if (endTimer) clearTimeout(endTimer);
            endTimer = setTimeout(handleCommit, config.maxGap + 20);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            if (endTimer) { clearTimeout(endTimer); endTimer = null; }
            handleCommit();
          }
        };
        const onKeyPress = (e) => {
          // No usado principalmente; keydown ya captura y previene
        };
        const inlineDetector = {
          startListening() {
            document.addEventListener('keydown', onKeyDown, true);
            document.addEventListener('keypress', onKeyPress, true);
          },
          stopListening() {
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('keypress', onKeyPress, true);
            buffer = '';
            if (endTimer) { clearTimeout(endTimer); endTimer = null; }
          },
          playSuccessSound() {},
          playErrorSound() {},
          vibrate() {}
        };
        barcodeDetector = inlineDetector;
      }
    } else {
      barcodeDetector = new BarcodeDetectorCtor((barcode) => {
      console.log('[VENTAS] Código de barras escaneado con escáner físico:', barcode);
      
      // Actualizar el campo de código de barras
      setCodigoBarras(barcode);
      
      // Buscar automáticamente el producto después de un pequeño delay
      setTimeout(() => {
        console.log('[VENTAS] Buscando producto automáticamente:', barcode);
        buscarPorCodigoBarras(barcode);
      }, 150);
      
      // No requerimos foco en el input; solo actualizar valor si existe como feedback visual
      const barcodeInput = document.querySelector('input[name="codigoBarras"], input[id="codigoBarras"], input[placeholder*="buscar producto"]');
      if (barcodeInput) {
        barcodeInput.value = barcode;
        const inputEvent = new Event('input', { bubbles: true });
        barcodeInput.dispatchEvent(inputEvent);
      }
    }, {
      moduleContext: 'ventas',
      targetInputId: 'codigoBarras',
      minBarcodeLength: 4,
      maxBarcodeLength: 30,
      sounds: { enabled: true },
      vibration: { enabled: true }
    });
    }
    
    // Guardar referencia global para usar en otras funciones
  window.barcodeDetectorInstance = barcodeDetector;
    // Levantar flag global para que ScanGuard bloquee escritura en inputs
    window.__barcodeAutoScanActive = true;

    // Crear un input oculto que mantenga el foco cuando AUTO está activo (modo supermercado)
    const ensureHiddenSink = () => {
      let el = document.getElementById('__autoScanSink');
      if (!el) {
        el = document.createElement('input');
        el.type = 'text';
        el.id = '__autoScanSink';
        el.setAttribute('autocomplete', 'off');
        el.setAttribute('autocapitalize', 'off');
        el.setAttribute('autocorrect', 'off');
        el.setAttribute('aria-hidden', 'true');
        el.style.position = 'fixed';
        el.style.left = '-9999px';
        el.style.top = '0';
        el.style.opacity = '0';
        el.style.width = '1px';
        el.style.height = '1px';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
      }
      return el;
    };

    const sink = ensureHiddenSink();
    const refocus = () => {
      if (!deteccionAutomaticaActiva) return;
      try { sink.focus(); } catch (_) {}
    };
    // Mantener foco: si se pierde, volver a enfocar en el próximo tick
    sink.addEventListener('blur', () => setTimeout(refocus, 0));
    // Enfocar inicialmente
    refocus();
    
  // Iniciar escucha (sin requerir foco)
    barcodeDetector.startListening();
    console.log('[VENTAS] Detector iniciado');
    
    // Cleanup
    return () => {
      console.log('[VENTAS] Limpiando detector en cleanup');
      barcodeDetector.stopListening();
      if (window.barcodeDetectorInstance === barcodeDetector) {
        delete window.barcodeDetectorInstance;
      }
      delete window.__barcodeAutoScanActive;
      if (window.barcodeTimeout) {
        clearTimeout(window.barcodeTimeout);
        delete window.barcodeTimeout;
      }
      // Remover input oculto
      const existing = document.getElementById('__autoScanSink');
      if (existing && existing.parentNode) {
        try { existing.remove(); } catch (_) { existing.parentNode.removeChild(existing); }
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
    
    setProductos(productos.map(p => {
      if (p.codigo !== codigo) return p;
      const maxCant = parseInt(p.stock ?? 0, 10) || 0;
      const cant = Math.min(nuevaCantidad, Math.max(maxCant, 0));
      if (cant < nuevaCantidad) {
        if (window.barcodeDetectorInstance) {
          window.barcodeDetectorInstance.playErrorSound?.();
          window.barcodeDetectorInstance.vibrate?.('error');
        }
        alert('No puede superar el stock disponible para este producto.');
      }
      return { ...p, cantidad: cant, subtotal: cant * p.precio };
    }));
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
      // Validar stock actual en BD antes de iniciar transacción
      for (const item of productos) {
        try {
          const res = await window.electronAPI.dbGetSingle('SELECT almacen, producto FROM producto WHERE codigo = ?', [item.codigo]);
          const disponible = parseInt(res?.data?.almacen ?? 0, 10) || 0;
          if (disponible < item.cantidad) {
            if (window.barcodeDetectorInstance) {
              window.barcodeDetectorInstance.playErrorSound?.();
              window.barcodeDetectorInstance.vibrate?.('error');
            }
            alert(`Stock insuficiente para "${res?.data?.producto ?? item.descripcion}". Disponible: ${disponible}, solicitado: ${item.cantidad}`);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error verificando stock antes de guardar:', e);
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          alert('No se pudo validar el stock actual. Intente nuevamente.');
          setLoading(false);
          return;
        }
      }

      // Preparar datos de la venta
      const tipoTexto = (ventaData.tipo_comprobante === 'factura') ? 'Factura' : 'Nota de venta';
      const fechaIso = new Date().toISOString();

      // Iniciar transacción
      {
        const tx = await window.electronAPI.dbRun('BEGIN TRANSACTION');
        if (!tx || tx.success === false) {
          alert('No se pudo iniciar la transacción de la venta.');
          setLoading(false);
          return;
        }
      }

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
      if (!ventaInsert || ventaInsert.success === false) {
        try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
        alert('No se pudo registrar la venta.');
        setLoading(false);
        return;
      }

      // Obtener el ID de la venta insertada desde result.data.id
      const ventaId = ventaInsert && ventaInsert.data ? ventaInsert.data.id : undefined;
      if (!ventaId) {
        // Si no obtuvimos un ID válido, revertimos y mostramos error
        try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
        alert('No se pudo registrar la venta: ID de venta no generado.');
        setLoading(false);
        return;
      }

  // Registrar también en tabla legacy 'venta' (singular) y, si corresponde, cuotas
      const buildLegacyId = () => {
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`.slice(0, 14);
      };
      const legacyId = buildLegacyId();

      // Mapear forma de venta y forma de pago a códigos numéricos sencillos
      const tipoVentaCode = tipoVenta === 'contado' ? 0 : (tipoVenta === 'credito' ? 1 : 2);
      const formaPagoCode = (fp) => {
        if (!fp) return 1;
        const t = (fp.tipo || 'efectivo').toLowerCase();
        return t === 'cheque' ? 2 : t.startsWith('tarjeta') ? 3 : 1;
      };

      // Determinar comprobante (F para factura, N para nota de venta)
      const comprobSigla = (ventaData.tipo_comprobante === 'factura') ? 'F' : 'N';
      const numFactura = (ventaData.tipo_comprobante === 'factura') ? (ventaData.numero_comprobante || null) : null;

      // Datos de plazo/abono cuando aplica
      let plazoDias = 0;
      let abonoInicial = 0;
      let saldo = Number(totales.total) || 0;
      let fechaPagoStr = null;
      if (tipoVenta === 'credito' || tipoVenta === 'plan') {
        plazoDias = Math.max(parseInt(creditoConfig?.plazoDias ?? 0, 10) || 0, 0);
        abonoInicial = Math.max(parseFloat(creditoConfig?.abonoInicial ?? 0) || 0, 0);
        if (abonoInicial > saldo) abonoInicial = saldo;
        saldo = Math.max(saldo - abonoInicial, 0);
        const f = new Date();
        f.setDate(f.getDate() + plazoDias);
        fechaPagoStr = f.toISOString();
      }

      // Insertar fila legacy
      const legacyInsert = await window.electronAPI.dbRun(
        `INSERT INTO venta (
          id, idcliente, fecha, subtotal, descuento, total,
          fpago, comprob, numfactura, formapago, anulado, codempresa, iva,
          fechapago, usuario, ordencompra, ispago, transporte, trial279
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          legacyId,
          cliente.ruc || null,
          fechaIso,
          Number(totales.subtotal) || 0,
          0,
          Number(totales.total) || 0,
          tipoVentaCode,
          comprobSigla,
          numFactura,
          formaPagoCode(formaPago),
          'N',
          1,
          Number(totales.iva) || 0,
          fechaPagoStr,
          'admin',
          null,
          (tipoVenta === 'contado') ? 'S' : 'N',
          0,
          '0'
        ]
      );
      if (!legacyInsert || legacyInsert.success === false) {
        try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
        alert('No se pudo registrar en la tabla "venta" (compatibilidad). La operación fue revertida.');
        setLoading(false);
        return;
      }

      // Si tiene plazo/abono, registrar en venta_cuotas
      if (tipoVenta === 'credito' || tipoVenta === 'plan') {
        const cuotasInsert = await window.electronAPI.dbRun(
          `INSERT INTO venta_cuotas (venta_id, plazo_dias, abono_inicial, saldo, fechapago) VALUES (?, ?, ?, ?, ?)`,
          [legacyId, plazoDias, abonoInicial, saldo, fechaPagoStr]
        );
        if (!cuotasInsert || cuotasInsert.success === false) {
          try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
          alert('No se pudo registrar plazos/abonos. La operación fue revertida.');
          setLoading(false);
          return;
        }
      }

      // Insertar items y actualizar stock
      for (const item of productos) {
        const itemInsert = await window.electronAPI.dbRun(
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
        if (!itemInsert || itemInsert.success === false) {
          try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
          alert('No se pudo registrar un ítem de la venta. La operación fue revertida.');
          setLoading(false);
          return;
        }

        // Actualizar stock por código
        const stockUpdate = await window.electronAPI.dbRun(
          'UPDATE producto SET almacen = almacen - ? WHERE codigo = ?',
          [Number(item.cantidad) || 0, item.codigo]
        );
        if (!stockUpdate || stockUpdate.success === false) {
          try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
          alert('No se pudo actualizar el stock. La operación fue revertida.');
          setLoading(false);
          return;
        }
      }

      // Confirmar transacción
      const commit = await window.electronAPI.dbRun('COMMIT');
      if (!commit || commit.success === false) {
        alert('No se pudo confirmar la venta (commit falló).');
        setLoading(false);
        return;
      }

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
  formaPago,
  creditoConfig,
    
    // Setters
    setCodigoBarras,
    setBusquedaProducto,
    setCliente,
  setVentaData,
  setTipoVenta,
  setFormaPago,
  setCreditoConfig,
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
