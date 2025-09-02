const DatabaseController = require('./DatabaseController');

class VentaController {
  constructor() {
    this.dbController = new DatabaseController();
  }

  // Crear nueva venta
  async crearVenta(ventaData, items) {
    try {
      const db = await this.dbController.getDatabase();
      
      // Iniciar transacción
      await db.run('BEGIN TRANSACTION');
      
      try {
        // Insertar venta
        const ventaResult = await db.run(`
          INSERT INTO ventas (
            numero_comprobante, tipo_comprobante, fecha,
            cliente_nombres, cliente_apellidos, cliente_ruc_ci,
            cliente_telefono, cliente_direccion,
            subtotal, descuento, iva, total, estado, observaciones
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ventaData.numero_comprobante,
          ventaData.tipo_comprobante,
          ventaData.fecha,
          ventaData.cliente_nombres,
          ventaData.cliente_apellidos,
          ventaData.cliente_ruc_ci,
          ventaData.cliente_telefono,
          ventaData.cliente_direccion,
          ventaData.subtotal,
          ventaData.descuento,
          ventaData.iva,
          ventaData.total,
          ventaData.estado || 'completada',
          ventaData.observaciones
        ]);

        const ventaId = ventaResult.lastID;

        // Insertar items de venta
        for (const item of items) {
          await db.run(`
            INSERT INTO venta_items (
              venta_id, producto_id, codigo_barras, descripcion,
              cantidad, precio_unitario, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            ventaId,
            item.producto_id,
            item.codigo_barras,
            item.descripcion,
            item.cantidad,
            item.precio_unitario,
            item.subtotal
          ]);

          // Actualizar stock del producto
          await db.run(`
            UPDATE producto 
            SET almacen = almacen - ? 
            WHERE id = ?
          `, [item.cantidad, item.producto_id]);
        }

        await db.run('COMMIT');
        
        return {
          success: true,
          data: { id: ventaId, ...ventaData },
          message: 'Venta registrada exitosamente'
        };

      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error al crear venta:', error);
      return {
        success: false,
        data: null,
        message: 'Error al registrar la venta: ' + error.message
      };
    }
  }

  // Buscar producto por código de barras o descripción
  async buscarProducto(termino) {
    try {
      const db = await this.dbController.getDatabase();
      
      const query = `
        SELECT 
          id,
          codbarra as codigo_barras,
          codaux as codigo_auxiliar,
          producto as descripcion,
          pvp as precio_unitario,
          almacen as stock
        FROM producto 
        WHERE 
          codbarra LIKE ? OR 
          codaux LIKE ? OR 
          producto LIKE ?
        AND almacen > 0
        ORDER BY producto ASC
        LIMIT 20
      `;

      const searchTerm = `%${termino}%`;
      const result = await db.all(query, [searchTerm, searchTerm, searchTerm]);

      return {
        success: true,
        data: result,
        message: `Se encontraron ${result.length} productos`
      };

    } catch (error) {
      console.error('Error al buscar producto:', error);
      return {
        success: false,
        data: [],
        message: 'Error al buscar producto: ' + error.message
      };
    }
  }

  // Obtener último número de comprobante
  async obtenerUltimoNumeroComprobante(tipo = 'nota') {
    try {
      const db = await this.dbController.getDatabase();
      
      const tipoComprobante = tipo === 'factura' ? 'Factura' : 'Nota de venta';
      
      const result = await db.get(`
        SELECT numero_comprobante 
        FROM ventas 
        WHERE tipo_comprobante = ?
        ORDER BY id DESC 
        LIMIT 1
      `, [tipoComprobante]);

      if (result) {
        // Extraer el número secuencial y incrementarlo
        const partes = result.numero_comprobante.split('-');
        if (partes.length === 3) {
          const secuencial = parseInt(partes[2]) + 1;
          const nuevoNumero = `${partes[0]}-${partes[1]}-${secuencial.toString().padStart(5, '0')}`;
          return nuevoNumero;
        }
      }

      // Si no hay registros, empezar desde el primer número
      return tipo === 'factura' ? '002-001-00001' : '001-001-00001';

    } catch (error) {
      console.error('Error al obtener último número de comprobante:', error);
      // Fallback a número generado automáticamente
      const timestamp = Date.now().toString().slice(-5);
      return tipo === 'factura' ? `002-001-${timestamp}` : `001-001-${timestamp}`;
    }
  }

  // Obtener todas las ventas
  async obtenerVentas(limite = 50) {
    try {
      const db = await this.dbController.getDatabase();
      
      const result = await db.all(`
        SELECT 
          id,
          numero_comprobante,
          tipo_comprobante,
          fecha,
          cliente_nombres,
          cliente_apellidos,
          cliente_ruc_ci,
          total,
          estado
        FROM ventas 
        ORDER BY fecha DESC, id DESC
        LIMIT ?
      `, [limite]);

      return {
        success: true,
        data: result,
        message: `Se encontraron ${result.length} ventas`
      };

    } catch (error) {
      console.error('Error al obtener ventas:', error);
      return {
        success: false,
        data: [],
        message: 'Error al obtener ventas: ' + error.message
      };
    }
  }

  // Obtener venta por ID con items
  async obtenerVentaPorId(id) {
    try {
      const db = await this.dbController.getDatabase();
      
      // Obtener datos de la venta
      const venta = await db.get(`
        SELECT * FROM ventas WHERE id = ?
      `, [id]);

      if (!venta) {
        return {
          success: false,
          data: null,
          message: 'Venta no encontrada'
        };
      }

      // Obtener items de la venta
      const items = await db.all(`
        SELECT * FROM venta_items WHERE venta_id = ?
      `, [id]);

      return {
        success: true,
        data: {
          ...venta,
          items
        },
        message: 'Venta encontrada'
      };

    } catch (error) {
      console.error('Error al obtener venta por ID:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener venta: ' + error.message
      };
    }
  }

  // Buscar cliente por RUC/CI
  async buscarClientePorRuc(ruc) {
    try {
      const db = await this.dbController.getDatabase();
      
      const result = await db.get(`
        SELECT 
          nombres,
          apellidos,
          ruc_ci,
          telefono,
          direccion
        FROM clientes 
        WHERE ruc_ci = ?
      `, [ruc]);

      return {
        success: true,
        data: result,
        message: result ? 'Cliente encontrado' : 'Cliente no encontrado'
      };

    } catch (error) {
      console.error('Error al buscar cliente:', error);
      return {
        success: false,
        data: null,
        message: 'Error al buscar cliente: ' + error.message
      };
    }
  }
}

module.exports = VentaController;
