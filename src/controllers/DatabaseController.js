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
      // Extra resources (recommended location when packaged)
      path.join(process.resourcesPath || installRoot, 'database', 'neopos.db'),
      // Unpacked asar (if database was unpacked inside asarUnpack)
      path.join(process.resourcesPath || installRoot, 'app.asar.unpacked', 'database', 'neopos.db'),
      // Install root fallback (legacy extraFiles placement)
      path.join(installRoot, 'database', 'neopos.db'),
      // Dev fallback
      path.join(__dirname, '../../database/neopos.db')
    ];

    console.log('🔧 Modo detectado:', this.isDev ? 'DESARROLLO' : 'PRODUCCIÓN');
    console.log('📂 Ruta de BD destino:', this.dbPath);
  // Nota: this.resourceDbPath no se usa; dejamos log de candidatos
  console.log('📦 Rutas candidatas de recurso:', this.seedCandidates.join(' | '));
    this.isClosed = false;
  }

  async initializeDatabase() {
    try {
      console.log('🔌 Iniciando inicialización de base de datos...');
      
      if (this.db && !this.isClosed) {
        console.log('✅ Base de datos ya inicializada');
        return true;
      }

      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        console.log('📁 Creando directorio de base de datos:', dbDir);
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (!fs.existsSync(this.dbPath)) {
        console.log('🔄 Base de datos no existe, buscando archivo de semilla...');
        let copied = false;
        for (const candidate of this.seedCandidates) {
          if (candidate && fs.existsSync(candidate)) {
            fs.copyFileSync(candidate, this.dbPath);
            console.log('✅ Base de datos copiada desde:', candidate);
            copied = true;
            break;
          }
        }
        if (!copied) {
          fs.closeSync(fs.openSync(this.dbPath, 'w'));
          console.warn('⚠️ No se encontró archivo de semilla, se creó una BD vacía');
        }
      } else {
        console.log('✅ Base de datos ya existe en:', this.dbPath);
      }

      // Conectar a la base de datos
      this.db = await new Promise((resolve, reject) => {
        const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE, (err) => {
          if (err) reject(err);
          else resolve(db);
        });
      });

      console.log('🔗 Conectado a la base de datos...');

      // Configurar la base de datos
      await new Promise((resolve, reject) => {
        this.db.exec('PRAGMA foreign_keys = ON;', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Resetear el flag de cerrado
      this.isClosed = false;

      // Crear tablas necesarias
      await this.createTables();

      console.log('✅ Base de datos inicializada completamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      
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
      
      throw error;
    }
  }

  async createTables() {
    try {
      console.log('📝 Creando tablas del sistema...');
      
      // Tabla configuracion_dispositivos
      await new Promise((resolve, reject) => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS configuracion_dispositivos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            valor TEXT NOT NULL,
            configuracion TEXT,
            fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tipo)
          );
          CREATE INDEX IF NOT EXISTS idx_config_disp_tipo ON configuracion_dispositivos(tipo);
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Tabla usuario
      await new Promise((resolve, reject) => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS usuario (
            cod INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT NOT NULL,
            contrasena TEXT NOT NULL,
            tipo INTEGER NOT NULL CHECK(tipo IN (1, 2)),
            codempresa INTEGER DEFAULT 1,
            alias TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Tabla empresa
      await new Promise((resolve, reject) => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS empresa (
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
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Tabla cliente
      await new Promise((resolve, reject) => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS cliente (
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
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log('✅ Tablas creadas exitosamente');
    } catch (error) {
      console.error('❌ Error creando tablas:', error);
      throw error;
    }
  }

  async updateTableStructures() {
  // Por solicitud, no alterar estructuras automáticamente aquí
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

  isConnected() {
    return this.db != null && !this.isClosed;
  }

  async executeQuery(query, params = []) {
    try {
      if (!this.isConnected()) {
        await this.initializeDatabase();
      }
      return new Promise((resolve, reject) => {
        this.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    } catch (error) {
      console.error('Error ejecutando query:', error);
      throw error;
    }
  }

  async getSingleRecord(query, params = []) {
    try {
      if (!this.isConnected()) {
        await this.initializeDatabase();
      }
      return new Promise((resolve, reject) => {
        this.db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } catch (error) {
      console.error('Error obteniendo registro:', error);
      throw error;
    }
  }

  async runQuery(query, params = []) {
    try {
      if (!this.isConnected()) {
        await this.initializeDatabase();
      }
      return new Promise((resolve, reject) => {
        this.db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    } catch (error) {
      console.error('Error ejecutando query:', error);
      throw error;
    }
  }

  // Exponer la instancia bruta para controladores que la requieren
  async getDatabase() {
    if (!this.db || this.isClosed) {
      await this.initializeDatabase();
    }
    // Adapt a minimal wrapper API similar to what some controllers expect
    const db = this.db;
    return {
      run: (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(err){ err?rej(err):res({ lastID: this.lastID, changes: this.changes }); })),
      all: (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (err, rows)=> err?rej(err):res(rows))),
      get: (sql, params=[]) => new Promise((res, rej) => db.get(sql, params, (err, row)=> err?rej(err):res(row)))
    };
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