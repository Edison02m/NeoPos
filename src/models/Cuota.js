class Cuota {
  // Tabla legacy: cuotas (idventa TEXT14, item REAL(3,0), fecha TEXT, monto1 REAL, interes REAL, monto2 REAL, interesmora REAL, idabono REAL, interespagado REAL, trial275 TEXT)
  static async listByVenta(idventa){
    const res = await window.electronAPI.dbQuery('SELECT * FROM cuotas WHERE idventa = ? ORDER BY item ASC', [idventa]);
    if(!res.success) throw new Error(res.error);
    return res.data;
  }
}
export default Cuota;
