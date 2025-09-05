import Compra from '../models/Compra';

class CompraController {
  constructor() {
    // El controlador usa el modelo directamente
  }

  // Obtener todas las compras
  async getAllCompras() {
    try {
      const compras = await Compra.getAll();
      return {
        success: true,
        data: compras
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener compras',
        error: error.message
      };
    }
  }

  // Obtener compra por ID
  async getCompraById(id) {
    try {
      const compra = await Compra.getById(id);
      return {
        success: true,
        data: compra,
        message: compra ? null : 'Compra no encontrada'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener compra',
        error: error.message
      };
    }
  }

  // Guardar compra (crear o actualizar)
  async saveCompra(compraData) {
    try {
      const compra = new Compra(compraData);
      await compra.save();
      return {
        success: true,
        message: compra.id ? 'Compra actualizada correctamente' : 'Compra creada correctamente',
        data: compra
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al guardar compra',
        error: error.message
      };
    }
  }

  // Eliminar compra
  async deleteCompra(id) {
    try {
      await Compra.delete(id);
      return {
        success: true,
        message: 'Compra eliminada correctamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar compra',
        error: error.message
      };
    }
  }

  // Buscar compras por proveedor
  async getComprasByProveedor(idprov) {
    try {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM compra WHERE idprov = ? ORDER BY fecha DESC',
        [idprov]
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const compras = result.data.map(item => Compra.fromDatabase(item));
      return {
        success: true,
        data: compras
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar compras por proveedor',
        error: error.message
      };
    }
  }

  // Buscar compras por fecha
  async getComprasByFecha(fechaInicio, fechaFin) {
    try {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM compra WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC',
        [fechaInicio, fechaFin]
      );
      
      if (!result.success) {
        throw new Error(result.error);
      }

      const compras = result.data.map(item => Compra.fromDatabase(item));
      return {
        success: true,
        data: compras
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar compras por fecha',
        error: error.message
      };
    }
  }

  // Obtener resumen de compras
  async getResumenCompras() {
    try {
      const result = await window.electronAPI.dbGetSingle(`
        SELECT 
          COUNT(*) as total_compras,
          SUM(total) as total_monto,
          AVG(total) as promedio_compra,
          MAX(fecha) as ultima_compra
        FROM compra
      `);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener resumen de compras',
        error: error.message
      };
    }
  }
}

export default CompraController;
