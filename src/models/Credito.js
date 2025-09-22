class Credito {
  // Tabla: credito (legacy) campos observados: idventa (TEXT14), plazo (REAL), saldo (REAL), trial275 (TEXT1)
  static async findAll() {
    const result = await window.electronAPI.dbQuery('SELECT * FROM credito ORDER BY idventa DESC');
    if(!result.success) throw new Error(result.error);
    return result.data;
  }

  static async findByVenta(idventa){
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM credito WHERE idventa = ?', [idventa]);
    if(!result.success) throw new Error(result.error);
    return result.data;
  }

  static async create({ idventa, plazo = 30, saldo = 0 }){
    if(!idventa) throw new Error('idventa requerido');
    const result = await window.electronAPI.dbRun(
      'INSERT INTO credito (idventa, plazo, saldo, trial275) VALUES (?,?,?,"0")',
      [idventa, Number(plazo)||0, Number(saldo)||0]
    );
    if(!result.success) throw new Error(result.error);
    return { success:true, id: result.lastID };
  }

  static async updateSaldo(idventa, nuevoSaldo){
    const result = await window.electronAPI.dbRun('UPDATE credito SET saldo = ? WHERE idventa = ?', [Number(nuevoSaldo)||0, idventa]);
    if(!result.success) throw new Error(result.error);
    return { success:true };
  }

  static async delete(idventa){
    const result = await window.electronAPI.dbRun('DELETE FROM credito WHERE idventa = ?', [idventa]);
    if(!result.success) throw new Error(result.error);
    return { success:true };
  }
}

export default Credito;
