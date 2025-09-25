import Producto from '../models/Producto';

class ProductoController {
  constructor() {
    // El controlador usa el modelo Producto directamente
  }

  // Obtener todos los productos
  async getAllProductos() {
    try {
      const productos = await Producto.findAll();
      return {
        success: true,
        data: productos || [],
        message: productos && productos.length > 0 ? null : 'No hay productos registrados'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      };
    }
  }

  // Obtener producto por código
  async getProductoByCodigo(codigo) {
    try {
      const producto = await Producto.findById(codigo);
      return {
        success: true,
        data: producto,
        message: producto ? null : 'Producto no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      };
    }
  }

  // Buscar producto por descripción
  async getProductoByDescription(descripcion) {
    try {
      const productos = await Producto.findByDescription(descripcion);
      return {
        success: true,
        data: productos,
        message: productos && productos.length > 0 ? null : 'No se encontraron productos'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar productos',
        error: error.message
      };
    }
  }

  // Buscar producto por código de barras
  async getProductoByCodigoBarra(codbarra) {
    try {
      const producto = await Producto.findByCodigoBarra(codbarra);
      return {
        success: true,
        data: producto,
        message: producto ? null : 'Producto no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar producto por código de barras',
        error: error.message
      };
    }
  }

  // Buscar producto por código auxiliar
  async getProductoByCodaux(codaux) {
    try {
      const producto = await Producto.findByCodaux(codaux);
      return {
        success: true,
        data: producto,
        message: producto ? null : 'Producto no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar producto por código auxiliar',
        error: error.message
      };
    }
  }

  // Crear nuevo producto
  async createProducto(productoData) {
    try {
      // Validar datos requeridos
      if (!productoData.producto || productoData.producto.trim() === '') {
        return {
          success: false,
          message: 'La descripción del producto es requerida'
        };
      }

      // Verificar si ya existe un producto con el mismo código de barras (si se proporciona)
      if (productoData.codbarra && productoData.codbarra.trim() !== '') {
        const existingProduct = await Producto.findByCodigoBarra(productoData.codbarra);
        if (existingProduct) {
          return {
            success: false,
            message: 'Ya existe un producto con este código de barras'
          };
        }
      }

      // Verificar si ya existe un producto con el mismo código auxiliar (si se proporciona)
      if (productoData.codaux && productoData.codaux.trim() !== '') {
        const existingProduct = await Producto.findByCodaux(productoData.codaux);
        if (existingProduct) {
          return {
            success: false,
            message: 'Ya existe un producto con este código auxiliar'
          };
        }
      }

      const result = await Producto.create(productoData);
      return {
        success: true,
        data: result,
        message: 'Producto creado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear producto',
        error: error.message
      };
    }
  }

  // Actualizar producto
  async updateProducto(codigo, productoData) {
    try {
      if (!productoData.producto || productoData.producto.trim() === '') {
        return {
          success: false,
          message: 'La descripción del producto es requerida'
        };
      }

      // Verificar si el producto existe
      const existingProduct = await Producto.findById(codigo);
      if (!existingProduct) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      // Verificar códigos únicos (excluyendo el producto actual)
      if (productoData.codbarra && productoData.codbarra.trim() !== '') {
        const productWithSameBarcode = await Producto.findByCodigoBarra(productoData.codbarra);
        if (productWithSameBarcode && productWithSameBarcode.codigo !== codigo) {
          return {
            success: false,
            message: 'Ya existe otro producto con este código de barras'
          };
        }
      }

      if (productoData.codaux && productoData.codaux.trim() !== '') {
        const productWithSameCodaux = await Producto.findByCodaux(productoData.codaux);
        if (productWithSameCodaux && productWithSameCodaux.codigo !== codigo) {
          return {
            success: false,
            message: 'Ya existe otro producto con este código auxiliar'
          };
        }
      }

      const result = await Producto.update(codigo, productoData);
      return {
        success: true,
        data: result,
        message: 'Producto actualizado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      };
    }
  }

  // Eliminar producto
  async deleteProducto(codigo) {
    try {
      const existingProduct = await Producto.findById(codigo);
      if (!existingProduct) {
        return {
          success: false,
          message: 'Producto no encontrado'
        };
      }

      const result = await Producto.delete(codigo);
      return {
        success: true,
        data: result,
        message: 'Producto eliminado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      };
    }
  }

  // Buscar productos
  async searchProductos(searchTerm, searchType = 'producto') {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return this.getAllProductos();
      }

      const productos = await Producto.search(searchTerm.trim(), searchType);
      return {
        success: true,
        data: productos || [],
        message: productos && productos.length > 0 ? null : 'No se encontraron productos'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar productos',
        error: error.message
      };
    }
  }

  // Filtrar productos con condición exacta
  async filterProductos(filterType, filterValue, exactMatch = false) {
    try {
      let productos;
      
      // Usar el método search del modelo con el parámetro exactMatch
      productos = await Producto.search(filterValue, filterType, exactMatch);

      return {
        success: true,
        data: productos || [],
        message: productos && productos.length > 0 ? null : 'No se encontraron productos con ese filtro'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al filtrar productos',
        error: error.message
      };
    }
  }

  // Validar datos del producto
  validateProductoData(productoData) {
    const errors = [];

    if (!productoData.producto || productoData.producto.trim() === '') {
      errors.push('La descripción del producto es requerida');
    }

    if (productoData.pcompra && isNaN(parseFloat(productoData.pcompra))) {
      errors.push('El precio de compra debe ser un número válido');
    }

    if (productoData.pvp && isNaN(parseFloat(productoData.pvp))) {
      errors.push('El precio de venta debe ser un número válido');
    }

    if (productoData.pmayorista && isNaN(parseFloat(productoData.pmayorista))) {
      errors.push('El precio mayorista debe ser un número válido');
    }

    if (productoData.almacen && isNaN(parseInt(productoData.almacen))) {
      errors.push('La existencia en almacén debe ser un número válido');
    }

    if (productoData.maximo && isNaN(parseInt(productoData.maximo))) {
      errors.push('El stock máximo debe ser un número válido');
    }

    if (productoData.minimo && isNaN(parseInt(productoData.minimo))) {
      errors.push('El stock mínimo debe ser un número válido');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Calcular utilidad del producto
  calculateUtility(pcompra, pvp) {
    return Producto.calculateUtility(pcompra, pvp);
  }

  // Calcular PVP con IVA
  calculatePVPWithIVA(pvp, grabaiva = '1') {
    return Producto.calculatePVPWithIVA(pvp, grabaiva);
  }

  // Marcar/desmarcar producto
  async markProduct(codigo, marked = true) {
    try {
      const result = await Producto.markProduct(codigo, marked);
      return {
        success: true,
        data: result,
        message: marked ? 'Producto marcado exitosamente' : 'Producto desmarcado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: marked ? 'Error al marcar producto' : 'Error al desmarcar producto',
        error: error.message
      };
    }
  }

  // Obtener productos marcados
  async getMarkedProducts() {
    try {
      const productos = await Producto.getMarkedProducts();
      return {
        success: true,
        data: productos || [],
        message: productos && productos.length > 0 ? null : 'No hay productos marcados'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener productos marcados',
        error: error.message
      };
    }
  }

  // Limpiar todas las marcas
  async clearAllMarks() {
    try {
      const result = await Producto.clearAllMarks();
      return {
        success: true,
        data: result,
        message: 'Todas las marcas han sido eliminadas'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al limpiar marcas',
        error: error.message
      };
    }
  }

  // Obtener ranking de productos más vendidos
  async getTopVendidos({ desde = null, hasta = null, limit = 500 } = {}) {
    try {
      const data = await Producto.getTopVendidos({ desde, hasta, limit });
      return { success:true, data, message: data.length? null : 'No hay ventas en el rango' };
    } catch(error){
      return { success:false, message:'Error al obtener ranking', error:error.message };
    }
  }
}

export default ProductoController;
