// Usar la API de Electron en lugar de importar directamente DatabaseController

class Empresas {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.ruc = data.ruc || '';
    this.razon_social = data.razon_social || '';
    this.direccion = data.direccion || '';
    this.telefono = data.telefono || '';
    this.fax = data.fax || '';
    this.email = data.email || '';
    this.pagina_web = data.pagina_web || '';
    this.representante = data.representante || '';
    this.fecha_creacion = data.fecha_creacion || null;
    this.fecha_actualizacion = data.fecha_actualizacion || null;
  }

  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS empresas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ruc TEXT NOT NULL UNIQUE,
        razon_social TEXT NOT NULL,
        direccion TEXT NOT NULL,
        telefono TEXT,
        fax TEXT,
        email TEXT,
        pagina_web TEXT,
        representante TEXT,
        fecha_creacion TEXT NOT NULL,
        fecha_actualizacion TEXT NOT NULL
      )
    `;
    
    try {
      const result = await window.electronAPI.dbRun(sql);
      if (result.success) {
        console.log('Tabla empresas creada exitosamente');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al crear tabla empresas:', error);
      throw error;
    }
  }

  static async findAll() {
    const sql = 'SELECT * FROM empresas ORDER BY nombre';
    try {
      const result = await window.electronAPI.dbQuery(sql);
      if (result.success) {
        return result.data.map(row => new Empresas(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener empresas:', error);
      throw error;
    }
  }

  static async findById(id) {
    const sql = 'SELECT * FROM empresas WHERE id = ?';
    try {
      const result = await window.electronAPI.dbGetSingle(sql, [id]);
      if (result.success) {
        return result.data ? new Empresas(result.data) : null;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener empresa por ID:', error);
      throw error;
    }
  }

  static async findByRuc(ruc) {
    const sql = 'SELECT * FROM empresas WHERE ruc = ?';
    try {
      const result = await window.electronAPI.dbGetSingle(sql, [ruc]);
      if (result.success) {
        return result.data ? new Empresas(result.data) : null;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener empresa por RUC:', error);
      throw error;
    }
  }

  async save() {
    const now = new Date().toISOString();
    
    if (this.id) {
      // Actualizar empresa existente
      const sql = `
        UPDATE empresas SET 
          nombre = ?, ruc = ?, razon_social = ?, direccion = ?, 
          telefono = ?, fax = ?, email = ?, pagina_web = ?, 
          representante = ?, fecha_actualizacion = ?
        WHERE id = ?
      `;
      
      const params = [
        this.nombre, this.ruc, this.razon_social, this.direccion,
        this.telefono, this.fax, this.email, this.pagina_web,
        this.representante, now, this.id
      ];
      
      try {
        const result = await window.electronAPI.dbRun(sql, params);
        if (result.success) {
          this.fecha_actualizacion = now;
          return this;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error al actualizar empresa:', error);
        throw error;
      }
    } else {
      // Crear nueva empresa
      const sql = `
        INSERT INTO empresas (
          nombre, ruc, razon_social, direccion, telefono, 
          fax, email, pagina_web, representante, 
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        this.nombre, this.ruc, this.razon_social, this.direccion,
        this.telefono, this.fax, this.email, this.pagina_web,
        this.representante, now, now
      ];
      
      try {
        const result = await window.electronAPI.dbRun(sql, params);
        if (result.success) {
          this.id = result.data.lastID;
          this.fecha_creacion = now;
          this.fecha_actualizacion = now;
          return this;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error al crear empresa:', error);
        throw error;
      }
    }
  }

  static async delete(id) {
    const sql = 'DELETE FROM empresas WHERE id = ?';
    try {
      const result = await window.electronAPI.dbRun(sql, [id]);
      if (result.success) {
        return result.data.changes > 0;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al eliminar empresa:', error);
      throw error;
    }
  }

  static async search(searchTerm) {
    const sql = `
      SELECT * FROM empresas 
      WHERE nombre LIKE ? OR ruc LIKE ? OR razon_social LIKE ? 
      ORDER BY nombre
    `;
    const searchPattern = `%${searchTerm}%`;
    
    try {
      const result = await window.electronAPI.dbQuery(sql, [searchPattern, searchPattern, searchPattern]);
      if (result.success) {
        return result.data.map(row => new Empresas(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al buscar empresas:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      ruc: this.ruc,
      razon_social: this.razon_social,
      direccion: this.direccion,
      telefono: this.telefono,
      fax: this.fax,
      email: this.email,
      pagina_web: this.pagina_web,
      representante: this.representante,
      fecha_creacion: this.fecha_creacion,
      fecha_actualizacion: this.fecha_actualizacion
    };
  }
}

module.exports = Empresas;