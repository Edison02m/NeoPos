const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'neopos.db');
const db = new sqlite3.Database(dbPath);

console.log('Consultando tabla empresa...');

db.get("SELECT cod, empresa, logo FROM empresa LIMIT 1", (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Datos de empresa:', row);
    if (row && row.logo) {
      console.log('Logo encontrado:', row.logo);
    } else {
      console.log('No hay logo configurado en la tabla empresa');
    }
  }
  db.close();
});
