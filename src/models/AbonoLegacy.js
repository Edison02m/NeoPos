class AbonoLegacy {
  static async create({ idventa, idcliente, fecha, monto, fpago, nrorecibo, formapago, idusuario }) {
    const res = await window.electronAPI.dbRun(
      `INSERT INTO abono (idventa, idcliente, fecha, monto, fpago, nrorecibo, formapago, idusuario, trial272) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '0')`,
      [idventa, idcliente || null, fecha, Number(monto)||0, Number(fpago)||0, nrorecibo || null, Number(formapago)||0, Number(idusuario)||1]
    );
    if (!res.success) throw new Error(res.error || 'No se pudo registrar abono');
    return res.data;
  }

  static async listByVenta(idventa) {
    const res = await window.electronAPI.dbQuery(`SELECT * FROM abono WHERE idventa = ? ORDER BY fecha DESC, id DESC`, [idventa]);
    if (!res.success) throw new Error(res.error);
    return res.data;
  }
}

export default AbonoLegacy;
