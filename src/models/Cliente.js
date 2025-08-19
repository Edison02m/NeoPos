class Cliente {
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
    const result = await window.electronAPI.dbQuery('SELECT * FROM cliente ORDER BY apellidos, nombres');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findById(cod) {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByName(apellidos, nombres) {
    await this.initializeDB();
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM cliente WHERE apellidos LIKE ? AND nombres LIKE ?', 
      [`%${apellidos}%`, `%${nombres}%`]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByCedulaRuc(cedula) {
    await this.initializeDB();
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM cliente WHERE cedula = ?', [cedula]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async create(clienteData) {
    await this.initializeDB();
    
    // Validar campos requeridos
    if (!clienteData.apellidos || !clienteData.nombres) {
      throw new Error('Los campos apellidos y nombres son requeridos');
    }
    
    // Generar código autoincremental
    const countResult = await window.electronAPI.dbGetSingle('SELECT COUNT(*) as count FROM cliente');
    if (!countResult.success) {
      throw new Error(countResult.error);
    }
    const nextId = (countResult.data.count || 0) + 1;
    const cod = nextId.toString();
    
    // Verificar si ya existe un cliente con la misma cédula (si se proporciona)
    if (clienteData.cedula && clienteData.cedula.trim() !== '') {
      const existingCliente = await this.findByCedulaRuc(clienteData.cedula);
      if (existingCliente) {
        throw new Error('Ya existe un cliente con esta cédula/RUC');
      }
    }
    
    console.log('Creando cliente con datos:', clienteData);
    
    const result = await window.electronAPI.dbRun(
      'INSERT INTO cliente (cod, apellidos, nombres, direccion, telefono, cedula, tratamiento, tipo, limite, referencias, email, tipoid, relacionado, trial272) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        cod,
        clienteData.apellidos, 
        clienteData.nombres, 
        clienteData.direccion || '', 
        clienteData.telefono || '', 
        clienteData.cedula || '', 
        clienteData.tratamiento || '',
        clienteData.tipo || 0,
        clienteData.limite || 0.00,
        clienteData.referencias || '', 
        clienteData.email || '', 
        clienteData.tipoid || '',
        clienteData.relacionado || '',
        clienteData.trial272 || ''
      ]
    );
    if (!result.success) {
      console.error('Error al crear cliente:', result.error);
      throw new Error(result.error);
    }
    return result.data;
  }

  static async update(cod, clienteData) {
    await this.initializeDB();
    const result = await window.electronAPI.dbRun(
      'UPDATE cliente SET tratamiento = ?, apellidos = ?, nombres = ?, direccion = ?, telefono = ?, cedula = ?, referencias = ?, email = ?, relacionado = ?, trial272 = ? WHERE cod = ?',
      [
        clienteData.tratamiento || '', 
        clienteData.apellidos, 
        clienteData.nombres, 
        clienteData.direccion || '', 
        clienteData.telefono || '', 
        clienteData.cedula || '', 
        clienteData.referencias || '', 
        clienteData.email || '', 
        clienteData.relacionado || '',
        clienteData.trial272 || '',
        cod
      ]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async delete(cod) {
    await this.initializeDB();
    const result = await window.electronAPI.dbRun('DELETE FROM cliente WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async search(searchTerm) {
    await this.initializeDB();
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM cliente WHERE apellidos LIKE ? OR nombres LIKE ? OR cedula LIKE ? OR email LIKE ? ORDER BY apellidos, nombres',
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export default Cliente;