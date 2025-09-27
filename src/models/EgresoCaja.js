class EgresoCaja {
  static async listarPorCaja(id_caja){
    const q = `SELECT * FROM egresocaja WHERE id_caja = ? ORDER BY fecha DESC`;
    const res = await window.electronAPI.dbQuery(q, [id_caja]);
    return res.success ? res.data : [];
  }
  static async registrar({ id_caja, fecha, concepto, monto }){
    const q = `INSERT INTO egresocaja (id_caja, fecha, concepto, monto) VALUES (?,?,?,?)`;
    return await window.electronAPI.dbRun(q, [id_caja, fecha, concepto, monto]);
  }
}
export default EgresoCaja;