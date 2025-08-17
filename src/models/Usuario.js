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
    await this.initializeDB();
    const result = await window.electronAPI.dbQuery('SELECT * FROM usuario');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findById(cod) {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM usuario WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByUsername(usuario) {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM usuario WHERE usuario = ?', [usuario]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async create(usuarioData) {
    await this.initializeDB();
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
    await this.initializeDB();
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
    await this.initializeDB();
    const result = await window.electronAPI.dbRun('DELETE FROM usuario WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async authenticate(usuario, contrasena) {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle(
      'SELECT * FROM usuario WHERE usuario = ? AND contrasena = ?', 
      [usuario, contrasena]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export default Usuario;