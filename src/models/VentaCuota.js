class VentaCuota {
  static async create({ venta_id, plazo_dias, abono_inicial = 0, saldo = 0, fechapago = null }) {
    const res = await window.electronAPI.dbRun(
      `INSERT INTO venta_cuotas (venta_id, plazo_dias, abono_inicial, saldo, fechapago) VALUES (?, ?, ?, ?, ?)`,
      [venta_id, Number(plazo_dias)||0, Number(abono_inicial)||0, Number(saldo)||0, fechapago]
    );
    if (!res.success) throw new Error(res.error || 'No se pudo crear la cuota');
    return res.data;
  }

  static async getByVentaId(venta_id) {
    const res = await window.electronAPI.dbQuery(
      `SELECT * FROM venta_cuotas WHERE venta_id = ? ORDER BY id DESC`,
      [venta_id]
    );
    if (!res.success) throw new Error(res.error);
    return res.data;
  }

  static async updateSaldo(id, nuevoSaldo) {
    const res = await window.electronAPI.dbRun(
      `UPDATE venta_cuotas SET saldo = ? WHERE id = ?`,
      [Number(nuevoSaldo)||0, id]
    );
    if (!res.success) throw new Error(res.error);
    return res.data;
  }
}

export default VentaCuota;
