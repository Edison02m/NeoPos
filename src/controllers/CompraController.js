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

  // Historial de compras (últimas N) con proveedor si la tabla proveedor existe
  async getHistorialCompras(limit = 200) {
    try {
      // Detectar si existe tabla proveedor para hacer join ligero
      let hasProv = false;
      try {
        const chk = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='proveedor'");
        hasProv = !!(chk?.success && chk.data?.name === 'proveedor');
      } catch(_){}
   // En la base existente la PK de proveedor es 'cod' (no 'id'), y compra.idprov almacena ese código.
   const baseQuery = hasProv
     ? `SELECT c.id, c.fecha, c.numfactura, c.total, c.subtotal, c.subtotal0, c.iva, c.idprov,
         p.empresa as proveedor_nombre, p.ruc as proveedor_ruc
       FROM compra c LEFT JOIN proveedor p ON p.cod = c.idprov
       ORDER BY c.fecha DESC, c.id DESC LIMIT ?`
     : `SELECT id, fecha, numfactura, total, subtotal, subtotal0, iva, idprov
       FROM compra ORDER BY fecha DESC, id DESC LIMIT ?`;
      const result = await window.electronAPI.dbQuery(baseQuery, [limit]);
      if(!result.success) throw new Error(result.error||'Error ejecutando consulta historial');
      return { success:true, data: result.data };
    } catch(error){
      return { success:false, message:'Error al obtener historial de compras', error: error.message };
    }
  }

  // Detalle de una compra: cabecera + líneas + imeis
  async getDetalleCompra(idcompra){
    try {
      const cab = await window.electronAPI.dbGetSingle('SELECT * FROM compra WHERE id = ?', [idcompra]);
      if(!cab.success) throw new Error(cab.error);
      // Detectar si compradet tiene columna descuento
      let selectDet = 'SELECT item, codprod, cantidad, precio, gravaiva';
      try {
        const pragma = await window.electronAPI.dbQuery('PRAGMA table_info(compradet)');
        if(pragma?.success){
          const cols = (pragma.data||[]).map(c=>c.name.toLowerCase());
            if(cols.includes('descuento')) selectDet += ', descuento';
        }
      } catch(_){ }
      selectDet += ' FROM compradet WHERE idcompra = ? ORDER BY item';
      const det = await window.electronAPI.dbQuery(selectDet, [idcompra]);
      if(!det.success) throw new Error(det.error);
      // IMEIs opcional (puede no existir la tabla)
      let imeisMap = {};
      try {
        const exists = await window.electronAPI.dbGetSingle("SELECT name FROM sqlite_master WHERE type='table' AND name='compraimei'");
        if(exists?.success && exists.data?.name === 'compraimei'){
          // Detectar columnas reales de compraimei
          const pragma = await window.electronAPI.dbQuery('PRAGMA table_info(compraimei)');
          if(pragma?.success){
            const cols = (pragma.data||[]).map(c=>c.name.toLowerCase());
            // Posibles nombres alternos
            const colProd = cols.includes('codprod') ? 'codprod' : (cols.includes('codigo') ? 'codigo' : (cols.includes('producto') ? 'producto' : null));
            const colImei = cols.includes('imei') ? 'imei' : null;
            const colIdCompra = cols.includes('idcompra') ? 'idcompra' : (cols.includes('compra') ? 'compra' : null);
            if(colProd && colImei && colIdCompra){
              const sql = `SELECT ${colProd} as codprod, ${colImei} as imei FROM compraimei WHERE ${colIdCompra} = ?`;
              const imeis = await window.electronAPI.dbQuery(sql, [idcompra]);
              if(imeis.success){
                imeis.data.forEach(r=> { if(!imeisMap[r.codprod]) imeisMap[r.codprod]=[]; imeisMap[r.codprod].push(r.imei); });
              }
            } else {
              console.warn('Tabla compraimei sin columnas esperadas (codprod/imei/idcompra). PRAGMA:', pragma.data);
            }
          }
        }
      } catch(err){ console.warn('Error leyendo IMEIs compra', err); }
      return { success:true, data:{ cabecera: cab.data, detalles: det.data, imeis: imeisMap } };
    } catch(error){
      return { success:false, message:'Error obteniendo detalle de compra', error:error.message };
    }
  }

  // Productos comprados a un proveedor (agrupado)
  async getProductosCompradosProveedor(idprov, limit=200){
    try {
      const q = `SELECT d.codprod, pr.descripcion, SUM(d.cantidad) as cantidad_total, 
                        AVG(d.precio) as precio_promedio, SUM(d.cantidad*d.precio) as monto_total
                   FROM compradet d
                   JOIN compra c ON c.id = d.idcompra
                   LEFT JOIN producto pr ON pr.codigo = d.codprod
                  WHERE c.idprov = ?
                  GROUP BY d.codprod, pr.descripcion
                  ORDER BY monto_total DESC
                  LIMIT ?`;
      const result = await window.electronAPI.dbQuery(q, [idprov, limit]);
      if(!result.success) throw new Error(result.error);
      return { success:true, data: result.data };
    } catch(error){
      return { success:false, message:'Error obteniendo productos del proveedor', error:error.message };
    }
  }
}

export default CompraController;
