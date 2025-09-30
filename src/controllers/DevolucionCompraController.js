const DatabaseController = require('./DatabaseController');

/**
 * Devolución de Compra
 * - Crea cabecera en devcompra y detalle en devcompradet
 * - Ajusta stock en producto.almacen (la devolución RESTA stock)
 * - Recalcula estado de compra trial272: '0' total, '2' parcial, '1' sin devoluciones
 */
class DevolucionCompraController {
  constructor(){ this.dbController = new DatabaseController(); }

  /**
   * Crear devolución desde una compra existente, usando el id de compra ORIGINAL
   * @param {Object} payload
   *  - compraId: string (id legacy 14) de la tabla compra
   *  - idprov: string (cod/ruc)
   *  - items: [{ codprod, cantidad, precio }]
   *  - fecha (opcional ISO)
   *  - fpago (string: CONTADO|TRANSFERENCIA|CREDITO|OTRO)
   */
  async crearDevolucionDesdeCompra(payload){
    const { compraId, idprov = null, items = [], fecha = null, fpago = 'CONTADO' } = payload || {};
    if(!compraId) return { success:false, error:'compraId requerido' };
    if(!Array.isArray(items) || items.length===0) return { success:false, error:'items vacíos' };

    try{
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN');
      try{
        // Calcular totales (sin IVA explícito, como legacy)
        let subtotal = 0; let descuento = 0; let total = 0;
        for(const it of items){ subtotal += Number(it.precio||0) * Number(it.cantidad||0); }
        total = subtotal;

        // Insertar cabecera devcompra
        const idDev = String((new Date()).toISOString().replace(/[^0-9]/g,'').slice(0,14));
        await db.run(`INSERT INTO devcompra (id, idprov, fecha, subtotal, descuento, total, fpago, trial275) VALUES (?, ?, ?, ?, 0, ?, ?, '0')`, [
          idDev, idprov, fecha || new Date().toISOString(), subtotal, total, fpago
        ]);

        // Insertar detalle devcompradet con idcompra = compraId (ORIGINAL) y ajustar stock (restar)
        let item = 1;
        for(const it of items){
          const cant = Number(it.cantidad)||0; if(cant<=0) continue;
          await db.run(`INSERT INTO devcompradet (item, idcompra, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, '0')`, [
            item++, compraId, it.codprod, cant, Number(it.precio)||0
          ]);
          await db.run('UPDATE producto SET almacen = almacen - ? WHERE codigo = ?', [cant, it.codprod]);
        }

        // Recalcular estado de la compra trial272: 0 total, 2 parcial
        const r1 = await db.get('SELECT SUM(cantidad) as total FROM compradet WHERE idcompra = ?', [compraId]);
        const r2 = await db.get('SELECT SUM(cantidad) as total FROM devcompradet WHERE idcompra = ?', [compraId]);
        const tc = Number(r1?.total||0); const td = Number(r2?.total||0);
        const estado = td >= tc ? '0' : '2';
        await db.run('UPDATE compra SET trial272 = ? WHERE id = ?', [estado, compraId]);

        await db.run('COMMIT');
        return { success:true, data:{ id: idDev } };
      }catch(e){ await db.run('ROLLBACK'); throw e; }
    }catch(error){
      console.error('[DevolucionCompraController] crearDevolucionDesdeCompra error:', error);
      return { success:false, error: error.message };
    }
  }

  /** Listar por rango de fechas */
  async listarPorRango({ desde=null, hasta=null, limit=1000 } = {}){
    try{
      const db = await this.dbController.getDatabase();
      const where = []; const params = [];
      if(desde){ where.push('date(fecha) >= date(?)'); params.push(desde); }
      if(hasta){ where.push('date(fecha) <= date(?)'); params.push(hasta); }
      const whereSql = where.length? ('WHERE ' + where.join(' AND ')) : '';
      const rows = await db.all(`SELECT * FROM devcompra ${whereSql} ORDER BY fecha DESC, id DESC LIMIT ?`, [...params, Number(limit)||1000]);
      return { success:true, data: rows };
    }catch(error){ return { success:false, error: error.message }; }
  }

  /** Eliminar devoluciones por IDs: revierte stock y recalcula estado trial272 */
  async eliminar(ids = []){
    if(!Array.isArray(ids) || ids.length===0) return { success:false, error:'ids vacíos' };
    try{
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN');
      try{
        for(const id of ids){
          // obtener detalles; idcompra en detalle referencia la compra ORIGINAL
          const dets = await db.all('SELECT codprod, cantidad, idcompra FROM devcompradet WHERE idcompra = ?', [id]);
          let originalId = dets?.[0]?.idcompra || null;
          // revertir stock (sumar)
          for(const it of dets||[]){ const c = Number(it.cantidad)||0; if(c>0){ await db.run('UPDATE producto SET almacen = almacen + ? WHERE codigo = ?', [c, it.codprod]); } }
          // borrar
          await db.run('DELETE FROM devcompradet WHERE idcompra = ?', [id]);
          await db.run('DELETE FROM devcompra WHERE id = ?', [id]);
          // recalcular estado compra
          if(originalId){
            const r1 = await db.get('SELECT SUM(cantidad) as total FROM compradet WHERE idcompra = ?', [originalId]);
            const r2 = await db.get('SELECT SUM(cantidad) as total FROM devcompradet WHERE idcompra = ?', [originalId]);
            const tc = Number(r1?.total||0); const td = Number(r2?.total||0);
            const estado = td<=0 ? '1' : (td<tc ? '2' : '0');
            await db.run('UPDATE compra SET trial272 = ? WHERE id = ?', [estado, originalId]);
          }
        }
        await db.run('COMMIT');
        return { success:true };
      }catch(e){ await db.run('ROLLBACK'); throw e; }
    }catch(error){ return { success:false, error: error.message }; }
  }
}

module.exports = DevolucionCompraController;
