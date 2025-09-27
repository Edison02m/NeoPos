class Recaudacion {
  static async getByFecha(fecha){
    const q = `SELECT * FROM recaudacion WHERE fecha = ? LIMIT 1`;
    return await window.electronAPI.dbGetSingle(q, [fecha]);
  }
  static async listar(limit=30){
    const q = `SELECT * FROM recaudacion ORDER BY fecha DESC LIMIT ?`;
    const res = await window.electronAPI.dbQuery(q, [limit]);
    return res.success ? res.data : [];
  }
  static async guardar({ fecha, efectivo=0, cheque=0, tarjeta=0, codempresa }){
    const q = `INSERT INTO recaudacion (fecha, efectivo, cheque, tarjeta, codempresa) VALUES (?,?,?,?,?)`;
    return await window.electronAPI.dbRun(q, [fecha, efectivo, cheque, tarjeta, codempresa]);
  }

  static async actualizar(fecha, { efectivo=0, cheque=0, tarjeta=0 }){
    const q = `UPDATE recaudacion SET efectivo = ?, cheque = ?, tarjeta = ? WHERE fecha = ?`;
    return await window.electronAPI.dbRun(q, [efectivo, cheque, tarjeta, fecha]);
  }

  static async eliminar(fecha){
    const q = `DELETE FROM recaudacion WHERE fecha = ?`;
    return await window.electronAPI.dbRun(q, [fecha]);
  }
}
export default Recaudacion;