const DatabaseController = require('./DatabaseController');
const { DevVenta, genLegacyId14 } = require('../models/DevVenta');
const { DevVentaDet } = require('../models/DevVentaDet');

/**
 * Devolución de Venta
 * - Crea cabecera en devventa y detalle en devventadet
 * - Reintegra stock en producto.almacen
 * - Opcional: registra asiento en caja (no implementado aquí)
 */
class DevolucionVentaController {
  constructor(){ this.dbController = new DatabaseController(); }

  /**
   * Crear devolución desde una venta existente
   * @param {Object} payload
   *  - ventaId: string (id legacy 14) de la tabla venta
   *  - idcliente: string (cedula/cod)
   *  - items: [{ codprod, cantidad, precio }]
   *  - fecha (opcional ISO)
   *  - fpago (0 contado, 1 credito, 2 plan)
   *  - formapago (1 efectivo, 2 cheque, 3 tarjeta, 4 transferencia)
   */
  async crearDevolucionDesdeVenta(payload){
    const { ventaId, idcliente = null, items = [], fecha = null, fpago = 0, formapago = 1 } = payload || {};
    if(!ventaId) return { success:false, error:'ventaId requerido' };
    if(!Array.isArray(items) || items.length===0) return { success:false, error:'items vacíos' };

    try{
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN');
      try{
        // Calcular totales
        let subtotal = 0; let descuento = 0; let total = 0;
        for(const it of items){ subtotal += Number(it.precio||0) * Number(it.cantidad||0); }
        total = subtotal; // sin descuentos/iva por simplicidad (legacy)

        const idDev = await DevVenta.create({ id: genLegacyId14(), idcliente, fecha, subtotal, descuento, total, fpago, formapago });
        await DevVentaDet.insertMany({ idventa: idDev, items });

        // Reintegrar stock
        for(const it of items){
          const cant = Number(it.cantidad)||0;
          if(cant>0){ await db.run('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [cant, it.codprod]); }
        }

        // Marcar la venta original: '0' si total, '2' si parcial
        let estadoDev = '0';
        try {
          const row = await db.get(`SELECT total FROM venta WHERE id = ?`, [ventaId]);
          const ventaTotal = Number(row?.total)||0;
          const esTotal = Math.abs(total - ventaTotal) < 0.01;
          estadoDev = esTotal ? '0' : '2';
        } catch(_){ estadoDev = '0'; }
        const upd = await db.run(`UPDATE venta SET trial279 = ? WHERE id = ?`, [estadoDev, ventaId]);
        if(!upd || upd.success === false){ throw new Error('No se pudo marcar la venta como devuelta'); }

        await db.run('COMMIT');
        return { success:true, data:{ id: idDev } };
      }catch(e){ await db.run('ROLLBACK'); throw e; }
    }catch(error){
      console.error('[DevolucionVentaController] crearDevolucionDesdeVenta error:', error);
      return { success:false, error: error.message };
    }
  }

  /** Obtener devoluciones recientes */
  async listar({ limit = 200 } = {}){
    try{
      const db = await this.dbController.getDatabase();
      const rows = await db.all(`SELECT * FROM devventa ORDER BY fecha DESC, id DESC LIMIT ?`, [Number(limit)||200]);
      return { success:true, data: rows };
    }catch(error){ return { success:false, error: error.message }; }
  }

  /** Listar por rango de fechas */
  async listarPorRango({ desde=null, hasta=null, limit=1000 } = {}){
    try{
      const db = await this.dbController.getDatabase();
      const where = []; const params = [];
      if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
      if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
      const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
      const rows = await db.all(`SELECT * FROM devventa ${whereSql} ORDER BY fecha DESC, id DESC LIMIT ?`, [...params, Number(limit)||1000]);
      return { success:true, data: rows };
    }catch(error){ return { success:false, error: error.message }; }
  }

  /** Eliminar devoluciones por IDs: revierte stock y recalcula estado trial279 */
  async eliminar(ids = []){
    if(!Array.isArray(ids) || ids.length===0) return { success:false, error:'ids vacíos' };
    try{
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN');
      try{
        for(const id of ids){
          // obtener detalles y venta original
          const dets = await db.all('SELECT codprod, cantidad, idventa FROM devventadet WHERE idventa = ?', [id]);
          let originalId = dets?.[0]?.idventa || null;
          // revertir stock
          for(const it of dets||[]){ const c = Number(it.cantidad)||0; if(c>0){ await db.run('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [c, it.codprod]); } }
          // borrar
          await db.run('DELETE FROM devventadet WHERE idventa = ?', [id]);
          await db.run('DELETE FROM devventa WHERE id = ?', [id]);
          // recalcular estado venta
          if(originalId){
            const r1 = await db.get('SELECT SUM(cantidad) as total FROM ventadet WHERE idventa = ?', [originalId]);
            const r2 = await db.get('SELECT SUM(cantidad) as total FROM devventadet WHERE idventa = ?', [originalId]);
            const tc = Number(r1?.total||0); const td = Number(r2?.total||0);
            const estado = td<=0 ? '1' : (td<tc ? '2' : '0');
            await db.run('UPDATE venta SET trial279 = ? WHERE id = ?', [estado, originalId]);
          }
        }
        await db.run('COMMIT');
        return { success:true };
      }catch(e){ await db.run('ROLLBACK'); throw e; }
    }catch(error){ return { success:false, error: error.message }; }
  }
}

module.exports = DevolucionVentaController;
