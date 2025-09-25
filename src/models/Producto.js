class Producto {
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
    const result = await window.electronAPI.dbQuery('SELECT * FROM producto ORDER BY producto');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findById(codigo) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM producto WHERE codigo = ?', [codigo]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByDescription(descripcion) {
    const result = await window.electronAPI.dbQuery(
      'SELECT * FROM producto WHERE producto LIKE ? ORDER BY producto', 
      [`%${descripcion}%`]
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByCodigoBarra(codbarra) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM producto WHERE codbarra = ?', [codbarra]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async findByCodaux(codaux) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM producto WHERE codaux = ?', [codaux]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  static async create(productoData) {
    // Validar campos requeridos
    if (!productoData.producto) {
      throw new Error('La descripción del producto es requerida');
    }

    // Generar código automático si no se proporciona
    if (!productoData.codigo) {
      const lastProduct = await window.electronAPI.dbGetSingle(
        'SELECT codigo FROM producto ORDER BY CAST(codigo AS INTEGER) DESC LIMIT 1'
      );
      const nextCode = lastProduct.success && lastProduct.data 
        ? (parseInt(lastProduct.data.codigo) + 1).toString()
        : '1';
      productoData.codigo = nextCode;
    }

    // Establecer valores por defecto
    const defaultValues = {
      codbarra: productoData.codbarra || '',
      almacen: productoData.almacen || 0,
      bodega1: productoData.bodega1 || 0,
      bodega2: productoData.bodega2 || 0,
      pcompra: productoData.pcompra || 0,
      pvp: productoData.pvp || 0,
      pmayorista: productoData.pmayorista || 0,
      foto: productoData.foto || '',
      maximo: productoData.maximo || 0,
      minimo: productoData.minimo || 0,
      peso: productoData.peso || 0,
      pconsignacion: productoData.pconsignacion || 0,
      procedencia: productoData.procedencia || '',
      grabaiva: productoData.grabaiva || '1',
      iva_percentage: productoData.iva_percentage || 12.0,
      codaux: productoData.codaux || '',
      descripcion: productoData.descripcion || '',
      sucursal: productoData.sucursal || 0,
      isservicio: productoData.isservicio || '0',
      deducible: productoData.deducible || 0
    };

    const query = `
      INSERT INTO producto (
        codigo, codbarra, producto, almacen, bodega1, bodega2, pcompra, pvp, 
        pmayorista, foto, maximo, minimo, peso, pconsignacion, procedencia, 
        grabaiva, iva_percentage, codaux, descripcion, sucursal, isservicio, deducible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      productoData.codigo,
      defaultValues.codbarra,
      productoData.producto,
      defaultValues.almacen,
      defaultValues.bodega1,
      defaultValues.bodega2,
      defaultValues.pcompra,
      defaultValues.pvp,
      defaultValues.pmayorista,
      defaultValues.foto,
      defaultValues.maximo,
      defaultValues.minimo,
      defaultValues.peso,
      defaultValues.pconsignacion,
      defaultValues.procedencia,
      defaultValues.grabaiva,
      defaultValues.iva_percentage,
      defaultValues.codaux,
      defaultValues.descripcion,
      defaultValues.sucursal,
      defaultValues.isservicio,
      defaultValues.deducible
    ];

    const result = await window.electronAPI.dbRun(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  static async update(codigo, productoData) {
    if (!productoData.producto) {
      throw new Error('La descripción del producto es requerida');
    }

    const query = `
      UPDATE producto SET 
        codbarra = ?, producto = ?, almacen = ?, bodega1 = ?, bodega2 = ?, 
        pcompra = ?, pvp = ?, pmayorista = ?, foto = ?, maximo = ?, 
        minimo = ?, peso = ?, pconsignacion = ?, procedencia = ?, 
        grabaiva = ?, iva_percentage = ?, codaux = ?, descripcion = ?, sucursal = ?, 
        isservicio = ?, deducible = ?
      WHERE codigo = ?
    `;

    const params = [
      productoData.codbarra || '',
      productoData.producto,
      productoData.almacen || 0,
      productoData.bodega1 || 0,
      productoData.bodega2 || 0,
      productoData.pcompra || 0,
      productoData.pvp || 0,
      productoData.pmayorista || 0,
      productoData.foto || '',
      productoData.maximo || 0,
      productoData.minimo || 0,
      productoData.peso || 0,
      productoData.pconsignacion || 0,
      productoData.procedencia || '',
      productoData.grabaiva || '1',
      productoData.iva_percentage || 12.0,
      productoData.codaux || '',
      productoData.descripcion || '',
      productoData.sucursal || 0,
      productoData.isservicio || '0',
      productoData.deducible || 0,
      codigo
    ];

    const result = await window.electronAPI.dbRun(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  static async delete(codigo) {
    const result = await window.electronAPI.dbRun('DELETE FROM producto WHERE codigo = ?', [codigo]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  static async search(searchTerm, searchType = 'producto', exactMatch = false) {
    let query;
    let params;

    switch (searchType) {
      case 'descripcion':
      case 'producto':
        if (exactMatch) {
          query = 'SELECT * FROM producto WHERE producto = ? ORDER BY producto';
          params = [searchTerm];
        } else {
          query = 'SELECT * FROM producto WHERE producto LIKE ? ORDER BY producto';
          params = [`%${searchTerm}%`];
        }
        break;
      case 'codigo':
        if (exactMatch) {
          query = 'SELECT * FROM producto WHERE codigo = ? ORDER BY producto';
          params = [searchTerm];
        } else {
          query = 'SELECT * FROM producto WHERE codigo LIKE ? ORDER BY producto';
          params = [`%${searchTerm}%`];
        }
        break;
      case 'codbarra':
        if (exactMatch) {
          query = 'SELECT * FROM producto WHERE codbarra = ? ORDER BY producto';
          params = [searchTerm];
        } else {
          query = 'SELECT * FROM producto WHERE codbarra LIKE ? ORDER BY producto';
          params = [`%${searchTerm}%`];
        }
        break;
      case 'codaux':
        if (exactMatch) {
          query = 'SELECT * FROM producto WHERE codaux = ? ORDER BY producto';
          params = [searchTerm];
        } else {
          query = 'SELECT * FROM producto WHERE codaux LIKE ? ORDER BY producto';
          params = [`%${searchTerm}%`];
        }
        break;
      case 'pvp':
        query = 'SELECT * FROM producto WHERE pvp = ? ORDER BY producto';
        params = [parseFloat(searchTerm) || 0];
        break;
      case 'pcompra':
        query = 'SELECT * FROM producto WHERE pcompra = ? ORDER BY producto';
        params = [parseFloat(searchTerm) || 0];
        break;
      case 'pmayorista':
        query = 'SELECT * FROM producto WHERE pmayorista = ? ORDER BY producto';
        params = [parseFloat(searchTerm) || 0];
        break;
      case 'procedencia':
        if (exactMatch) {
          query = 'SELECT * FROM producto WHERE procedencia = ? ORDER BY producto';
          params = [searchTerm];
        } else {
          query = 'SELECT * FROM producto WHERE procedencia LIKE ? ORDER BY producto';
          params = [`%${searchTerm}%`];
        }
        break;
      default:
        query = 'SELECT * FROM producto WHERE producto LIKE ? ORDER BY producto';
        params = [`%${searchTerm}%`];
    }

    const result = await window.electronAPI.dbQuery(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Método para calcular la utilidad
  static calculateUtility(pcompra, pvp) {
    if (!pcompra || pcompra === 0) return 0;
    return ((pvp - pcompra) / pcompra * 100).toFixed(2);
  }

  // Método para calcular PVP con IVA
  static calculatePVPWithIVA(pvp, grabaiva = '1', ivaPercentage = 12) {
    if (grabaiva === '1') {
      const ivaRate = 1 + (ivaPercentage / 100);
      return (pvp * ivaRate).toFixed(2);
    }
    return pvp;
  }

  // Marcar/desmarcar producto
  static async markProduct(codigo, marked = true) {
    const query = 'UPDATE producto SET trial279 = ? WHERE codigo = ?';
    const params = [marked ? 1 : 0, codigo];
    
    const result = await window.electronAPI.dbRun(query, params);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  // Obtener productos marcados
  static async getMarkedProducts() {
    const result = await window.electronAPI.dbQuery('SELECT * FROM producto WHERE trial279 = 1 ORDER BY producto');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Limpiar todas las marcas
  static async clearAllMarks() {
    const result = await window.electronAPI.dbRun('UPDATE producto SET trial279 = 0');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result;
  }

  // Top productos más vendidos (agrega cantidades de ventadet)
  // params: { desde?: 'YYYY-MM-DD', hasta?: 'YYYY-MM-DD', limit?: number }
  static async getTopVendidos(params = {}){
    const { desde, hasta, limit = 500 } = params;
    const where = [];
    const sqlParams = [];
    if(desde){ where.push('date(v.fecha) >= date(?)'); sqlParams.push(desde); }
    if(hasta){ where.push('date(v.fecha) <= date(?)'); sqlParams.push(hasta); }
    const whereSql = where.length? ('WHERE '+ where.join(' AND ')) : '';
    const sql = `SELECT d.codprod AS codigo, SUM(d.cantidad) AS cantidad,
      MAX(p.producto) AS descripcion,
      MAX(p.pvp) AS pvp
      FROM ventadet d
      LEFT JOIN venta v ON v.id = d.idventa
      LEFT JOIN producto p ON p.codigo = d.codprod
      ${whereSql}
      GROUP BY d.codprod
      ORDER BY SUM(d.cantidad) DESC, d.codprod ASC
      LIMIT ${parseInt(limit)||500}`;
    const result = await window.electronAPI.dbQuery(sql, sqlParams);
    if(!result.success){
      throw new Error(result.error);
    }
    return result.data || [];
  }

  // Obtener el primer registro por código
  static async getFirstRecord() {
    const result = await window.electronAPI.dbGetSingle(
      'SELECT * FROM producto ORDER BY CAST(codigo AS INTEGER) ASC LIMIT 1'
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Obtener el último registro por código
  static async getLastRecord() {
    const result = await window.electronAPI.dbGetSingle(
      'SELECT * FROM producto ORDER BY CAST(codigo AS INTEGER) DESC LIMIT 1'
    );
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }
}

export default Producto;
