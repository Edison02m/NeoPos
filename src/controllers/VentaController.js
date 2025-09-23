const DatabaseController = require('./DatabaseController');
const ComprobanteService = require('./ComprobanteService');

class VentaController {
  constructor() {
    this.dbController = new DatabaseController();
    this.comprobanteService = new ComprobanteService();
  }

  // Crear nueva venta (compatibilidad con tablas legacy: venta, ventadet)
  async crearVenta(ventaData, items) {
    try {
      const db = await this.dbController.getDatabase();
      
      // Iniciar transacción
      await db.run('BEGIN TRANSACTION');
      
      try {
        const round2 = (n) => {
          const x = Math.round((Number(n) || 0) * 100) / 100;
          return x === 0 ? 0 : x;
        };
        // Generar ID legacy de 14 chars (YYYYMMDDHHmmss)
        const buildLegacyId = () => {
          const d = new Date();
          const p = (n) => String(n).padStart(2, '0');
          return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`.slice(0,14);
        };
        const legacyId = ventaData.id || buildLegacyId();

        // Mapear campos mínimos a tabla 'venta'
        const comprob = ventaData.tipo_comprobante === 'factura' ? 'F' : 'N';
        // Obtener número centralizado si no viene ya
        let numfactura = ventaData.numero_comprobante || null;
        if(!numfactura){
          const next = await this.comprobanteService.obtenerSiguiente(comprob);
          if(next.success){
            numfactura = next.data.numero;
          } else {
            // Fallback timestamp
            const ts = Date.now().toString().slice(-6);
            numfactura = (comprob==='F'?'002-001':'001-001')+`-${ts}`;
          }
        }
        const fpago = Number(ventaData.fpago ?? 0); // 0 contado, 1 credito, 2 plan
        const formapago = Number(ventaData.formapago ?? 1); // 1 efectivo, 2 cheque, 3 tarjeta
        const fecha = ventaData.fecha || new Date().toISOString();
  const iva = round2(ventaData.iva);
  const subtotal = round2(ventaData.subtotal);
  const descuento = round2(ventaData.descuento);
  const total = round2(ventaData.total);

        // Insertar en la tabla venta usando ordencompra para números de nota de venta
        await db.run(`
          INSERT INTO venta (
            id, idcliente, fecha, subtotal, descuento, total,
            fpago, comprob, numfactura, formapago, anulado, codempresa, iva,
            fechapago, usuario, ordencompra, ispagos, transporte, trial279
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'N', 1, ?, NULL, 'admin', ?, ?, 0, '0')
        `, [
          legacyId,
          ventaData.idcliente || ventaData.cliente_ruc_ci || null,
          fecha,
          subtotal,
          descuento,
          total,
          fpago,
          comprob,
          numfactura,
          formapago,
          iva,
          null, // ordencompra se deja en null
          (fpago === 0 ? 'S' : 'N')
        ]);

        // Insertar detalle en 'ventadet' si existe; si no, degradar a actualización de stock solamente
        const hasVentadet = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ventadet'");
        let itemSeq = 1;
        for (const item of items) {
          // Actualizar stock del producto (por codigo)
          await db.run(`UPDATE producto SET almacen = almacen - ? WHERE codigo = ?`, [Number(item.cantidad)||0, item.codigo]);

          if (hasVentadet) {
            await db.run(`
              INSERT INTO ventadet (
                item, idventa, codprod, cantidad, precio, producto
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
              itemSeq++,
              legacyId,
              item.codigo,
              Number(item.cantidad)||0,
              Number(item.precio_unitario ?? item.precio)||0,
              item.descripcion || ''
            ]);
          }
        }

        // Compatibilidad: si la venta es crédito/plan y existe tabla legacy 'cuotas', registrar una fila mínima
        if (fpago === 1 || fpago === 2) {
          // Legacy: registrar crédito (tabla 'credito') si existe
          const hasCreditoLegacy = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='credito'");
          const abonoInicialRaw = Number(ventaData.abono_inicial)||0;
          const abonoInicial = round2(Math.max(abonoInicialRaw, 0));
          const saldo = round2(Math.max(total - abonoInicial, 0));
          if (hasCreditoLegacy) {
            try {
              await db.run(`INSERT INTO credito (idventa, plazo, saldo, trial275) VALUES (?, ?, ?, '0')`, [legacyId, Number(ventaData.plazo_dias)||0, saldo]);
            } catch (e) {
              console.warn('[VentaController] No se pudo insertar en credito (legacy):', e.message);
            }
          }
          const hasCuotasLegacy = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='cuotas'");
            if (hasCuotasLegacy) {
              const fechapago = ventaData.fechapago || null;
              const interesPorc = Math.max(Number(ventaData.interes_porc)||0, 0);
              const numCuotas = Math.max(parseInt(ventaData.num_cuotas || ventaData.numCuotas || 0, 10) || 0, 1);
              const interesTotal = interesPorc > 0 ? round2(saldo * (interesPorc / 100)) : 0;
              const totalFinanciado = round2(saldo + interesTotal);
              // === Distribución multi-cuotas (igual que hook) ===
              // item=1  -> resumen (monto1=valor cuota promedio, interes=interés total, monto2=total financiado)
              // item>=2 -> detalle (monto1=valor cuota individual, interes=porción plana, monto2=saldo restante tras pagar esa cuota)
              // Redondeo: reparto de centavos para que la suma exacta de cuotas == totalFinanciado
              // Interés: distribuido plano con mismo método de ajuste de centavos
              // Fechas: lineales dentro del plazo (i/numCuotas * plazoDias)

              // Insertar abono inicial primero (si corresponde) para obtener su ID y relacionar
              let abonoInicialId = null;
              if (abonoInicial > 0) {
                try {
                  const resAb = await db.run(`INSERT INTO abono (idventa, idcliente, fecha, monto, fpago, nrorecibo, formapago, idusuario, trial272) VALUES (?, ?, DATE('now'), ?, 1, NULL, ?, 1, '0')`, [legacyId, (ventaData.idcliente || ventaData.cliente_ruc_ci || null), abonoInicial, formapago]);
                  abonoInicialId = resAb?.lastID || null;
                } catch(e){ console.warn('[VentaController] No se pudo guardar abono inicial para cuota:', e.message); }
              }

              // Distribución cuotas
              const baseCuota = Math.floor((totalFinanciado / numCuotas) * 100) / 100;
              let restoCent = Math.round(totalFinanciado * 100) - Math.round(baseCuota * 100) * numCuotas;
              const valoresCuota = Array.from({length:numCuotas}, ()=> baseCuota);
              for(let i=0;i<valoresCuota.length && restoCent>0;i++){ valoresCuota[i] = round2(valoresCuota[i] + 0.01); restoCent--; }

              const baseInt = numCuotas>0 ? Math.floor((interesTotal / numCuotas)*100)/100 : 0;
              let restoInt = Math.round(interesTotal*100) - Math.round(baseInt*100)*numCuotas;
              const interesesCuota = Array.from({length:numCuotas}, ()=> baseInt);
              for(let i=0;i<interesesCuota.length && restoInt>0;i++){ interesesCuota[i] = round2(interesesCuota[i] + 0.01); restoInt--; }

              const valorCuotaProm = round2(totalFinanciado / numCuotas);
              await db.run(`INSERT INTO cuotas (idventa, item, fecha, monto1, interes, monto2, interesmora, idabono, interespagado, trial275) VALUES (?, 1, ?, ?, ?, ?, 0, ?, 0, ?)` , [legacyId, fechapago, valorCuotaProm, interesTotal, totalFinanciado, abonoInicialId, String(numCuotas)]);

              // Fechas intermedias
              const hoy = new Date();
              const fechaLimite = fechapago ? new Date(fechapago) : new Date(hoy.getTime());
              const plazoTotalDias = Number(ventaData.plazo_dias)||0; 
              const valoresDias = [];
              for(let i=1;i<=numCuotas;i++){
                const frac = i/numCuotas;
                const diasOffset = Math.round(plazoTotalDias * frac);
                valoresDias.push(diasOffset);
              }
              let saldoRest = totalFinanciado;
              for(let i=0;i<numCuotas;i++){
                const cuotaVal = valoresCuota[i];
                const intVal = interesesCuota[i];
                saldoRest = round2(saldoRest - cuotaVal);
                let fechaCuota;
                try {
                  if(fechaLimite && !isNaN(fechaLimite.getTime())){
                    const tmp = new Date(hoy.getTime());
                    tmp.setDate(tmp.getDate() + valoresDias[i]);
                    fechaCuota = tmp.toISOString();
                  } else { fechaCuota = new Date(hoy.getTime() + (i+1)*86400000).toISOString(); }
                } catch (e) { fechaCuota = new Date().toISOString(); }
                await db.run(`INSERT INTO cuotas (idventa, item, fecha, monto1, interes, monto2, interesmora, idabono, interespagado, trial275) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 0, NULL)`, [legacyId, i+2, fechaCuota, cuotaVal, intVal, saldoRest]);
              }
            }
            // No volvemos a insertar abono inicial nuevamente (ya se insertó para capturar id)
            // Si se requiere duplicado legacy, agregar aquí; se omite para evitar inconsistencias
          }

          await db.run('COMMIT');
          return {
            success: true,
            data: { id: legacyId, ...ventaData },
            message: 'Venta registrada exitosamente (legacy)'
          };

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error al crear venta:', error);
      return {
        success: false,
        data: null,
        message: 'Error al registrar la venta: ' + error.message
      };
    }
  }

  // Buscar producto por código de barras o descripción
  async buscarProducto(termino) {
    try {
      const db = await this.dbController.getDatabase();
      
      const query = `
        SELECT 
          codigo as codigo,
          codbarra as codigo_barras,
          codaux as codigo_auxiliar,
          producto as descripcion,
          pvp as precio_unitario,
          almacen as stock
        FROM producto 
        WHERE (
          codbarra LIKE ? OR 
          codaux LIKE ? OR 
          producto LIKE ?
        )
        AND almacen > 0
        ORDER BY producto ASC
        LIMIT 20
      `;

      const searchTerm = `%${termino}%`;
      const result = await db.all(query, [searchTerm, searchTerm, searchTerm]);

      return {
        success: true,
        data: result,
        message: `Se encontraron ${result.length} productos`
      };

    } catch (error) {
      console.error('Error al buscar producto:', error);
      return {
        success: false,
        data: [],
        message: 'Error al buscar producto: ' + error.message
      };
    }
  }

  // Obtener último número de comprobante (desde tabla legacy 'venta')
  async obtenerUltimoNumeroComprobante(tipo = 'nota') {
    try {
      const sigla = (tipo === 'factura') ? 'F' : 'N';
      const next = await this.comprobanteService.preview(sigla);
      if(next.success) return { success:true, data: next.data.siguiente };
      // fallback
      const ts = Date.now().toString().slice(-6);
      return { success:true, data: (sigla==='F'?`002-001-${ts}`:`001-001-${ts}`) };
    } catch(error){
      console.error('Error al obtener último número de comprobante:', error);
      const ts = Date.now().toString().slice(-6);
      return { success:true, data: (tipo==='factura'?`002-001-${ts}`:`001-001-${ts}`) };
    }
  }

  // Obtener todas las ventas desde tabla legacy 'venta'
  async obtenerVentas(limite = 50) {
    try {
      const db = await this.dbController.getDatabase();
      
      const result = await db.all(`
        SELECT 
          v.id as id,
          v.fecha as fecha,
          v.total as total,
          v.fpago as fpago,
          v.formapago as formapago,
          v.comprob as comprob,
          v.numfactura as numero
        FROM venta v
        ORDER BY v.fecha DESC, v.id DESC
        LIMIT ?
      `, [limite]);

      return {
        success: true,
        data: result,
        message: `Se encontraron ${result.length} ventas`
      };

    } catch (error) {
      console.error('Error al obtener ventas:', error);
      return {
        success: false,
        data: [],
        message: 'Error al obtener ventas: ' + error.message
      };
    }
  }

  // Obtener venta por ID con items (legacy)
  async obtenerVentaPorId(id) {
    try {
      const db = await this.dbController.getDatabase();
      
      const venta = await db.get(`SELECT * FROM venta WHERE id = ?`, [id]);

      if (!venta) {
        return {
          success: false,
          data: null,
          message: 'Venta no encontrada'
        };
      }

      let items = [];
      const hasVentadet = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ventadet'");
      if (hasVentadet) {
        items = await db.all(`SELECT * FROM ventadet WHERE idventa = ?`, [id]);
      }

      return {
        success: true,
        data: {
          ...venta,
          items
        },
        message: 'Venta encontrada'
      };

    } catch (error) {
      console.error('Error al obtener venta por ID:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener venta: ' + error.message
      };
    }
  }

  // Buscar cliente por RUC/CI (tabla legacy 'cliente')
  async buscarClientePorRuc(ruc) {
    try {
      const db = await this.dbController.getDatabase();
      
      const result = await db.get(`
        SELECT 
          nombres,
          apellidos,
          cedula as ruc_ci,
          telefono,
          direccion
        FROM cliente 
        WHERE cedula = ?
      `, [ruc]);

      return {
        success: true,
        data: result,
        message: result ? 'Cliente encontrado' : 'Cliente no encontrado'
      };

    } catch (error) {
      console.error('Error al buscar cliente:', error);
      return {
        success: false,
        data: null,
        message: 'Error al buscar cliente: ' + error.message
      };
    }
  }
}

module.exports = VentaController;
