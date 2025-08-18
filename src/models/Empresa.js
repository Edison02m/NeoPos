class Empresa {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.ruc = data.ruc || '';
    this.razonSocial = data.razonSocial || '';
    this.direccion = data.direccion || '';
    this.telefono = data.telefono || '';
    this.fax = data.fax || '';
    this.email = data.email || '';
    this.paginaWeb = data.paginaWeb || '';
    this.representante = data.representante || '';
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.fechaActualizacion = data.fechaActualizacion || new Date().toISOString();
  }

  // Inicializar base de datos
  static async initializeDB() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    const result = await window.electronAPI.dbInitialize();
    if (!result.success) {
      throw new Error(result.error);
    }

    // Crear tabla si no existe
    const createTableQuery = `
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
    
    const tableResult = await window.electronAPI.dbRun(createTableQuery);
    if (!tableResult.success) {
      throw new Error(tableResult.error);
    }
  }

  // Validar datos de la empresa
  validate() {
    const errors = [];

    if (!this.nombre || this.nombre.trim() === '') {
      errors.push('El nombre de la empresa es requerido');
    }

    if (!this.ruc || this.ruc.trim() === '') {
      errors.push('El RUC es requerido');
    } else if (!/^\d{10}001$/.test(this.ruc)) {
      errors.push('El RUC debe tener 13 dígitos terminados en 001');
    }

    if (!this.razonSocial || this.razonSocial.trim() === '') {
      errors.push('La razón social es requerida');
    }

    if (!this.direccion || this.direccion.trim() === '') {
      errors.push('La dirección es requerida');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('El email no tiene un formato válido');
    }

    if (this.paginaWeb && !/^https?:\/\/.+/.test(this.paginaWeb)) {
      errors.push('La página web debe comenzar con http:// o https://');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convertir a objeto plano para la base de datos
  toDatabase() {
    return {
      id: this.id,
      nombre: this.nombre,
      ruc: this.ruc,
      razon_social: this.razonSocial,
      direccion: this.direccion,
      telefono: this.telefono,
      fax: this.fax,
      email: this.email,
      pagina_web: this.paginaWeb,
      representante: this.representante,
      fecha_creacion: this.fechaCreacion,
      fecha_actualizacion: this.fechaActualizacion
    };
  }

  // Crear desde datos de la base de datos
  static fromDatabase(data) {
    return new Empresa({
      id: data.id,
      nombre: data.nombre,
      ruc: data.ruc,
      razonSocial: data.razon_social,
      direccion: data.direccion,
      telefono: data.telefono,
      fax: data.fax,
      email: data.email,
      paginaWeb: data.pagina_web,
      representante: data.representante,
      fechaCreacion: data.fecha_creacion,
      fechaActualizacion: data.fecha_actualizacion
    });
  }

  // Actualizar fecha de modificación
  updateTimestamp() {
    this.fechaActualizacion = new Date().toISOString();
  }

  // Obtener empresa (solo puede haber una)
  static async getEmpresa() {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM empresas LIMIT 1');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data ? this.fromDatabase(result.data) : null;
  }

  // Crear o actualizar empresa
  static async save(empresaData) {
    await this.initializeDB();
    
    const empresa = new Empresa(empresaData);
    const validation = empresa.validate();
    
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Verificar si ya existe una empresa
    const existingEmpresa = await this.getEmpresa();
    
    if (existingEmpresa) {
      // Actualizar empresa existente
      empresa.id = existingEmpresa.id;
      empresa.updateTimestamp();
      
      const updateQuery = `
        UPDATE empresas SET 
          nombre = ?,
          ruc = ?,
          razon_social = ?,
          direccion = ?,
          telefono = ?,
          fax = ?,
          email = ?,
          pagina_web = ?,
          representante = ?,
          fecha_actualizacion = ?
        WHERE id = ?
      `;
      
      const dbData = empresa.toDatabase();
      const params = [
        dbData.nombre,
        dbData.ruc,
        dbData.razon_social,
        dbData.direccion,
        dbData.telefono,
        dbData.fax,
        dbData.email,
        dbData.pagina_web,
        dbData.representante,
        dbData.fecha_actualizacion,
        dbData.id
      ];
      
      const result = await window.electronAPI.dbRun(updateQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return empresa;
    } else {
      // Crear nueva empresa
      const insertQuery = `
        INSERT INTO empresas (
          nombre, ruc, razon_social, direccion, telefono, 
          fax, email, pagina_web, representante, 
          fecha_creacion, fecha_actualizacion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const dbData = empresa.toDatabase();
      const params = [
        dbData.nombre,
        dbData.ruc,
        dbData.razon_social,
        dbData.direccion,
        dbData.telefono,
        dbData.fax,
        dbData.email,
        dbData.pagina_web,
        dbData.representante,
        dbData.fecha_creacion,
        dbData.fecha_actualizacion
      ];
      
      const result = await window.electronAPI.dbRun(insertQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      empresa.id = result.data.lastID;
      return empresa;
    }
  }

  // Verificar si existe una empresa
  static async exists() {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT COUNT(*) as count FROM empresas');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data.count > 0;
  }

  // Eliminar empresa
  static async delete() {
    await this.initializeDB();
    const result = await window.electronAPI.dbRun('DELETE FROM empresas');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Validar RUC único
  static async validateUniqueRUC(ruc, empresaId = null) {
    await this.initializeDB();
    let query = 'SELECT id FROM empresas WHERE ruc = ?';
    let params = [ruc];
    
    if (empresaId) {
      query += ' AND id != ?';
      params.push(empresaId);
    }
    
    const result = await window.electronAPI.dbGetSingle(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return !result.data; // true si es único (no existe)
  }
}

export default Empresa;