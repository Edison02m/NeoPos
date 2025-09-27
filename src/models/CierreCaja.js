class CierreCaja {
  static async obtenerPorFecha(fecha){
    const q = `SELECT * FROM cierrecaja WHERE fecha = ? LIMIT 1`;
    return await window.electronAPI.dbGetSingle(q, [fecha]);
  }

  static async listar(limit = 30){
    const q = `SELECT * FROM cierrecaja ORDER BY fecha DESC LIMIT ?`;
    const res = await window.electronAPI.dbQuery(q, [limit]);
    return res.success ? res.data : [];
  }

  static async guardar(datos){
    const campos = ['fecha','bill100','bill50','bill20','bill10','bill5','bill1','mon1','mon50c','mon25c','mon10c','mon5c','mon1c','codempresa'];
    const placeholders = campos.map(()=>'?').join(',');
    const q = `INSERT INTO cierrecaja (${campos.join(',')}) VALUES (${placeholders})`;
    const params = campos.map(c=> datos[c] ?? 0);
    return await window.electronAPI.dbRun(q, params);
  }

  static async actualizar(fecha, datos){
    const camposUpdate = ['bill100','bill50','bill20','bill10','bill5','bill1','mon1','mon50c','mon25c','mon10c','mon5c','mon1c'];
    const setClause = camposUpdate.map(c=> `${c} = ?`).join(',');
    const q = `UPDATE cierrecaja SET ${setClause} WHERE fecha = ?`;
    const params = camposUpdate.map(c=> datos[c] ?? 0).concat([fecha]);
    return await window.electronAPI.dbRun(q, params);
  }

  static async eliminar(fecha){
    const q = `DELETE FROM cierrecaja WHERE fecha = ?`;
    return await window.electronAPI.dbRun(q, [fecha]);
  }
}
export default CierreCaja;