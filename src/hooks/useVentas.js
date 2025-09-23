import { useState, useEffect, useCallback } from 'react';
// Logger control: habilitar logs detallados solo si window.__NEOPOS_DEBUG === true
const debugLog = (...args) => {
  try {
    if (window && window.__NEOPOS_DEBUG) console.log('[VENTAS]', ...args);
  } catch (_) { /* noop en preload/server */ }
};
import ProductoController from '../controllers/ProductoController';
import ClienteController from '../controllers/ClienteController';
import EmpresaController from '../controllers/EmpresaController';
import AbonoLegacy from '../models/AbonoLegacy';
import CreditoLegacy from '../models/CreditoLegacy';
import useModal from './useModal';
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
  // Utilidad para redondear a 2 decimales de forma consistente (evitar 0.16128, etc.)
  const round2 = (n) => {
    const x = Math.round((Number(n) || 0) * 100) / 100;
    // Evitar -0
    return x === 0 ? 0 : x;
  };

  // Hook para mostrar modales
  const { modalState, showAlert, showConfirm } = useModal();
  // Estados principales
  const [productos, setProductos] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [ventaActiva, setVentaActiva] = useState(false);
  const [tipoVenta, setTipoVenta] = useState('contado'); // contado | credito | plan
  // Forma de pago y detalle de tarjeta (cuando aplique)
  const [formaPago, setFormaPago] = useState({ tipo: 'efectivo', tarjeta: null });
  // Configuración de crédito/plan: plazo, abono inicial, interés % y número de cuotas sugeridas
  const [creditoConfig, setCreditoConfig] = useState({ plazoDias: 30, abonoInicial: 0, interesPorc: 0, numCuotas: 1 });
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
  
  // Estado para el modal de comprobante
  const [comprobanteModalOpen, setComprobanteModalOpen] = useState(false);
  const [comprobanteData, setComprobanteData] = useState(null);

  // Cerrar comprobante y limpiar datos
  const cerrarComprobante = useCallback(() => {
    setComprobanteModalOpen(false);
    setComprobanteData(null);
  }, []);
  
  // Estados para autocompletado de clientes
  const [clienteSugerencias, setClienteSugerencias] = useState([]);
  const [showClienteSugerencias, setShowClienteSugerencias] = useState(false);
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Controladores
  const productoController = new ProductoController();
  const clienteController = new ClienteController();
  const empresaController = new EmpresaController();

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

  // Generar el siguiente número de comprobante via IPC centralizado
  const generarNumeroComprobante = useCallback(async (tipo = 'nota') => {
    try {
      if(window?.electronAPI?.invoke){
        const resp = await window.electronAPI.invoke('comprobante-next', { tipo });
        if(resp?.success && resp.data){
          setVentaData(prev => ({ ...prev, tipo_comprobante: tipo, numero_comprobante: resp.data }));
          return;
        }
      }
    } catch(e){
      console.error('Error solicitando comprobante centralizado:', e);
    }
    // Fallback
    const ts = Date.now().toString().slice(-6);
    const base = tipo === 'factura' ? '002-001' : '001-001';
    setVentaData(prev => ({ ...prev, tipo_comprobante: tipo, numero_comprobante: `${base}-${ts}` }));
  }, []);

  // Función para agregar producto a la lista
  const agregarProducto = useCallback((producto) => {
    debugLog('Agregar producto', producto?.codigo, producto?.producto);
    
    setProductos(prev => {
      // Para ventas solo se considera el stock del almacén
      const almacen = parseInt(producto.almacen ?? 0, 10) || 0;
      const bodega1 = parseInt(producto.bodega1 ?? 0, 10) || 0;
      const bodega2 = parseInt(producto.bodega2 ?? 0, 10) || 0;
      const stockBodegas = bodega1 + bodega2;
      
  debugLog('Stock', { almacen, bodega1, bodega2, stockBodegas });
      
      const existente = prev.find(p => p.codigo === producto.codigo);

      // No permitir venta si no hay stock en almacén
      if (!existente && almacen <= 0) {
  debugLog('Rechazado agregar producto por falta stock almacén', producto?.codigo, 'almacén', almacen);
        if (window.barcodeDetectorInstance) {
          window.barcodeDetectorInstance.playErrorSound?.();
          window.barcodeDetectorInstance.vibrate?.('error');
        }
        
        // Mensaje diferente si hay stock en bodegas
        if (stockBodegas > 0) {
          showAlert(`No hay existencias en almacén para "${producto.producto}". Sin embargo, hay ${stockBodegas} unidades en bodegas. Transfiera stock del bodegaje al almacén para poder vender.`, 'Sin stock en almacén');
        } else {
          showAlert('Stock insuficiente: el producto no tiene existencias.', 'Error');
        }
        return prev;
      }

      if (existente) {
        // Para productos existentes, validar contra el stock del almacén
        if (existente.cantidad >= almacen) {
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          
          if (stockBodegas > 0) {
            showAlert(`No puede superar el stock de almacén (${almacen} disponibles). Hay ${stockBodegas} unidades adicionales en bodegas.`, 'Stock almacén agotado');
          } else {
            showAlert('No puede superar el stock disponible para este producto.', 'Error');
          }
          return prev;
        }
        // Incrementar sin superar stock del almacén
        return prev.map(p => {
          if (p.codigo !== producto.codigo) return p;
          const nuevaCantidad = Math.min((p.cantidad + 1), almacen);
          return { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precio };
        });
      }

      // Agregar nuevo producto (cantidad inicial 1, ya validado stock>0 en almacén)
      const precio = parseFloat(producto.pvp) || 0;
      const nuevoProducto = {
        codigo: producto.codigo,
        codbarra: producto.codbarra || producto.codigo,
        descripcion: producto.producto || producto.descripcion,
        precio,
        cantidad: 1,
        stock: almacen, // Solo stock del almacén
        stockBodegas: stockBodegas, // Info adicional para referencia
        subtotal: precio
      };
      
      debugLog('Producto agregado', nuevoProducto.codigo, 'cantidad', nuevoProducto.cantidad);
      
      return [...prev, nuevoProducto];
    });
  }, [showAlert]);

  // Función para buscar productos por código de barras
  const buscarPorCodigoBarras = useCallback(async (codigo) => {
    if (!codigo.trim()) return;
    
    setLoading(true);
  debugLog('Buscar por código', codigo);
    
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
        console.log('=== PRODUCTO ENCONTRADO ===');
        console.log('Datos completos del producto:', JSON.stringify(response.data, null, 2));
        console.log('Campo almacen:', response.data.almacen);
        console.log('Tipo de almacen:', typeof response.data.almacen);
        console.log('Campo bodega1:', response.data.bodega1);
        console.log('Campo bodega2:', response.data.bodega2);
        
        // Validar stock antes de agregar - probemos diferentes campos
        const almacen = response.data.almacen;
        const bodega1 = response.data.bodega1;
        const bodega2 = response.data.bodega2;
        
        console.log('Valores originales - almacen:', almacen, 'bodega1:', bodega1, 'bodega2:', bodega2);
        
        const stockAlmacen = parseInt(almacen ?? 0, 10) || 0;
        const stockBodega1 = parseInt(bodega1 ?? 0, 10) || 0;
        const stockBodega2 = parseInt(bodega2 ?? 0, 10) || 0;
        const stockTotal = stockAlmacen + stockBodega1 + stockBodega2;
        
        console.log('Stock parseado - almacen:', stockAlmacen, 'bodega1:', stockBodega1, 'bodega2:', stockBodega2);
        console.log('Stock total:', stockTotal);
        
        if (stockTotal <= 0) {
          console.log('=== STOCK INSUFICIENTE ===');
          console.log('Stock total calculado:', stockTotal);
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          showAlert('Producto sin existencias. No se puede vender.', 'Error');
          setCodigoBarras('');
          return;
        }
        
        console.log('=== STOCK SUFICIENTE ===');
        console.log('Procediendo a agregar producto...');

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
        
        showAlert(`Producto no encontrado para el código: ${codigo}`, 'Error');
      }
    } catch (error) {
      console.error('Error al buscar producto:', error);
      showAlert('Error al buscar producto', 'Error');
    } finally {
      setLoading(false);
    }
  }, [agregarProducto, showAlert]);

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
      if (!deteccionAutomaticaActiva || window.__barcodeAutoScanPaused) return;
      try { sink.focus(); } catch (_) {}
    };
    // Mantener foco: si se pierde, volver a enfocar en el próximo tick
    sink.addEventListener('blur', () => setTimeout(refocus, 0));
    // Enfocar inicialmente
    refocus();
    
  // Iniciar escucha (sin requerir foco)
    barcodeDetector.startListening();
    console.log('[VENTAS] Detector iniciado');

    // While AUTO ON, if user focuses any editable input (not the barcode field), pause scanning
    const onFocusIn = (ev) => {
      const t = ev.target;
      const tag = (t && t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (t && t.isContentEditable)) {
        const id = (t.id || '').toLowerCase();
        const name = (t.name || '').toLowerCase();
        if (id !== 'codigobarras' && name !== 'codigobarras') {
          window.__barcodeAutoScanPaused = true;
        }
      }
    };
    const onFocusOut = () => {
      // small delay to allow next focus target to apply pause if needed
      setTimeout(() => {
        const a = document.activeElement;
        const tag = (a && a.tagName || '').toLowerCase();
        const isEditable = a && (tag === 'input' || tag === 'textarea' || a.isContentEditable);
        if (!isEditable && !window.__barcodeModalOpen) {
          delete window.__barcodeAutoScanPaused;
        }
      }, 120);
    };
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    
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
  // Remover listeners e input oculto
  document.removeEventListener('focusin', onFocusIn, true);
  document.removeEventListener('focusout', onFocusOut, true);
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
        showAlert('No puede superar el stock disponible para este producto.', 'Error');
      }
      return { ...p, cantidad: cant, subtotal: cant * p.precio };
    }));
  };

  // Función para eliminar producto
  const eliminarProducto = (codigo) => {
    setProductos(productos.filter(p => p.codigo !== codigo));
  };

  // Calcular totales con IVA por producto (cada producto puede tener porcentaje distinto: 0, 12, 15, etc.)
  // Se espera que cada producto tenga un campo "iva" (porcentaje numérico, ej: 12, 15, 0). Si no existe, se asume 12 como compatibilidad previa.
  const calculoTotales = productos.reduce((acc, p) => {
    const cantidad = Number(p.cantidad) || 0;
    const precio = Number(p.precio) || 0;
    const base = round2(cantidad * precio);
    // porcentaje IVA del producto: puede venir como 0, 12, 15 etc. Acepta cadena
    let ivaPorc = (p.iva_porcentaje ?? p.iva ?? 12); // soportar distintos nombres de campo
    ivaPorc = Number(ivaPorc);
    if (isNaN(ivaPorc)) ivaPorc = 12;
    if (ivaPorc < 0) ivaPorc = 0;
    // IVA del producto
    const ivaValor = round2(base * (ivaPorc / 100));
    acc.subtotal += base; // subtotal sin IVA
    acc.iva += ivaValor;
    return acc;
  }, { subtotal: 0, iva: 0 });
  calculoTotales.subtotal = round2(calculoTotales.subtotal);
  calculoTotales.iva = round2(calculoTotales.iva);
  const totales = {
    ...calculoTotales,
    total: round2(calculoTotales.subtotal + calculoTotales.iva)
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
      showAlert('Debe agregar al menos un producto', 'Error');
      return;
    }

    if ((tipoVenta === 'credito' || tipoVenta === 'plan') && (!cliente.ruc && !cliente.nombres)) {
      showAlert('Para ventas a crédito o plan acumulativo debe seleccionar/ingresar un cliente', 'Error');
      return;
    }

    setLoading(true);
    try {
      // Validar stock actual en BD antes de iniciar transacción
      for (const item of productos) {
        try {
          const res = await window.electronAPI.dbGetSingle('SELECT almacen, bodega1, bodega2, producto FROM producto WHERE codigo = ?', [item.codigo]);
          console.log('Validación stock final - Producto:', res?.data);
          
          // Para ventas solo se considera el stock del almacén
          const almacen = parseInt(res?.data?.almacen ?? 0, 10) || 0;
          const bodega1 = parseInt(res?.data?.bodega1 ?? 0, 10) || 0;
          const bodega2 = parseInt(res?.data?.bodega2 ?? 0, 10) || 0;
          const stockBodegas = bodega1 + bodega2;
          
          console.log(`Stock final - Almacén: ${almacen}, Bodega1: ${bodega1}, Bodega2: ${bodega2}, Stock bodegas: ${stockBodegas}, Solicitado: ${item.cantidad}`);
          
          if (almacen < item.cantidad) {
            if (window.barcodeDetectorInstance) {
              window.barcodeDetectorInstance.playErrorSound?.();
              window.barcodeDetectorInstance.vibrate?.('error');
            }
            
            // Mensaje diferente si hay stock en bodegas
            if (stockBodegas > 0) {
              showAlert(`Stock insuficiente en almacén para "${res?.data?.producto ?? item.descripcion}". Disponible en almacén: ${almacen}, solicitado: ${item.cantidad}. Hay ${stockBodegas} unidades adicionales en bodegas.`, 'Stock almacén insuficiente');
            } else {
              showAlert(`Stock insuficiente para "${res?.data?.producto ?? item.descripcion}". Disponible: ${almacen}, solicitado: ${item.cantidad}`, 'Error');
            }
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error verificando stock antes de guardar:', e);
          if (window.barcodeDetectorInstance) {
            window.barcodeDetectorInstance.playErrorSound?.();
            window.barcodeDetectorInstance.vibrate?.('error');
          }
          showAlert('No se pudo validar el stock actual. Intente nuevamente.', 'Error');
          setLoading(false);
          return;
        }
      }

      // Preparar datos de la venta
  const tipoTexto = (ventaData.tipo_comprobante === 'factura') ? 'Factura' : 'Nota de venta';
  const fechaIso = new Date().toISOString();

      // Iniciar transacción
  // Iniciar transacción manual (legacy)
  await window.electronAPI.dbRun('BEGIN TRANSACTION');

  // Registrar en tabla legacy 'venta' (singular) y, si corresponde, cuotas
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
      // Todos los números van a numfactura, diferenciados por prefijo
      const numeroComprobante = ventaData.numero_comprobante || null;

      // Datos de plazo/abono cuando aplica
      let plazoDias = 0;
      let abonoInicial = 0;
      let totalVenta = round2(totales.total);
      let subtotalVenta = round2(totales.subtotal);
      let ivaVenta = round2(totales.iva);
      let saldo = totalVenta;
      let fechaPagoStr = null;
      if (tipoVenta === 'credito' || tipoVenta === 'plan') {
        plazoDias = Math.max(parseInt(creditoConfig?.plazoDias ?? 0, 10) || 0, 0);
        abonoInicial = round2(Math.max(parseFloat(creditoConfig?.abonoInicial ?? 0) || 0, 0));
        if (abonoInicial > saldo) abonoInicial = saldo;
        saldo = round2(Math.max(saldo - abonoInicial, 0));
        const f = new Date();
        f.setDate(f.getDate() + plazoDias);
        fechaPagoStr = f.toISOString();
      }

      // Persistir datos de crédito/plan en ventaData para disponibilidad global (impresión, controladores, etc.)
      if (tipoVenta === 'credito' || tipoVenta === 'plan') {
        // Capturar interés % actual para también persistirlo (compatibilidad / reportes)
        const interesPorcPersist = round2(Math.max(parseFloat(creditoConfig?.interesPorc || 0) || 0, 0));
        setVentaData(prev => ({
          ...prev,
          abono_inicial: abonoInicial,
          plazo_dias: plazoDias,
          saldo_pendiente: saldo,
          interes_porc: interesPorcPersist
        }));
      } else {
        // Asegurar limpieza en ventas de contado
        setVentaData(prev => ({
          ...prev,
          abono_inicial: 0,
            plazo_dias: 0,
            saldo_pendiente: 0,
            interes_porc: 0
        }));
      }

      // Insertar fila legacy - usar ordencompra para números de nota de venta
      const legacyInsert = await window.electronAPI.dbRun(
        `INSERT INTO venta (
          id, idcliente, fecha, subtotal, descuento, total,
          fpago, comprob, numfactura, formapago, anulado, codempresa, iva,
          fechapago, usuario, ordencompra, ispagos, transporte, trial279
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          legacyId,
          cliente.ruc || null,
          fechaIso,
          subtotalVenta,
          0,
          totalVenta,
          tipoVentaCode,
          comprobSigla,
          numeroComprobante, // Todos los números van a numfactura
          formaPagoCode(formaPago),
          'N',
          1,
          ivaVenta,
          fechaPagoStr,
          'admin',
          null, // ordencompra se deja en null
          (tipoVenta === 'contado') ? 'S' : 'N',
          0,
          '0'
        ]
      );
      if (!legacyInsert || legacyInsert.success === false) {
        try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
        showAlert('No se pudo registrar en la tabla "venta" (compatibilidad). La operación fue revertida.', 'Error');
        setLoading(false);
        return;
      }

      // Si tiene plazo/abono, registrar en tablas de crédito legacy si existen
      if (tipoVenta === 'credito' || tipoVenta === 'plan') {
        // 1) Tabla legacy 'credito' (idventa, plazo, saldo)
        try {
          await CreditoLegacy.create({ idventa: legacyId, plazo: plazoDias, saldo });
        } catch (e) {
          console.warn('No se pudo registrar en credito (legacy):', e.message);
        }

        // 2) Tabla legacy 'cuotas' (compatibilidad: una fila resumen)
        try {
          const hasCuotasLegacy = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='cuotas'");
          if (hasCuotasLegacy?.data?.name === 'cuotas') {
            // Calcular interés total simple sobre el saldo (total financiado después del abono)
            const interesPorc = round2(Math.max(parseFloat(creditoConfig?.interesPorc || 0) || 0, 0));
            const interesMonto = interesPorc > 0 ? round2(saldo * (interesPorc / 100)) : 0;
            await window.electronAPI.dbRun(
              `INSERT INTO cuotas (idventa, item, fecha, monto1, interes, monto2, interesmora, idabono, interespagado, trial275) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '0')`,
              [legacyId, 1, fechaPagoStr, round2(abonoInicial), interesMonto, round2(saldo), 0, null, 0]
            );
          }
        } catch (e) {
          console.warn('No se pudo registrar en cuotas (legacy):', e.message);
        }

        // 3) Registrar abono inicial en 'abono' si abonoInicial > 0 y tabla existe
        try {
          if (abonoInicial > 0) {
            const existsAbono = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='abono'");
            if (existsAbono?.data?.name === 'abono') {
              await AbonoLegacy.create({
                idventa: legacyId,
                idcliente: cliente.ruc || null,
                fecha: new Date().toISOString(),
                monto: round2(abonoInicial),
                fpago: 1,
                nrorecibo: null,
                formapago: formaPagoCode(formaPago),
                idusuario: 1
              });
            }
          }
        } catch (e) {
          console.warn('No se pudo registrar abono inicial (legacy):', e.message);
        }

  // 4) No usar tabla venta_cuotas (no existe en este esquema). Compatibilidad mantenida con credito/cuotas/abono.
      }

  // Insertar items y actualizar stock
  let itemSeq = 1;
  for (const item of productos) {
        // Insertar en ventadet si existe
        const hasVentadet = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='ventadet'");
        if (hasVentadet?.data?.name === 'ventadet') {
          await window.electronAPI.dbRun(
    `INSERT INTO ventadet (item, idventa, codprod, cantidad, precio, producto) VALUES (?, ?, ?, ?, ?, ?)`,
    [itemSeq++, legacyId, item.codigo, Number(item.cantidad)||0, Number(item.precio)||0, item.descripcion || '']
          );
        }
        // Actualizar stock solo si no es plan (en plan los productos se reservan, no se entregan aún)
        if (tipoVenta !== 'plan') {
          const stockUpdate = await window.electronAPI.dbRun(
            'UPDATE producto SET almacen = almacen - ? WHERE codigo = ?',
            [Number(item.cantidad) || 0, item.codigo]
          );
          if (!stockUpdate || stockUpdate.success === false) {
            try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
            showAlert('No se pudo actualizar el stock. La operación fue revertida.', 'Error');
            setLoading(false);
            return;
          }
        }
      }

      // Si es plan, crear registro de reservación (si existe tabla reservacion)
      if (tipoVenta === 'plan') {
        try {
          const hasReservacion = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='reservacion'");
          if (hasReservacion?.data?.name === 'reservacion') {
            // Tomar abono inicial y plazo
            const abonoInicialPlan = round2(Math.max(parseFloat(creditoConfig?.abonoInicial || 0) || 0, 0));
            const plazoDiasPlan = Math.max(parseInt(creditoConfig?.plazoDias || 0, 10) || 0, 0);
            const fechaReserva = new Date();
            const fechaEvento = new Date();
            if (plazoDiasPlan > 0) fechaEvento.setDate(fechaEvento.getDate() + plazoDiasPlan);
            const fecha_reservacion = fechaReserva.toISOString().split('T')[0];
            const fecha_evento = fechaEvento.toISOString().split('T')[0];
            const descripcion = `Reserva plan venta ${legacyId} (${productos.length} items)`;
            await window.electronAPI.dbRun(
              'INSERT INTO reservacion (cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado, created_at) VALUES (?,?,?,?,?,?,datetime("now"))',
              [cliente.ruc || null, fecha_reservacion, fecha_evento, descripcion, abonoInicialPlan, 'ACTIVA']
            );
          }
        } catch (e) {
          console.warn('No se pudo registrar reservación de plan:', e.message);
        }
      }

      // Confirmar transacción
  await window.electronAPI.dbRun('COMMIT');

  showAlert('Venta guardada exitosamente', 'Éxito');
  // After blocking alert closes, ensure guard is not paused so inputs work
  delete window.__barcodeAutoScanPaused;
      limpiarVenta();
      setVentaActiva(false);
      // Preparar siguiente número para la próxima venta
      await generarNumeroComprobante(ventaData.tipo_comprobante || 'nota');
    } catch (error) {
      console.error('Error al guardar venta:', error);
      try { await window.electronAPI.dbRun('ROLLBACK'); } catch (_) {}
  showAlert('Error al guardar venta', 'Error');
  delete window.__barcodeAutoScanPaused;
    } finally {
      setLoading(false);
    }
  };

  // Cambiar tipo de comprobante y generar número automáticamente
  const cambiarTipoComprobante = async (nuevoTipo) => {
    await generarNumeroComprobante(nuevoTipo);
  };

  // Función para imprimir comprobante
  const imprimirComprobante = useCallback(async () => {
    try {
      // Validar que hay productos en la venta
      if (!productos || productos.length === 0) {
        showAlert('No hay productos en la venta para imprimir', 'Error');
        return;
      }

      // Obtener información de la empresa usando el controlador
      let empresaInfo = null;
      try {
        const empresaRes = await empresaController.getEmpresa();
        if (empresaRes && empresaRes.success && empresaRes.data) {
          empresaInfo = empresaRes.data;
        }
      } catch (e) {
        console.warn('No se pudo obtener información de la empresa:', e);
      }

      // Si no hay empresa en BD, usar datos por defecto
      if (!empresaInfo) {
        empresaInfo = {
          empresa: 'MI EMPRESA',
          nombre: 'MI EMPRESA', // Para compatibilidad
          ruc: '0000000000001',
          direccion: 'Dirección no especificada',
          telefono: 'Teléfono no especificado',
          email: 'contacto@miempresa.com'
        };
      } else {
        // Asegurar que el campo nombre esté disponible también para compatibilidad
        empresaInfo.nombre = empresaInfo.empresa || empresaInfo.nombre || 'MI EMPRESA';
      }

      // Preparar datos para el comprobante
      const comprobanteInfo = {
        ventaData: {
          ...ventaData,
          fecha: new Date().toLocaleDateString(),
          numero_comprobante: ventaData.numero_comprobante || 'SIN NÚMERO'
        },
        productos,
        totales, // Usar los totales ya calculados del hook (con IVA incluido)
        cliente: cliente || {
          nombre: 'Consumidor Final',
          cedula: '9999999999',
          direccion: 'N/A',
          telefono: 'N/A'
        },
        empresa: empresaInfo
      };

      // Mostrar el modal con el comprobante
      setComprobanteData(comprobanteInfo);
      setComprobanteModalOpen(true);

    } catch (error) {
      console.error('Error al preparar comprobante:', error);
      showAlert('Error al generar el comprobante: ' + error.message, 'Error');
    }
  }, [productos, ventaData, cliente, totales, showAlert, empresaController]);

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
    comprobanteModalOpen,
    comprobanteData,
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
  setComprobanteModalOpen,
  cerrarComprobante,
    
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
    cambiarTipoComprobante,
    imprimirComprobante,
    handleCodigoBarrasChange,
    detectarCodigoBarras,
    toggleDeteccionAutomatica,
    // Modal states and functions
    modalState,
    showAlert,
    showConfirm
  };
}

export default useVentas;
