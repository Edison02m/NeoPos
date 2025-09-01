const Inventario = require('../models/Inventario');

class InventarioController {
  constructor() {
    this.initializeModel();
  }

  async initializeModel() {
    try {
      await Inventario.initializeDB();
    } catch (error) {
      console.error('Error al inicializar modelo de inventario:', error);
    }
  }

  async getInventarioCompleto() {
    try {
      const inventario = await Inventario.getInventario();
      const totales = await Inventario.getTotalInventario();
      
      return {
        success: true,
        data: {
          productos: inventario,
          totales: totales
        },
        message: 'Inventario obtenido exitosamente'
      };
    } catch (error) {
      console.error('Error al obtener inventario completo:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener inventario: ' + error.message
      };
    }
  }

  async buscarEnInventario(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getInventarioCompleto();
      }

      const productos = await Inventario.searchInventario(searchTerm.trim());
      
      // Calcular totales para los productos filtrados
      const totalProductos = productos.length;
      const totalExistencias = productos.reduce((sum, item) => sum + item.existencia, 0);
      const totalInvertido = productos.reduce((sum, item) => sum + item.precio_total, 0);
      
      const totales = {
        total_productos: totalProductos,
        total_existencias: totalExistencias,
        total_invertido: Math.round(totalInvertido * 100) / 100
      };

      return {
        success: true,
        data: {
          productos: productos,
          totales: totales
        },
        message: `Se encontraron ${productos.length} productos en inventario`
      };
    } catch (error) {
      console.error('Error al buscar en inventario:', error);
      return {
        success: false,
        data: null,
        message: 'Error al buscar en inventario: ' + error.message
      };
    }
  }

  async getStockBajo(minimo = 5) {
    try {
      const productos = await Inventario.getStockBajo(minimo);
      
      // Calcular totales para productos con stock bajo
      const totalProductos = productos.length;
      const totalExistencias = productos.reduce((sum, item) => sum + item.existencia, 0);
      const totalInvertido = productos.reduce((sum, item) => sum + item.precio_total, 0);
      
      const totales = {
        total_productos: totalProductos,
        total_existencias: totalExistencias,
        total_invertido: Math.round(totalInvertido * 100) / 100
      };

      return {
        success: true,
        data: {
          productos: productos,
          totales: totales
        },
        message: `Se encontraron ${productos.length} productos con stock bajo (≤${minimo})`
      };
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener productos con stock bajo: ' + error.message
      };
    }
  }

  async getInventarioPorRangoPrecio(precioMin, precioMax) {
    try {
      const min = parseFloat(precioMin) || 0;
      const max = parseFloat(precioMax) || 999999;
      
      if (min < 0 || max < 0 || min > max) {
        return {
          success: false,
          data: null,
          message: 'Rango de precios inválido'
        };
      }

      const productos = await Inventario.getInventarioPorRangoPrecio(min, max);
      
      // Calcular totales para el rango de precios
      const totalProductos = productos.length;
      const totalExistencias = productos.reduce((sum, item) => sum + item.existencia, 0);
      const totalInvertido = productos.reduce((sum, item) => sum + item.precio_total, 0);
      
      const totales = {
        total_productos: totalProductos,
        total_existencias: totalExistencias,
        total_invertido: Math.round(totalInvertido * 100) / 100
      };

      return {
        success: true,
        data: {
          productos: productos,
          totales: totales
        },
        message: `Inventario filtrado por rango de precios $${min} - $${max}`
      };
    } catch (error) {
      console.error('Error al obtener inventario por rango de precio:', error);
      return {
        success: false,
        data: null,
        message: 'Error al filtrar inventario por precio: ' + error.message
      };
    }
  }

  async generarReporteInventario() {
    try {
      const inventario = await Inventario.getInventario();
      const totales = await Inventario.getTotalInventario();
      
      // Preparar datos para el reporte
      const reporteData = {
        titulo: 'Inventario de Existencias',
        fecha: new Date().toLocaleDateString('es-EC'),
        productos: inventario.map(item => ({
          codigo: item.codigo,
          producto: item.producto,
          existencia: item.existencia,
          precio_unitario: item.precio_unitario,
          precio_total: item.precio_total
        })),
        totales: totales
      };

      return {
        success: true,
        data: reporteData,
        message: 'Reporte de inventario generado exitosamente'
      };
    } catch (error) {
      console.error('Error al generar reporte de inventario:', error);
      return {
        success: false,
        data: null,
        message: 'Error al generar reporte: ' + error.message
      };
    }
  }

  // Validar parámetros de entrada
  validateSearchParams(searchTerm) {
    if (typeof searchTerm !== 'string') {
      return {
        isValid: false,
        message: 'El término de búsqueda debe ser una cadena de texto'
      };
    }

    if (searchTerm.length > 100) {
      return {
        isValid: false,
        message: 'El término de búsqueda es demasiado largo'
      };
    }

    return {
      isValid: true,
      message: 'Parámetros válidos'
    };
  }

  validatePriceRange(precioMin, precioMax) {
    const min = parseFloat(precioMin);
    const max = parseFloat(precioMax);

    if (isNaN(min) || isNaN(max)) {
      return {
        isValid: false,
        message: 'Los precios deben ser números válidos'
      };
    }

    if (min < 0 || max < 0) {
      return {
        isValid: false,
        message: 'Los precios no pueden ser negativos'
      };
    }

    if (min > max) {
      return {
        isValid: false,
        message: 'El precio mínimo no puede ser mayor al precio máximo'
      };
    }

    return {
      isValid: true,
      message: 'Rango de precios válido'
    };
  }
}

module.exports = InventarioController;
