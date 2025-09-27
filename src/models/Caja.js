class Caja {
  // Registra apertura de caja
  static async abrir({ id_usuario, fecha_ap, monto_ap, pagos = 0, ingresos = 0, existente = 0, estado = 'A' }) {
    const query = `INSERT INTO caja (id_usuario, fecha_ap, monto_ap, pagos, ingresos, existente, estado) VALUES (?,?,?,?,?,?,?)`;
    const params = [id_usuario, fecha_ap, monto_ap, pagos, ingresos, existente, estado];
    return await window.electronAPI.dbRun(query, params);
  }

  static async obtenerAperturaDelDia(fecha_ap) {
    const query = `SELECT * FROM caja WHERE fecha_ap = ? LIMIT 1`;
    const res = await window.electronAPI.dbGetSingle(query, [fecha_ap]);
    return res;
  }
}

export default Caja;