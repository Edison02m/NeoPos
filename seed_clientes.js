const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Conectar a la base de datos del proyecto
const dbPath = path.join(__dirname, 'database/neopos.db');
console.log('📂 Conectando a:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar:', err);
    return;
  }
  console.log('✅ Conectado a la base de datos');
});

// Verificar si hay datos en la tabla cliente
db.get('SELECT COUNT(*) as count FROM cliente', (err, row) => {
  if (err) {
    console.error('❌ Error al consultar clientes:', err);
    db.close();
    return;
  }
  
  console.log(`📊 Clientes existentes: ${row.count}`);
  
  if (row.count === 0) {
    console.log('🔧 Insertando datos de prueba...');
    
    // Insertar algunos clientes de prueba
    const clientes = [
      {
        cod: '0001',
        apellidos: 'Pérez',
        nombres: 'Juan Carlos',
        direccion: 'Av. Principal 123',
        telefono: '0999123456',
        cedula: '1234567890',
        tratamiento: 'Sr.',
        tipo: 1,
        limite: 1000.00,
        referencias: 'Cliente frecuente',
        email: 'juan.perez@email.com',
        tipoid: 'C',
        relacionado: 'N',
        trial272: 'N'
      },
      {
        cod: '0002',
        apellidos: 'García',
        nombres: 'María Elena',
        direccion: 'Calle Secundaria 456',
        telefono: '0999654321',
        cedula: '0987654321',
        tratamiento: 'Sra.',
        tipo: 1,
        limite: 1500.00,
        referencias: 'Cliente VIP',
        email: 'maria.garcia@email.com',
        tipoid: 'C',
        relacionado: 'N',
        trial272: 'N'
      },
      {
        cod: '0003',
        apellidos: 'Rodríguez',
        nombres: 'Carlos Alberto',
        direccion: 'Plaza Central 789',
        telefono: '0999111222',
        cedula: '1122334455',
        tratamiento: 'Dr.',
        tipo: 2,
        limite: 2000.00,
        referencias: 'Médico',
        email: 'carlos.rodriguez@email.com',
        tipoid: 'C',
        relacionado: 'N',
        trial272: 'N'
      }
    ];
    
    const stmt = db.prepare(`
      INSERT INTO cliente (
        cod, apellidos, nombres, direccion, telefono, cedula, 
        tratamiento, tipo, limite, referencias, email, tipoid, 
        relacionado, trial272
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    clientes.forEach((cliente, index) => {
      stmt.run([
        cliente.cod, cliente.apellidos, cliente.nombres, cliente.direccion,
        cliente.telefono, cliente.cedula, cliente.tratamiento, cliente.tipo,
        cliente.limite, cliente.referencias, cliente.email, cliente.tipoid,
        cliente.relacionado, cliente.trial272
      ], (err) => {
        if (err) {
          console.error(`❌ Error insertando cliente ${index + 1}:`, err);
        } else {
          console.log(`✅ Cliente ${index + 1} insertado: ${cliente.nombres} ${cliente.apellidos}`);
        }
      });
    });
    
    stmt.finalize(() => {
      console.log('🎉 Datos de prueba insertados correctamente');
      
      // Verificar los datos insertados
      db.all('SELECT cod, nombres, apellidos FROM cliente ORDER BY apellidos', (err, rows) => {
        if (err) {
          console.error('❌ Error verificando datos:', err);
        } else {
          console.log('📋 Clientes en la base de datos:');
          rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.cod} - ${row.nombres} ${row.apellidos}`);
          });
        }
        db.close();
      });
    });
  } else {
    console.log('✅ Ya hay datos en la tabla cliente');
    
    // Mostrar los datos existentes
    db.all('SELECT cod, nombres, apellidos FROM cliente ORDER BY apellidos', (err, rows) => {
      if (err) {
        console.error('❌ Error consultando datos:', err);
      } else {
        console.log('📋 Clientes existentes:');
        rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.cod} - ${row.nombres} ${row.apellidos}`);
        });
      }
      db.close();
    });
  }
});
