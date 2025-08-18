const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseController {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../database/neopos.db');
  }

  async initializeDatabase() {
    try {
      // Asegurar que el directorio de base de datos existe
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Conectar a la base de datos
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error al conectar a la base de datos:', err);
          throw err;
        }
        console.log('Conectado a la base de datos SQLite');
      });

      // Habilitar foreign keys
      await this.runQuery('PRAGMA foreign_keys = ON');

      // Crear tablas si no existen
      await this.createTables();
      
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
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error al cerrar la base de datos:', err);
        } else {
          console.log('Conexión a la base de datos cerrada');
        }
      });
    }
  }
}

module.exports = DatabaseController;