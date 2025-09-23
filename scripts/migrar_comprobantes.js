// Script de migración para sincronizar contadores de la tabla 'comprobante'
// Ejecutar una vez (node scripts/migrar_comprobantes.js) antes de usar numeración centralizada si ya existen ventas previas.

const path = require('path');
const DatabaseController = require('../src/controllers/DatabaseController');
const ComprobanteService = require('../src/controllers/ComprobanteService');

(async()=>{
  const dbController = new DatabaseController();
  try {
    await dbController.initializeDatabase();
    const db = await dbController.getDatabase();

    const parseMax = (rows,prefix) => {
      if(!rows || !rows.length) return 0;
      let max = 0;
      for(const r of rows){
        const num = r.numfactura || '';
        const parts = num.split('-');
        if(parts.length===3 && num.startsWith(prefix)){
          const sec = parseInt(parts[2]);
            if(!isNaN(sec) && sec>max) max=sec;
        }
      }
      return max;
    };

    const notasRows = await db.all("SELECT numfactura FROM venta WHERE numfactura LIKE '001-%'");
    const factRows = await db.all("SELECT numfactura FROM venta WHERE numfactura LIKE '002-%'");

    const maxNotas = parseMax(notasRows,'001-');
    const maxFact = parseMax(factRows,'002-');

    console.log('Máximos detectados:');
    console.log('  Notas (N):', maxNotas);
    console.log('  Facturas (F):', maxFact);

    // Asegurar filas en comprobante (utilizamos preview para crear sin incrementar)
    const service = new ComprobanteService();
    await service.preview('N');
    await service.preview('F');

    // Actualizar contador a max (no +1) para que el siguiente sea max+1
    await db.run('UPDATE comprobante SET contador = ? WHERE comprobante = ?', [maxNotas, 'N']);
    await db.run('UPDATE comprobante SET contador = ? WHERE comprobante = ?', [maxFact, 'F']);

    console.log('Contadores actualizados. Verifique con: SELECT * FROM comprobante;');
    process.exit(0);
  } catch(e){
    console.error('Error migración comprobantes:', e);
    process.exit(1);
  }
})();
