class Empresa {
  constructor(data = {}) {
    this.cod = data.cod || '';
    this.nombre = data.nombre || '';
    this.ruc = data.ruc || '';
    this.direccion = data.direccion || '';
    this.telefono = data.telefono || '';
    this.fax = data.fax || '';
    this.email = data.email || '';
    this.web = data.web || '';
    this.representante = data.representante || '';
    this.rsocial = data.rsocial || '';
    this.logo = data.logo || '';
    this.ciudad = data.ciudad || '';
    this.codestab = data.codestab || '';
    this.codemi = data.codemi || '';
    this.direstablec = data.direstablec || '';
    this.resolucion = data.resolucion || '';
    this.contabilidad = data.contabilidad || '';
    this.trial275 = data.trial275 || '';
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
    } else if (this.ruc.length > 14) {
      errors.push('El RUC no puede tener más de 14 caracteres');
    }

    if (!this.rsocial || this.rsocial.trim() === '') {
      errors.push('La razón social es requerida');
    }

    if (!this.direccion || this.direccion.trim() === '') {
      errors.push('La dirección es requerida');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('El email no tiene un formato válido');
    }

    if (this.web && !/^https?:\/\/.+/.test(this.web)) {
      errors.push('La página web debe comenzar con http:// o https://');
    }



    // Validar longitudes de campos
    if (this.telefono && this.telefono.length > 16) {
      errors.push('El teléfono no puede tener más de 16 caracteres');
    }

    if (this.codestab && this.codestab.length > 3) {
      errors.push('El código de establecimiento no puede tener más de 3 caracteres');
    }

    if (this.codemi && this.codemi.length > 3) {
      errors.push('El código de emisión no puede tener más de 3 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convertir a objeto plano para la base de datos
  toDatabase() {
    return {
      empresa: this.nombre,
      ruc: this.ruc,
      direccion: this.direccion,
      telefono: this.telefono,
      fax: this.fax,
      email: this.email,
      web: this.web,
      representante: this.representante,
      rsocial: this.rsocial,
      logo: this.logo,
      ciudad: this.ciudad,
      codestab: this.codestab,
      codemi: this.codemi,
      direstablec: this.direstablec,
      resolucion: this.resolucion,
      contabilidad: this.contabilidad,
      trial275: this.trial275
    };
  }

  // Crear desde datos de la base de datos
  static fromDatabase(data) {
    return new Empresa({
      cod: data.cod || '',
      nombre: data.empresa,
      ruc: data.ruc,
      direccion: data.direccion,
      telefono: data.telefono,
      fax: data.fax,
      email: data.email,
      web: data.web,
      representante: data.representante,
      rsocial: data.rsocial,
      logo: data.logo,
      ciudad: data.ciudad,
      codestab: data.codestab,
      codemi: data.codemi,
      direstablec: data.direstablec,
      resolucion: data.resolucion,
      contabilidad: data.contabilidad,
      trial275: data.trial275,
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
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM empresa LIMIT 1');
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
      empresa.cod = existingEmpresa.cod;
      empresa.updateTimestamp();
      
      const updateQuery = `
        UPDATE empresa SET 
          empresa = ?,
          ruc = ?,
          direccion = ?,
          telefono = ?,
          fax = ?,
          email = ?,
          web = ?,
          representante = ?,
          rsocial = ?,
          logo = ?,
          ciudad = ?,
          codestab = ?,
          codemi = ?,
          direstablec = ?,
          resolucion = ?,
          contabilidad = ?,
          trial275 = ?
        WHERE cod = ?
      `;
      
      const dbData = empresa.toDatabase();
      const params = [
        dbData.empresa,
        dbData.ruc,
        dbData.direccion,
        dbData.telefono,
        dbData.fax,
        dbData.email,
        dbData.web,
        dbData.representante,
        dbData.rsocial,
        dbData.logo,
        dbData.ciudad,
        dbData.codestab,
        dbData.codemi,
        dbData.direstablec,
        dbData.resolucion,
        dbData.contabilidad,
        dbData.trial275,
        existingEmpresa.cod
      ];
      
      const result = await window.electronAPI.dbRun(updateQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return empresa;
    } else {
      // Crear nueva empresa
      const insertQuery = `
        INSERT INTO empresa (
          empresa, ruc, direccion, telefono, 
          fax, email, web, representante, rsocial,
          logo, ciudad, codestab, codemi, direstablec,
          resolucion, contabilidad, trial275
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const dbData = empresa.toDatabase();
      const params = [
        dbData.empresa,
        dbData.ruc,
        dbData.direccion,
        dbData.telefono,
        dbData.fax,
        dbData.email,
        dbData.web,
        dbData.representante,
        dbData.rsocial,
        dbData.logo,
        dbData.ciudad,
        dbData.codestab,
        dbData.codemi,
        dbData.direstablec,
        dbData.resolucion,
        dbData.contabilidad,
        dbData.trial275
      ];
      
      const result = await window.electronAPI.dbRun(insertQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      empresa.cod = result.data.lastID;
      return empresa;
    }
  }

  // Verificar si existe una empresa
  static async exists() {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT COUNT(*) as count FROM empresa');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data.count > 0;
  }

  // Eliminar empresa
  static async delete() {
    await this.initializeDB();
    const result = await window.electronAPI.dbRun('DELETE FROM empresa');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Validar RUC único
  static async validateUniqueRUC(ruc, empresaCod = null) {
    await this.initializeDB();
    let query = 'SELECT cod FROM empresa WHERE ruc = ?';
    let params = [ruc];
    
    if (empresaCod) {
      query += ' AND cod != ?';
      params.push(empresaCod);
    }
    
    const result = await window.electronAPI.dbGetSingle(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return !result.data; // true si es único (no existe)
  }
}

export default Empresa;