const DatabaseController = require('../controllers/DatabaseController');

function genLegacyId14() {
  const d = new Date();
  const pad = (n, l=2) => String(n).padStart(l, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth()+1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

class DevVenta {
  static async create({ id = null, idcliente = null, fecha = null, subtotal = 0, descuento = 0, total = 0, fpago = 0, formapago = 1 }){
    const dbCtrl = new DatabaseController();
    const db = await dbCtrl.getDatabase();
    const legacyId = id || genLegacyId14();
    const now = fecha || new Date().toISOString();
    await db.run(
      `INSERT INTO devventa (id, idcliente, fecha, subtotal, descuento, total, fpago, formapago, trial275) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '0')`,
      [legacyId, idcliente, now, Number(subtotal)||0, Number(descuento)||0, Number(total)||0, Number(fpago)||0, Number(formapago)||1]
    );
    return legacyId;
  }
}

module.exports = { DevVenta, genLegacyId14 };
