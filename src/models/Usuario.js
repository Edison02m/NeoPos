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
    const result = await window.electronAPI.dbRun(
      'UPDATE usuario SET usuario = ?, contrasena = ?, tipo = ?, codempresa = ?, alias = ? WHERE cod = ?',
      [usuarioData.usuario, usuarioData.contrasena, usuarioData.tipo, usuarioData.codempresa, usuarioData.alias, cod]
    );
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

  static async authenticate(usuario, contrasena) {
    const result = await window.electronAPI.authenticateUser(usuario, contrasena);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export default Usuario;