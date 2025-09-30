const DatabaseController = require('../controllers/DatabaseController');

class DevVentaDet {
  static async insertMany({ idventa, items }){
    const dbCtrl = new DatabaseController();
    const db = await dbCtrl.getDatabase();
    let i = 1;
    for (const it of items) {
      await db.run(
        `INSERT INTO devventadet (item, idventa, codprod, cantidad, precio, trial275) VALUES (?, ?, ?, ?, ?, '0')`,
        [ i++, idventa, it.codprod, Number(it.cantidad)||0, Number(it.precio)||0 ]
      );
    }
  }
}

module.exports = { DevVentaDet };
