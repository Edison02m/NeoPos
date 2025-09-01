class Inventario {
  constructor(data = {}) {
    this.codigo = data.codigo || '';
    this.producto = data.producto || '';
    this.existencia = data.existencia || 0;
    this.precio_unitario = data.precio_unitario || 0;
    this.precio_total = data.precio_total || 0;
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
  }

  // Obtener inventario completo con cálculo de valores
  static async getInventario() {
    const sql = `
      SELECT 
        codigo,
        producto as producto,
        almacen as existencia,
        pvp as precio_unitario,
        ROUND(almacen * pvp, 2) as precio_total
      FROM producto 
      WHERE almacen > 0
      ORDER BY producto ASC
    `;
    
    try {
      const result = await window.electronAPI.dbQuery(sql);
      if (result.success) {
        return result.data.map(row => new Inventario(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener inventario:', error);
      throw error;
    }
  }

  // Obtener total del inventario
  static async getTotalInventario() {
    const sql = `
      SELECT 
        COUNT(*) as total_productos,
        SUM(almacen) as total_existencias,
        ROUND(SUM(almacen * pvp), 2) as total_invertido
      FROM producto 
      WHERE almacen > 0
    `;
    
    try {
      const result = await window.electronAPI.dbGetSingle(sql);
      if (result.success) {
        return result.data || {
          total_productos: 0,
          total_existencias: 0,
          total_invertido: 0
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener total del inventario:', error);
      throw error;
    }
  }

  // Buscar productos en inventario
  static async searchInventario(searchTerm) {
    const sql = `
      SELECT 
        codigo,
        producto as producto,
        almacen as existencia,
        pvp as precio_unitario,
        ROUND(almacen * pvp, 2) as precio_total
      FROM producto 
      WHERE almacen > 0 
        AND (codigo LIKE ? OR producto LIKE ?)
      ORDER BY producto ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    
    try {
      const result = await window.electronAPI.dbQuery(sql, [searchPattern, searchPattern]);
      if (result.success) {
        return result.data.map(row => new Inventario(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al buscar en inventario:', error);
      throw error;
    }
  }

  // Obtener productos con stock bajo
  static async getStockBajo(minimo = 5) {
    const sql = `
      SELECT 
        codigo,
        producto as producto,
        almacen as existencia,
        pvp as precio_unitario,
        ROUND(almacen * pvp, 2) as precio_total
      FROM producto 
      WHERE almacen <= ? AND almacen > 0
      ORDER BY almacen ASC, producto ASC
    `;
    
    try {
      const result = await window.electronAPI.dbQuery(sql, [minimo]);
      if (result.success) {
        return result.data.map(row => new Inventario(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      throw error;
    }
  }

  // Obtener inventario filtrado por rango de precios
  static async getInventarioPorRangoPrecio(precioMin = 0, precioMax = 999999) {
    const sql = `
      SELECT 
        codigo,
        producto as producto,
        almacen as existencia,
        pvp as precio_unitario,
        ROUND(almacen * pvp, 2) as precio_total
      FROM producto 
      WHERE almacen > 0 
        AND pvp >= ? 
        AND pvp <= ?
      ORDER BY pvp DESC, producto ASC
    `;
    
    try {
      const result = await window.electronAPI.dbQuery(sql, [precioMin, precioMax]);
      if (result.success) {
        return result.data.map(row => new Inventario(row));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al obtener inventario por rango de precio:', error);
      throw error;
    }
  }

  // Formatear valores para mostrar
  formatPrecio() {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(this.precio_unitario);
  }

  formatPrecioTotal() {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(this.precio_total);
  }

  // Convertir a objeto plano
  toJSON() {
    return {
      codigo: this.codigo,
      producto: this.producto,
      existencia: this.existencia,
      precio_unitario: this.precio_unitario,
      precio_total: this.precio_total
    };
  }
}

module.exports = Inventario;
