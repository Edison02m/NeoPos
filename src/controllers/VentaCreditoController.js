const DatabaseController = require('./DatabaseController');

class VentaCreditoController {
  constructor() {
    this.dbController = new DatabaseController();
  }

  // Registra una cuota inicial para una venta legacy (venta_id = id texto de 14)
  async registrarCuotaInicial({ venta_id, plazo_dias, abono_inicial, total, cliente_ruc }) {
    try {
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN TRANSACTION');
      try {
        // Insertar registro de cuota
        const cuota = await db.run(
          `INSERT INTO venta_cuotas (venta_id, plazo_dias, abono_inicial, saldo, fechapago) VALUES (?, ?, ?, ?, ?)`,
          [venta_id, Number(plazo_dias)||0, Number(abono_inicial)||0, Math.max(Number(total)||0 - Number(abono_inicial)||0, 0), new Date(Date.now() + (Number(plazo_dias)||0)*24*60*60*1000).toISOString()]
        );

        await db.run('COMMIT');
        return { success: true, data: { id: cuota.lastID } };
      } catch (e) {
        await db.run('ROLLBACK');
        throw e;
      }
    } catch (error) {
      console.error('Error registrarCuotaInicial:', error);
      return { success: false, error: error.message };
    }
  }

  // Registrar un abono (moderno) asociado a una cuota
  async registrarAbonoCredito({ credito_id, monto_abono, observaciones }) {
    try {
      const db = await this.dbController.getDatabase();
      await db.run('BEGIN TRANSACTION');
      try {
        const ins = await db.run(
          `INSERT INTO abono_credito (credito_id, monto_abono, fecha_abono, observaciones) VALUES (?, ?, DATE('now'), ?)`,
          [Number(credito_id), Number(monto_abono)||0, observaciones || null]
        );
        // Actualizar saldo de cuota
        await db.run(`UPDATE venta_cuotas SET saldo = MAX(saldo - ?, 0) WHERE id = ?`, [Number(monto_abono)||0, Number(credito_id)]);
        await db.run('COMMIT');
        return { success: true, data: { id: ins.lastID } };
      } catch (e) {
        await db.run('ROLLBACK');
        throw e;
      }
    } catch (error) {
      console.error('Error registrarAbonoCredito:', error);
      return { success: false, error: error.message };
    }
  }

  // Legacy: registrar abono en tabla abono
  async registrarAbonoLegacy({ idventa, idcliente, monto, fpago = 1, formapago = 1, nrorecibo = null, idusuario = 1 }) {
    try {
      const db = await this.dbController.getDatabase();
      const ins = await db.run(
        `INSERT INTO abono (idventa, idcliente, fecha, monto, fpago, nrorecibo, formapago, idusuario, trial272) VALUES (?, ?, DATE('now'), ?, ?, ?, ?, ?, '0')`,
        [idventa, idcliente || null, Number(monto)||0, Number(fpago)||1, nrorecibo || null, Number(formapago)||1, Number(idusuario)||1]
      );
      return { success: true, data: { id: ins.lastID } };
    } catch (error) {
      console.error('Error registrarAbonoLegacy:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = VentaCreditoController;
