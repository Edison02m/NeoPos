class Proveedor {
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
    const result = await window.electronAPI.dbQuery('SELECT * FROM proveedor ORDER BY empresa');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findById(cod) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM proveedor WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByName(empresa) {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM proveedor WHERE empresa LIKE ?', 
      [`%${empresa}%`]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByRuc(ruc) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM proveedor WHERE ruc = ?', [ruc]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async create(proveedorData) {
    // Validar campos requeridos
    if (!proveedorData.empresa) {
      throw new Error('El campo empresa es requerido');
    }
    
    // Generar código autoincremental
    const countResult = await window.electronAPI.dbGetSingle('SELECT COUNT(*) as count FROM proveedor');
    if (!countResult.success) {
      throw new Error(countResult.error);
    }
    const nextId = (countResult.data.count || 0) + 1;
    const cod = nextId.toString();
    
    // Verificar si ya existe un proveedor con el mismo RUC (si se proporciona)
    if (proveedorData.ruc && proveedorData.ruc.trim() !== '') {
      const existingProveedor = await this.findByRuc(proveedorData.ruc);
      if (existingProveedor) {
        throw new Error('Ya existe un proveedor con este RUC');
      }
    }
    
    console.log('Creando proveedor con datos:', proveedorData);
    
    const result = await window.electronAPI.dbRun(
      'INSERT INTO proveedor (cod, empresa, direccion, telefono, fax, ciudad, representante, mail, ruc, tipoid, relacionado, trial279) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        cod,
        proveedorData.empresa, 
        proveedorData.direccion || '', 
        proveedorData.telefono || '', 
        proveedorData.fax || '',
        proveedorData.ciudad || '',
        proveedorData.representante || '',
        proveedorData.mail || '', 
        proveedorData.ruc || '', 
        proveedorData.tipoid || '',
        proveedorData.relacionado || '',
        proveedorData.trial279 || ''
      ]
    );
    if (!result.success) {
      console.error('Error al crear proveedor:', result.error);
      throw new Error(result.error);
    }
    return result.data;
  }

  static async update(cod, proveedorData) {
    const result = await window.electronAPI.dbRun(
      'UPDATE proveedor SET empresa = ?, direccion = ?, telefono = ?, fax = ?, ciudad = ?, representante = ?, mail = ?, ruc = ?, tipoid = ?, relacionado = ?, trial279 = ? WHERE cod = ?',
      [
        proveedorData.empresa, 
        proveedorData.direccion || '', 
        proveedorData.telefono || '', 
        proveedorData.fax || '',
        proveedorData.ciudad || '',
        proveedorData.representante || '',
        proveedorData.mail || '', 
        proveedorData.ruc || '', 
        proveedorData.tipoid || '',
        proveedorData.relacionado || '',
        proveedorData.trial279 || '',
        cod
      ]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async delete(cod) {
    const result = await window.electronAPI.dbRun('DELETE FROM proveedor WHERE cod = ?', [cod]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async search(searchTerm) {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM proveedor WHERE empresa LIKE ? OR ruc LIKE ? OR mail LIKE ? OR representante LIKE ? ORDER BY empresa',
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export default Proveedor;