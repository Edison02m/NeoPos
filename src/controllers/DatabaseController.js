const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseController {
  constructor() {
    this.db = null;
    // Detección robusta de modo (usar app.isPackaged)
    // Nota: app.isPackaged es fiable incluso antes de app.whenReady()
    this.isDev = !app || !app.isPackaged;

    // Ruta donde se abrirá/creará la BD (siempre escribible)
    if (this.isDev) {
      // En desarrollo: usar la carpeta database del proyecto
      this.dbPath = path.join(__dirname, '../../database/neopos.db');
    } else {
      // En producción: usar la carpeta de datos del usuario
      this.dbPath = path.join(app.getPath('userData'), 'neopos.db');
    }

    // Rutas candidatas del recurso de semilla (solo lectura)
    const installRoot = path.dirname(process.execPath); // e.g., C:\\Program Files\\NeoPOS
    this.seedCandidates = [
      // Instalación (extraFiles coloca database/ aquí)
      path.join(installRoot, 'database', 'neopos.db'),
      // Recursos (si se usara extraResources)
      path.join(process.resourcesPath || installRoot, 'database', 'neopos.db'),
      // Dev fallback
      path.join(__dirname, '../../database/neopos.db')
    ];

    console.log('🔧 Modo detectado:', this.isDev ? 'DESARROLLO' : 'PRODUCCIÓN');
    console.log('📂 Ruta de BD destino:', this.dbPath);
    console.log('📦 Ruta de BD recurso:', this.resourceDbPath);
    this.isClosed = false;
  }

  async initializeDatabase() {
    try {
      console.log('🔌 Iniciando inicialización de base de datos...');
      
      // Si ya está inicializada y no está cerrada, no hacer nada
      if (this.db && !this.isClosed) {
        console.log('✅ Base de datos ya inicializada');
        return true;
      }

      // Asegurar que el directorio de base de datos existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        console.log('📁 Creando directorio de base de datos:', dbDir);
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Si la base de datos no existe en el destino, copiar desde un candidato de semilla (si disponible)
      if (!fs.existsSync(this.dbPath)) {
        console.log('🔄 Base de datos no existe, buscando archivo de semilla para copiar...');
        try {
          let copied = false;
          for (const candidate of this.seedCandidates) {
            if (candidate && fs.existsSync(candidate)) {
              console.log('📦 Semilla encontrada en:', candidate);
              fs.copyFileSync(candidate, this.dbPath);
              copied = true;
              console.log('✅ Base de datos copiada desde semilla');
              break;
            }
          }
          if (!copied) {
            // Crear un archivo vacío si no hay recurso (permitirá crear tablas luego)
            fs.closeSync(fs.openSync(this.dbPath, 'w'));
            console.warn('⚠️ No se encontró archivo de semilla, se creó una BD vacía');
          }
        } catch (copyErr) {
          console.error('❌ Error copiando/creando la base de datos:', copyErr);
          throw new Error(`No se pudo crear la base de datos: ${copyErr.message}`);
        }
      } else {
        console.log('✅ Base de datos ya existe en:', this.dbPath);
      }

      // Conectar a la base de datos con promesa
      console.log('🔗 Conectando a la base de datos...');
      const normalizedPath = this.dbPath.replace(/\\/g, '/');
      const connectOnce = () => new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(normalizedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Conectado a la base de datos SQLite en:', this.dbPath);
            resolve();
          }
        });
      });
      try {
        await connectOnce();
      } catch (err) {
        console.error('❌ Error al conectar (primer intento):', err);
        if (String(err && err.message).includes('SQLITE_CANTOPEN')) {
          console.log('↻ Reintentando conexión a la BD en 500ms...');
          await new Promise(r => setTimeout(r, 500));
          await connectOnce();
        } else {
          throw new Error(`Error de conexión SQLite: ${err.message}`);
        }
      }

      // Resetear el flag de cerrado
      this.isClosed = false;

      // Habilitar foreign keys
      console.log('🔧 Configurando base de datos...');
      await this.runQuery('PRAGMA foreign_keys = ON');

      // Crear tablas si no existen
      await this.createTables();
      
      // Verificar y actualizar estructura de tablas existentes
      await this.updateTableStructures();
      
      // Insertar datos de ejemplo si la base de datos está vacía
      await this.seedDatabase();

      console.log('✅ Base de datos inicializada completamente');
      return true;
    } catch (error) {
      console.error('❌ Error crítico al inicializar la base de datos:', error);
      
      // Limpiar en caso de error
      if (this.db) {
        try {
          this.db.close();
        } catch (e) {
          console.error('Error cerrando BD después de fallo:', e);
        }
        this.db = null;
      }
      this.isClosed = true;
      
      throw new Error(`Fallo en inicialización de BD: ${error.message}`);
    }
  }

  async createTables() {
    const usuarioTable = `CREATE TABLE IF NOT EXISTS usuario (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT NOT NULL,
      contrasena TEXT NOT NULL,
      tipo INTEGER NOT NULL CHECK(tipo IN (1, 2)),
      codempresa INTEGER DEFAULT 1,
      alias TEXT
    )`;
    
    // Tabla de empresas (singular) utilizada por el módulo de usuarios para el JOIN
    const empresaTable = `CREATE TABLE IF NOT EXISTS empresa (
      cod INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa TEXT(255),
      ruc TEXT(14),
      direccion TEXT(255),
      telefono TEXT(16),
      fax TEXT(16),
      email TEXT(41),
      web TEXT(51),
      representante TEXT(51),
      rsocial TEXT(255),
      logo TEXT(255),
      ciudad TEXT(100),
      codestab TEXT(3),
      codemi TEXT(3),
      direstablec TEXT(255),
      resolucion TEXT(10),
      contabilidad TEXT(1),
      trial275 TEXT(1)
    )`;
    
    const clienteTable = `CREATE TABLE IF NOT EXISTS cliente (
      cod TEXT(14) NOT NULL,
      apellidos TEXT(200),
      nombres TEXT(200),
      direccion TEXT(61),
      telefono TEXT(16),
      cedula TEXT(14),
      tratamiento TEXT(20),
      tipo REAL(11, 0),
      limite REAL(10, 2),
      referencias TEXT(100),
      email TEXT(100),
      tipoid TEXT(2),
      relacionado TEXT(1),
      trial272 TEXT(1),
      PRIMARY KEY (cod)
    )`;

    // Tabla de ventas
    const ventasTable = `CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_comprobante TEXT NOT NULL UNIQUE,
      tipo_comprobante TEXT NOT NULL,
      fecha TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      iva REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      cliente_nombres TEXT,
      cliente_apellidos TEXT,
      cliente_ruc_ci TEXT,
      cliente_telefono TEXT,
      cliente_direccion TEXT,
      estado TEXT DEFAULT 'activa',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`;

    // Tabla de items de venta
    const ventaItemsTable = `CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      codigo_barras TEXT,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
    )`;

    // Tabla legacy 'venta' (singular) para compatibilidad con sistemas anteriores
    const ventaLegacyTable = `CREATE TABLE IF NOT EXISTS venta (
      id TEXT(14) NOT NULL,
      idcliente TEXT(14),
      fecha TEXT,
      subtotal REAL(9, 3),
      descuento REAL(8, 2),
      total REAL(8, 2),
      fpago REAL(11, 0),
      comprob TEXT(1),
      numfactura TEXT(50),
      formapago REAL(11, 0),
      anulado TEXT(1),
      codempresa INTEGER NOT NULL,
      iva REAL(9, 3),
      fechapago TEXT,
      usuario TEXT(21),
      ordencompra TEXT(60),
      ispago TEXT(1),
      transporte REAL(8, 2),
      trial279 TEXT(1)
    )`;

    // Tabla para plazos y abonos de la venta
    const ventaCuotasTable = `CREATE TABLE IF NOT EXISTS venta_cuotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id TEXT NOT NULL,
      plazo_dias INTEGER NOT NULL,
      abono_inicial REAL NOT NULL DEFAULT 0,
      saldo REAL NOT NULL DEFAULT 0,
      fechapago TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`;
    
    await this.runQuery(usuarioTable);
    await this.runQuery(empresaTable);
    await this.runQuery(clienteTable);
    await this.runQuery(ventasTable);
    await this.runQuery(ventaItemsTable);
  await this.runQuery(ventaLegacyTable);
  await this.runQuery(ventaCuotasTable);
  }

  async updateTableStructures() {
    try {
      // Verificar si la columna trial279 existe en la tabla producto
      const tableInfo = await this.executeQuery("PRAGMA table_info(producto)");
      const hasTrialColumn = tableInfo.some(column => column.name === 'trial279');
      const hasIvaPercentageColumn = tableInfo.some(column => column.name === 'iva_percentage');
      
      if (!hasTrialColumn) {
        console.log('Agregando columna trial279 a la tabla producto...');
        await this.runQuery('ALTER TABLE producto ADD COLUMN trial279 INTEGER DEFAULT 0');
        console.log('Columna trial279 agregada exitosamente');
      }
      
      if (!hasIvaPercentageColumn) {
        console.log('Agregando columna iva_percentage a la tabla producto...');
        await this.runQuery('ALTER TABLE producto ADD COLUMN iva_percentage REAL DEFAULT 12.0');
        console.log('Columna iva_percentage agregada exitosamente');
      }
    } catch (error) {
      console.error('Error al actualizar estructura de tablas:', error);
      // No lanzar error para no interrumpir la inicialización
    }
  }

  async seedDatabase() {
    try {
      // Verificar empresa por defecto
      const existingEmp = await this.executeQuery('SELECT COUNT(*) as count FROM empresa');
      if (existingEmp[0] && Number(existingEmp[0].count) === 0) {
        console.log('Insertando empresa por defecto...');
        await this.runQuery('INSERT INTO empresa (empresa) VALUES (?)', ['Empresa 1']);
        console.log('Empresa por defecto creada con éxito');
      }

      // Verificar si ya hay usuarios
      const existingUsers = await this.executeQuery('SELECT COUNT(*) as count FROM usuario');
      if (existingUsers[0].count === 0) {
        // Insertar usuarios de ejemplo
        const users = [
          { usuario: 'admin', contrasena: 'admin123', tipo: 1, alias: 'Administrador Principal', codempresa: 1 },
          { usuario: 'user1', contrasena: 'user123', tipo: 2, alias: 'Usuario Regular', codempresa: 1 },
          { usuario: 'user2', contrasena: 'user123', tipo: 2, alias: 'Usuario Secundario', codempresa: 1 }
        ];

        for (const user of users) {
          await this.runQuery(
            'INSERT INTO usuario (usuario, contrasena, tipo, codempresa, alias) VALUES (?, ?, ?, ?, ?)',
            [user.usuario, user.contrasena, user.tipo, user.codempresa, user.alias]
          );
        }
        console.log('Usuarios de ejemplo agregados correctamente');
      }

      // La tabla de clientes está lista para usar sin datos de ejemplo
    } catch (error) {
      console.error('Error al agregar datos de ejemplo:', error);
    }
  }

  async executeQuery(query, params = []) {
    // Asegurar que la conexión esté activa
    if (!this.db || this.isClosed) {
      await this.initializeDatabase();
    }
    
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getSingleRecord(query, params = []) {
    // Asegurar que la conexión esté activa
    if (!this.db || this.isClosed) {
      await this.initializeDatabase();
    }
    
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async runQuery(query, params = []) {
    // Asegurar que la conexión esté activa
    if (!this.db || this.isClosed) {
      await this.initializeDatabase();
    }
    
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      if (this.db && !this.isClosed) {
        this.isClosed = true;
        this.db.close((err) => {
          if (err) {
            console.error('Error al cerrar la base de datos:', err);
          } else {
            console.log('Conexión a la base de datos cerrada correctamente');
          }
          this.db = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Método para verificar el estado de la conexión
  isConnected() {
    return this.db && !this.isClosed;
  }

  // Método para forzar el cierre inmediato
  forceClose() {
    if (this.db) {
      this.isClosed = true;
      this.db = null;
      console.log('Conexión a la base de datos cerrada forzadamente');
    }
  }
}

module.exports = DatabaseController;