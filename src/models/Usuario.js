class Usuario {
  static async initializeDB() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    const result = await window.electronAPI.dbInitialize();
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  static async findAll() {
    const sql = `
      SELECT 
        u.cod, 
        u.usuario, 
        u.tipo, 
        u.codempresa, 
        u.alias,
        e.empresa AS empresa_nombre
      FROM usuario u
      LEFT JOIN empresa e ON e.cod = u.codempresa
      ORDER BY u.usuario`;
    const result = await window.electronAPI.dbQuery(sql);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findById(cod) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM usuario WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByUsuario(usuario) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM usuario WHERE usuario = ?', [usuario]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByUsername(usuario) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM usuario WHERE usuario = ?', [usuario]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async create(usuarioData) {
    const result = await window.electronAPI.dbRun(
      'INSERT INTO usuario (usuario, contrasena, tipo, codempresa, alias) VALUES (?, ?, ?, ?, ?)',
      [usuarioData.usuario, usuarioData.contrasena, usuarioData.tipo, usuarioData.codempresa || 1, usuarioData.alias]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async update(cod, usuarioData) {
    const hasNewPassword = typeof usuarioData.contrasena === 'string' && usuarioData.contrasena.trim() !== '';
    let sql, params;
    if (hasNewPassword) {
      sql = 'UPDATE usuario SET usuario = ?, contrasena = ?, tipo = ?, codempresa = ?, alias = ? WHERE cod = ?';
      params = [
        usuarioData.usuario,
        usuarioData.contrasena,
        usuarioData.tipo,
        usuarioData.codempresa,
        usuarioData.alias,
        cod
      ];
    } else {
      // Mantener contraseña actual: no tocar la columna contrasena
      sql = 'UPDATE usuario SET usuario = ?, tipo = ?, codempresa = ?, alias = ? WHERE cod = ?';
      params = [
        usuarioData.usuario,
        usuarioData.tipo,
        usuarioData.codempresa,
        usuarioData.alias,
        cod
      ];
    }
    const result = await window.electronAPI.dbRun(sql, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async delete(cod) {
    const result = await window.electronAPI.dbRun('DELETE FROM usuario WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Obtener listado de empresas para selector en Usuarios
  static async getAllEmpresas() {
    const result = await window.electronAPI.dbQuery(
      'SELECT cod, empresa FROM empresa ORDER BY empresa'
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data || [];
  }

  static async authenticate(usuario, contrasena) {
    const result = await window.electronAPI.authenticateUser(usuario, contrasena);
    if (!result.success) {
      // Normalizar mensajes de credenciales inválidas devolviendo null
      if(result.error && (
        result.error.toLowerCase().includes('no encontrado') ||
        result.error.toLowerCase().includes('incorrect') ||
        result.error.toLowerCase().includes('usuario') ||
        result.error.toLowerCase().includes('contraseña')
      )){
        return null;
      }
      // Errores reales (DB, sistema) sí lanzan
      throw new Error(result.error || 'Error autenticando usuario');
    }
    return result.data;
  }
}

export default Usuario;