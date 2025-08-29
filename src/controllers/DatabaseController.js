const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseController {
  constructor() {
    this.db = null;
    
    // Detección de modo de desarrollo
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV || __dirname.includes('src');
    
    console.log('🔍 NODE_ENV actual:', process.env.NODE_ENV);
    console.log('🔍 __dirname:', __dirname);
    console.log('🔧 Modo detectado:', isDev ? 'DESARROLLO' : 'PRODUCCIÓN');
    
    if (isDev) {
      // En desarrollo: usar la carpeta database del proyecto
      this.dbPath = path.join(__dirname, '../../database/neopos.db');
    } else {
      // En producción: usar userData
      const { app } = require('electron');
      const userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../database');
      this.dbPath = path.join(userDataPath, 'neopos.db');
    }
    
    console.log('📂 Ruta de base de datos configurada:', this.dbPath);
    this.isClosed = false;
  }

  async initializeDatabase() {
    try {
      // Si ya está inicializada y no está cerrada, no hacer nada
      if (this.db && !this.isClosed) {
        return true;
      }

      // Asegurar que el directorio de base de datos existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Si estamos en producción y la base de datos no existe, copiarla desde los recursos
      const isDev = process.env.NODE_ENV === 'development';
      if (!isDev && !fs.existsSync(this.dbPath)) {
        const resourceDbPath = path.join(__dirname, '../database/neopos.db');
        if (fs.existsSync(resourceDbPath)) {
          fs.copyFileSync(resourceDbPath, this.dbPath);
          console.log('Base de datos copiada desde recursos');
        }
      }

      // Conectar a la base de datos
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error al conectar a la base de datos:', err);
          throw err;
        }
        console.log('Conectado a la base de datos SQLite en:', this.dbPath);
      });

      // Resetear el flag de cerrado
      this.isClosed = false;

      // Habilitar foreign keys
      await this.runQuery('PRAGMA foreign_keys = ON');

      // Crear tablas si no existen
      await this.createTables();
      
      // Verificar y actualizar estructura de tablas existentes
      await this.updateTableStructures();
      
      // Insertar datos de ejemplo si la base de datos está vacía
      await this.seedDatabase();

      return true;
    } catch (error) {
      console.error('Error al inicializar la base de datos:', error);
      throw error;
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
    
    await this.runQuery(usuarioTable);
    await this.runQuery(clienteTable);
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