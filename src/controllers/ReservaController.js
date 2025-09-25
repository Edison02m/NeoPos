import Reserva from '../models/Reserva';
import Cliente from '../models/Cliente';
import { round2, distribuirCuotas, calcularDescuento } from '../utils/finanzas.js';

class ReservaController {
  constructor(){
    if(!window.__RESERVA_SCHEMA_ENSURED){
      this.ensureSchema().catch(()=>{});
    }
  }

  async ensureSchema(){
    try {
      const info = await window.electronAPI.dbQuery("PRAGMA table_info('reservacion')");
      if(info?.success){
        const cols = (info.data||[]).map(c=>c.name);
        if(!cols.includes('productos_json')){
          await window.electronAPI.dbRun('ALTER TABLE reservacion ADD COLUMN productos_json TEXT');
        }
        if(!cols.includes('idventa')){
          // opcional: solo si se requiere, ya contemplado en lógica condicional; omitimos agregar automáticamente para no afectar reportes si no deseado
        }
      }
      window.__RESERVA_SCHEMA_ENSURED = true;
    } catch(_){ /* ignore */ }
  }
  async listar(){
    try { const data = await Reserva.findAll(); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  // Listar reservas con datos básicos del cliente (cedula, nombres/apellidos) usando join ligero
  async listarExtendido(){
    try {
      const query = `SELECT r.*, c.cedula as cliente_cedula, c.nombres as cliente_nombres, c.apellidos as cliente_apellidos
                     FROM reservacion r
                     LEFT JOIN cliente c ON c.cod = r.cliente_id
                     ORDER BY r.fecha_reservacion DESC`;
      const res = await window.electronAPI.dbQuery(query, []);
      if(!res.success) throw new Error(res.error);
      const data = (res.data||[]).map((r, idx)=> ({
        num: idx+1,
        id: r.id,
        cliente_id: r.cliente_id,
        cliente_cedula: r.cliente_cedula || '',
        cliente_nombre: `${(r.cliente_apellidos||'').trim()} ${(r.cliente_nombres||'').trim()}`.trim(),
        fecha_reservacion: r.fecha_reservacion,
        fecha_evento: r.fecha_evento,
        descripcion: r.descripcion || '',
        monto_reserva: Number(r.monto_reserva)||0,
        estado: r.estado || 'activa'
      }));
      return { success:true, data };
    } catch(e){ return { success:false, error:e.message }; }
  }
  async obtener(id){
    try { const data = await Reserva.findById(id); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async listarPorCliente(cliente_id){
    try { const data = await Reserva.findByCliente(cliente_id); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async crear({ cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado }){
    try { const res = await Reserva.create({ cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado }); return { success:true, data:{ id: res.id } }; } catch(e){ return { success:false, error:e.message }; }
  }
  async actualizarMonto({ id, monto_reserva }){
    try { await Reserva.actualizarMonto(id, monto_reserva); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
  async actualizarEstado({ id, estado }){
    try { await Reserva.actualizarEstado(id, estado); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
  async eliminar({ id }){
    try { await Reserva.delete(id); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }

  // Obtener reservas por código de cliente (cedula)
  async listarPorClienteCedula(cedula){
    try {
      if(!cedula) return { success:false, error:'Cédula de cliente requerida' };
      
      // Primero buscar el cliente_id por cédula
      const clienteResult = await window.electronAPI.dbGetSingle(
        'SELECT cod FROM cliente WHERE cedula = ?', 
        [cedula]
      );
      
      if(!clienteResult.success || !clienteResult.data) {
        return { success:true, data:[] }; // No hay cliente con esa cédula
      }
      
      const cliente_id = clienteResult.data.cod;
      
      // Obtener reservas del cliente
      const reservasResult = await window.electronAPI.dbQuery(
        'SELECT * FROM reservacion WHERE cliente_id = ? ORDER BY fecha_reservacion DESC', 
        [cliente_id]
      );
      
      if(!reservasResult.success) throw new Error(reservasResult.error);
      
      const data = (reservasResult.data || []).map((r, idx) => ({
        num: idx + 1,
        id: r.id,
        fecha_reservacion: r.fecha_reservacion,
        fecha_evento: r.fecha_evento,
        descripcion: r.descripcion || '',
        monto_reserva: Number(r.monto_reserva) || 0,
        estado: r.estado || 'activa',
        created_at: r.created_at
      }));
      
      return { success:true, data };
    } catch(e){ 
      return { success:false, error:e.message }; 
    }
  }

  // Obtener reserva extendida simplificada: cliente (por cod), venta (si idventa), total_venta y saldo = total - monto_reserva
  async obtenerExtendido(id){
    try {
      const reserva = await Reserva.findById(id);
      if(!reserva) return { success:false, error:'No encontrada' };
      let cliente = null; let venta = null; let totalVenta = 0;
      if(reserva?.cliente_id){
        try {
          const cliRes = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cod = ?', [reserva.cliente_id]);
          if(cliRes.success) cliente = cliRes.data;
        } catch(_){ }
      }
      if(reserva?.idventa){
        try {
          const ventaRes = await window.electronAPI.dbGetSingle('SELECT * FROM venta WHERE id = ?', [reserva.idventa]);
          if(ventaRes.success) venta = ventaRes.data;
          if(venta){
            // Intentar usar campo total si existe; si no, sumar ventadet
            if(Number(venta.total||0) > 0){
              totalVenta = Number(venta.total)||0;
            } else {
              try {
                const detRes = await window.electronAPI.dbQuery('SELECT cantidad, precio FROM ventadet WHERE idventa = ?', [reserva.idventa]);
                if(detRes.success && Array.isArray(detRes.data)){
                  for(const d of detRes.data){ totalVenta += (Number(d.cantidad)||0) * (Number(d.precio)||0); }
                }
              } catch(_){ }
            }
          }
        } catch(_){ }
      }
      const montoReserva = Number(reserva.monto_reserva||0);
      const saldo = totalVenta > 0 ? Math.max(totalVenta - montoReserva, 0) : 0;
      return { success:true, data:{ reserva, cliente, venta, total_venta: totalVenta, saldo } };
    } catch(e){ return { success:false, error:e.message }; }
  }

  // Cancelar reserva: restaura stock completo y marca estado=cancelada
  async cancelar({ id }){
    try {
      const reserva = await Reserva.findById(id);
      if(!reserva) return { success:false, error:'Reservación no encontrada' };
      if(reserva.estado !== 'activa') return { success:false, error:'Solo se puede cancelar una reserva activa' };
      let productos = [];
      try { if(reserva.productos_json) productos = JSON.parse(reserva.productos_json)||[]; } catch{ productos=[]; }
      if(!Array.isArray(productos) || productos.length===0){
        // Si no hay JSON, nada que devolver, solo cambiar estado
        await Reserva.actualizarEstado(id, 'cancelada');
        return { success:true };
      }
      await window.electronAPI.dbRun('BEGIN TRANSACTION');
      for(const p of productos){
        const codigo = p.codigo; const cant = Number(p.cantidad)||0; if(!codigo || cant<=0) continue;
        const upd = await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [cant, codigo]);
        if(!upd || upd.success===false){ await window.electronAPI.dbRun('ROLLBACK'); return { success:false, error:`Error devolviendo stock de ${codigo}` }; }
      }
      await window.electronAPI.dbRun('UPDATE reservacion SET estado = ? WHERE id = ?', ['cancelada', id]);
      await window.electronAPI.dbRun('COMMIT');
      return { success:true };
    } catch(e){
      try { await window.electronAPI.dbRun('ROLLBACK'); } catch(_){ }
      return { success:false, error:e.message };
    }
  }

  // Convertir una reserva (estado activa) en una venta
  // options: { itemsEditados:[{codigo, cantidad}], descuentoTipo:'percent'|'valor', descuento: number,
  //            formaPago:'contado'|'credito', credito:{ plazoDias, interesPorc, numCuotas }, numeroComprobante, tipoComprobante }
  async convertirAventa({ idReserva, options }) {
    try {
      const reserva = await Reserva.findById(idReserva);
      if(!reserva) return { success:false, error:'Reservación no encontrada' };
      if(reserva.estado !== 'activa') return { success:false, error:'Solo puede convertir reservas en estado activa' };
      // Validar productos_json
      let productosOriginal = [];
      try { if(reserva.productos_json) productosOriginal = JSON.parse(reserva.productos_json)||[]; } catch { productosOriginal = []; }
      if(!Array.isArray(productosOriginal) || productosOriginal.length===0) return { success:false, error:'Reservación sin productos válidos' };
      const opts = options || {};
      const formaPago = (opts.formaPago === 'credito') ? 'credito' : 'contado';
      const descuentoTipo = (opts.descuentoTipo === 'percent') ? 'percent' : 'valor';
      const descuentoInput = Number(opts.descuento||0)||0;
      const creditoCfg = opts.credito || {}; // {plazoDias, interesPorc, numCuotas}
      const editorItems = Array.isArray(opts.itemsEditados) ? opts.itemsEditados : [];

      // Map rápido para cantidades editadas
      const cantidadesEditadas = new Map();
      editorItems.forEach(it => { if(it && it.codigo) cantidadesEditadas.set(it.codigo, Math.max(0, Number(it.cantidad)||0)); });

      // Reconsultar precios y stock actuales
      const productosVenta = [];
      for(const p of productosOriginal){
        const codigo = p.codigo;
        const cantidadFinal = cantidadesEditadas.has(codigo) ? cantidadesEditadas.get(codigo) : Number(p.cantidad)||0;
        if(cantidadFinal <= 0) continue; // si usuario lo redujo a 0 se omite
        // Traer de BD
        let prodRow = null;
        try {
          // Consulta resiliente: primero detectar si existe columna iva
          if(!window.__PRODUCT_COLUMNS_CACHE){
            try {
              const info = await window.electronAPI.dbQuery("PRAGMA table_info('producto')");
              if(info.success){
                window.__PRODUCT_COLUMNS_CACHE = (info.data||[]).map(c=>c.name.toLowerCase());
              } else { window.__PRODUCT_COLUMNS_CACHE = []; }
            } catch { window.__PRODUCT_COLUMNS_CACHE = []; }
          }
          const hasIva = window.__PRODUCT_COLUMNS_CACHE.includes('iva');
          const selectCols = hasIva ? 'codigo, producto, pvp, almacen, bodega1, bodega2, iva' : 'codigo, producto, pvp, almacen, bodega1, bodega2';
          const r = await window.electronAPI.dbGetSingle(`SELECT ${selectCols} FROM producto WHERE codigo = ?`, [codigo]);
          if(r.success){ prodRow = r.data; if(!hasIva) prodRow.iva = 12; }
        } catch(_){ }
        if(!prodRow) return { success:false, error:`Producto ${codigo} no encontrado en catálogo` };
        const precio = Number(prodRow.pvp)||0; // Se asume incluye IVA, mantenemos lógica existente de ventas
        const ivaPorc = Number(prodRow.iva ?? 12) || 0;
        productosVenta.push({
          codigo,
          descripcion: prodRow.producto || p.nombre || '',
            cantidadOriginal: Number(p.cantidad)||0,
          cantidad: cantidadFinal,
          precio,
          iva_porcentaje: ivaPorc
        });
      }
      if(productosVenta.length===0) return { success:false, error:'No hay productos resultantes para la venta (todas cantidades en 0)' };

      // Calcular totales (imita lógica de useVentas): subtotal = suma bases, iva suma iva
      const tot = productosVenta.reduce((acc, p)=>{
        const base = round2(p.cantidad * p.precio); // en hook se trata precio como base sin IVA; mantenemos consistencia
        let ivaP = Number(p.iva_porcentaje); if(isNaN(ivaP)||ivaP<0) ivaP=12;
        const ivaVal = round2(base * (ivaP/100));
        acc.subtotal += base; acc.iva += ivaVal; return acc;
      }, { subtotal:0, iva:0 });
      tot.subtotal = round2(tot.subtotal); tot.iva = round2(tot.iva);
      const baseParaDescuento = round2(tot.subtotal + tot.iva);
      const descuentoCalc = calcularDescuento(baseParaDescuento, descuentoTipo, descuentoInput);
      const totalVenta = round2(baseParaDescuento - descuentoCalc);

      // Anticipo: monto_reserva
      const anticipo = Number(reserva.monto_reserva||0);
      let saldo = totalVenta;
      if(anticipo > 0){
        saldo = round2(Math.max(totalVenta - anticipo, 0));
      }

      // Validar stock para incrementos (si cantidad final > original => verificar diferencia en almacén)
      for(const p of productosVenta){
        if(p.cantidad > p.cantidadOriginal){
          const diff = p.cantidad - p.cantidadOriginal;
          const r = await window.electronAPI.dbGetSingle('SELECT almacen FROM producto WHERE codigo = ?', [p.codigo]);
          const stockAlmacen = Number(r?.data?.almacen||0);
          if(stockAlmacen < diff){
            return { success:false, error:`Stock insuficiente para incrementar ${p.codigo}. Disponible almacén: ${stockAlmacen}, requerido adicional: ${diff}` };
          }
        }
      }

      // Iniciar transacción
      await window.electronAPI.dbRun('BEGIN TRANSACTION');
      const buildLegacyId = () => {
        const d = new Date();
        const p2 = (n)=>String(n).padStart(2,'0');
        return `${d.getFullYear()}${p2(d.getMonth()+1)}${p2(d.getDate())}${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`.slice(0,14);
      };
      const legacyId = buildLegacyId();

      // Cliente (cedula) asociado: buscar por cod (cliente_id)
      let clienteRow = null;
      if(reserva.cliente_id){
        try { const cr = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cod = ?', [reserva.cliente_id]); if(cr.success) clienteRow = cr.data; } catch(_){}
      }

      const tipoVentaCode = (formaPago === 'contado') ? 0 : 1; // plan ya no aplica aquí
      const comprobSigla = (opts.tipoComprobante === 'factura' ? 'F' : 'N');
      const numeroComprobante = opts.numeroComprobante || null;
      // Crédito config
      let plazoDias = 0; let interesPorc = 0; let numCuotas = 1; let fechaPagoStr = null; let saldoFinanciado = saldo; let anticipoIdAbono = null;
      if(formaPago === 'credito'){
        plazoDias = Math.max(parseInt(creditoCfg.plazoDias||0,10)||0,0);
        interesPorc = Number(creditoCfg.interesPorc||0); if(isNaN(interesPorc)||interesPorc<0) interesPorc=0;
        numCuotas = Math.max(parseInt(creditoCfg.numCuotas||0,10)||0,1);
        const f = new Date(); f.setDate(f.getDate()+plazoDias); fechaPagoStr = f.toISOString();
      }

      // Insert venta legacy
      const fechaIso = new Date().toISOString();
      const insertVenta = await window.electronAPI.dbRun(
        `INSERT INTO venta (id, idcliente, fecha, subtotal, descuento, total, fpago, comprob, numfactura, formapago, anulado, codempresa, iva, fechapago, usuario, ordencompra, ispagos, transporte, trial279)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [legacyId, (clienteRow?.cedula||null), fechaIso, tot.subtotal, descuentoCalc, totalVenta, tipoVentaCode, comprobSigla, numeroComprobante, 1, 'N', 1, tot.iva, fechaPagoStr, 'admin', null, (formaPago==='contado'?'S':'N'), 0, '0']
      );
      if(!insertVenta || insertVenta.success===false){
        await window.electronAPI.dbRun('ROLLBACK');
        return { success:false, error:'No se pudo registrar la venta resultante' };
      }

      // Insert ventadet y ajustar stock delta
      let item = 1;
      for(const p of productosVenta){
        const hasVentadet = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='ventadet'");
        if(hasVentadet?.data?.name === 'ventadet'){
          await window.electronAPI.dbRun(
            'INSERT INTO ventadet (item, idventa, codprod, cantidad, precio, producto) VALUES (?,?,?,?,?,?)',
            [item++, legacyId, p.codigo, p.cantidad, p.precio, p.descripcion]
          );
        }
        // Delta stock
        const diff = p.cantidad - p.cantidadOriginal;
        if(diff !== 0){
          if(diff > 0){
            const upd = await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [diff, p.codigo]);
            if(!upd || upd.success===false){ await window.electronAPI.dbRun('ROLLBACK'); return { success:false, error:`No se pudo descontar stock adicional de ${p.codigo}` }; }
          } else { // devolver
            const inc = await window.electronAPI.dbRun('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [Math.abs(diff), p.codigo]);
            if(!inc || inc.success===false){ await window.electronAPI.dbRun('ROLLBACK'); return { success:false, error:`No se pudo devolver stock de ${p.codigo}` }; }
          }
        }
      }

      // Crédito: registrar estructuras legacy (abono inicial = anticipo) y cuotas
      if(formaPago === 'credito'){
        // Registrar credito (saldo después de anticipo)
        let saldoCreditoBase = saldo; // totalVenta - anticipo
        try {
          const CreditoLegacyExists = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='credito'");
          if(CreditoLegacyExists?.data?.name === 'credito'){
            await window.electronAPI.dbRun('INSERT INTO credito (idventa, plazo, saldo) VALUES (?,?,?)', [legacyId, plazoDias, saldoCreditoBase]);
          }
        } catch(_){ }
        // Registrar abono inicial (anticipo)
        if(anticipo > 0){
          const hasAbono = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='abono'");
          if(hasAbono?.data?.name === 'abono'){
            const resAb = await window.electronAPI.dbRun('INSERT INTO abono (idventa, idcliente, fecha, monto, fpago, nrorecibo, formapago, idusuario, trial272) VALUES (?, ?, DATE(\'now\'), ?, 1, NULL, 1, 1, \"0\")', [legacyId, (clienteRow?.cedula||null), anticipo]);
            if(resAb?.success) anticipoIdAbono = resAb.data?.id || null;
          }
        }
        // Generar cuotas (idéntico enfoque al hook)
        const { interesTotal, totalFinanciado, valoresCuota, interesesCuota, valorCuotaProm } = distribuirCuotas({ saldoBase: saldo, interesPorc, numCuotas });
        // Insert resumen item=1
        try {
          const hasCuotas = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='cuotas'");
          if(hasCuotas?.data?.name === 'cuotas'){
            const valorCuotaPromFinal = valorCuotaProm;
            const fechaPago = fechaPagoStr; // ya calculada
            await window.electronAPI.dbRun('INSERT INTO cuotas (idventa, item, fecha, monto1, interes, monto2, interesmora, idabono, interespagado, trial275) VALUES (?,1,?,?,?,?,0,?,0,?)', [legacyId, fechaPago, valorCuotaPromFinal, interesTotal, totalFinanciado, anticipoIdAbono, String(numCuotas)]);
            // Fechas distribuidas
            const hoy = new Date();
            const plazoTotal = plazoDias>0 ? plazoDias : Math.max(numCuotas-1,0);
            const diasOffsets = [];
            for(let i=1;i<=numCuotas;i++){ const frac=i/numCuotas; diasOffsets.push(Math.round(plazoTotal*frac)); }
            let saldoRest = totalFinanciado;
            for(let i=0;i<numCuotas;i++){
              const cuotaValor = valoresCuota[i];
              const interesParte = interesesCuota[i];
              saldoRest = round2(saldoRest - cuotaValor);
              const fechaCuota = new Date(hoy.getTime()); fechaCuota.setDate(fechaCuota.getDate()+diasOffsets[i]);
              await window.electronAPI.dbRun('INSERT INTO cuotas (idventa, item, fecha, monto1, interes, monto2, interesmora, idabono, interespagado, trial275) VALUES (?,?,?,?,?,?,0,NULL,0,NULL)', [legacyId, i+2, fechaCuota.toISOString(), cuotaValor, interesParte, saldoRest]);
            }
          }
        } catch(_){}
      }

  // Actualizar reserva a completada (antes se usaba 'vendida')
  await window.electronAPI.dbRun('UPDATE reservacion SET estado = ? WHERE id = ?', ['completada', idReserva]);

      await window.electronAPI.dbRun('COMMIT');
      return { success:true, data:{ idventa: legacyId, total: totalVenta, saldo, anticipo } };
    } catch(e){
      try { await window.electronAPI.dbRun('ROLLBACK'); } catch(_){ }
      return { success:false, error:e.message };
    }
  }
}

// Extender prototipo con método cancelar si no contempla validación estricta
ReservaController.prototype.cancelar = async function({ id }) {
  if(!id) return { success:false, error:'ID requerido' };
  try {
    const r = await window.electronAPI.dbGetSingle('SELECT estado FROM reservacion WHERE id = ?', [id]);
    if(!r.success || !r.data) return { success:false, error:'Reservación no encontrada' };
    const estado = (r.data.estado||'').toLowerCase();
    if(estado !== 'activa') return { success:false, error:'Solo se pueden cancelar reservaciones ACTIVAS.' };
    // UPDATE condicional por estado para evitar condición de carrera
    const upd = await window.electronAPI.dbRun("UPDATE reservacion SET estado='cancelada' WHERE id = ? AND estado='activa'", [id]);
    if(!upd.success){ return { success:false, error: upd.error || 'No se pudo cancelar' }; }
    // Verificar filas afectadas si la librería expone changes
    if(typeof upd.data?.changes === 'number' && upd.data.changes === 0){
      return { success:false, error:'La reservación ya no está activa.' };
    }
    return { success:true };
  } catch(e){
    return { success:false, error:e.message };
  }
};

export default ReservaController;
