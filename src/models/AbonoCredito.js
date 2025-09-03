class AbonoCredito {
  static async create({ credito_id, monto_abono, fecha_abono, observaciones }) {
    const res = await window.electronAPI.dbRun(
      `INSERT INTO abono_credito (credito_id, monto_abono, fecha_abono, observaciones) VALUES (?, ?, ?, ?)`,
      [Number(credito_id), Number(monto_abono)||0, fecha_abono, observaciones || null]
    );
    if (!res.success) throw new Error(res.error || 'No se pudo registrar abono de crédito');
    return res.data;
  }

  static async listByCredito(credito_id) {
    const res = await window.electronAPI.dbQuery(
      `SELECT * FROM abono_credito WHERE credito_id = ? ORDER BY fecha_abono DESC, id DESC`,
      [Number(credito_id)]
    );
    if (!res.success) throw new Error(res.error);
    return res.data;
  }
}

export default AbonoCredito;
