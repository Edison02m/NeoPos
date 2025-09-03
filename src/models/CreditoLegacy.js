class CreditoLegacy {
  // Crea un registro en tabla legacy 'credito' si existe: (idventa, plazo, saldo, trial275)
  static async create({ idventa, plazo, saldo }) {
    // Verificar existencia de tabla 'credito'
    const exists = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='credito'");
    if (!exists?.data || exists.data.name !== 'credito') {
      return { success: false, skipped: true, reason: 'Tabla credito no existe' };
    }
    const res = await window.electronAPI.dbRun(
      `INSERT INTO credito (idventa, plazo, saldo, trial275) VALUES (?, ?, ?, '0')`,
      [idventa, Number(plazo) || 0, Number(saldo) || 0]
    );
    if (!res.success) throw new Error(res.error || 'No se pudo registrar crédito');
    return res.data;
  }

  static async listByVenta(idventa) {
    const exists = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='credito'");
    if (!exists?.data || exists.data.name !== 'credito') {
      return [];
    }
    const res = await window.electronAPI.dbQuery(
      `SELECT * FROM credito WHERE idventa = ? ORDER BY rowid DESC`,
      [idventa]
    );
    if (!res.success) throw new Error(res.error);
    return res.data;
  }
}

export default CreditoLegacy;
