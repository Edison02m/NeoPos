// Servicio para centralizar numeración de comprobantes (notas y facturas)
// Tabla esperada: comprobante(comprobante TEXT PRIMARY KEY?, prefijo1 TEXT, prefijo2 TEXT, contador INTEGER, codempresa INTEGER, trial275 TEXT)
// Asume que 'comprobante' usa siglas: 'N' para nota de venta, 'F' para factura.
// Secuencia: prefijo1-prefijo2-<contador formateado>

const DatabaseController = require('./DatabaseController');

class ComprobanteService {
  constructor() {
    this.dbController = new DatabaseController();
  }

  async _ensureRow(sigla, codempresa = 1) {
    const db = await this.dbController.getDatabase();
    const row = await db.get('SELECT * FROM comprobante WHERE comprobante = ? AND codempresa = ?', [sigla, codempresa]);
    if (row) return row;
    // Crear fila por defecto
    const defaults = {
      N: { prefijo1: '001', prefijo2: '001' },
      F: { prefijo1: '002', prefijo2: '001' },
      DN: { prefijo1: '003', prefijo2: '001' } // Devolución de Nota (ajustar prefijos según necesidad)
    };
    const { prefijo1, prefijo2 } = defaults[sigla] || { prefijo1: '001', prefijo2: '001' };
    await db.run('INSERT INTO comprobante (comprobante, prefijo1, prefijo2, contador, codempresa, trial275) VALUES (?, ?, ?, ?, ?, ?)', [sigla, prefijo1, prefijo2, 0, codempresa, '0']);
    return await db.get('SELECT * FROM comprobante WHERE comprobante = ? AND codempresa = ?', [sigla, codempresa]);
  }

  _formatearNumero(row) {
    const sec = String(row.contador + 1).padStart(6, '0');
    return `${row.prefijo1}-${row.prefijo2}-${sec}`;
  }

  async obtenerSiguiente(sigla, codempresa = 1) {
    const db = await this.dbController.getDatabase();
    // Bloque simple (SQLite no soporta SELECT ... FOR UPDATE, usamos transacción manual)
    await db.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      let row = await this._ensureRow(sigla, codempresa);
      const numero = this._formatearNumero(row);
      const nuevoCont = row.contador + 1;
      await db.run('UPDATE comprobante SET contador = ? WHERE comprobante = ? AND codempresa = ?', [nuevoCont, sigla, codempresa]);
      await db.run('COMMIT');
      return { success: true, data: { numero, sigla, contador: nuevoCont, prefijo1: row.prefijo1, prefijo2: row.prefijo2 } };
    } catch (e) {
      await db.run('ROLLBACK');
      return { success: false, error: e.message };
    }
  }

  async preview(sigla, codempresa = 1) {
    try {
      const row = await this._ensureRow(sigla, codempresa);
      return { success: true, data: { siguiente: this._formatearNumero(row), actualContador: row.contador } };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Listar todos los comprobantes configurados para una empresa
  async listar(codempresa = 1) {
    try {
      const db = await this.dbController.getDatabase();
      const rows = await db.all('SELECT comprobante as sigla, prefijo1, prefijo2, contador FROM comprobante WHERE codempresa = ? ORDER BY comprobante', [codempresa]);
      // Asegurar que existan los básicos (N, F) aunque no estén todavía
      const siglasBasicas = ['N', 'F'];
      for (const sigla of siglasBasicas) {
        if (!rows.find(r => r.sigla === sigla)) {
          await this._ensureRow(sigla, codempresa);
        }
      }
      const finalRows = await db.all('SELECT comprobante as sigla, prefijo1, prefijo2, contador FROM comprobante WHERE codempresa = ? ORDER BY comprobante', [codempresa]);
      return { success: true, data: finalRows };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Actualizar prefijos de un comprobante (no toca contador)
  async actualizarPrefijos(sigla, prefijo1, prefijo2, codempresa = 1) {
    try {
      if (!/^\d{3}$/.test(prefijo1) || !/^\d{3}$/.test(prefijo2)) {
        throw new Error('Prefijos deben ser de 3 dígitos');
      }
      const db = await this.dbController.getDatabase();
      await this._ensureRow(sigla, codempresa);
      await db.run('UPDATE comprobante SET prefijo1 = ?, prefijo2 = ? WHERE comprobante = ? AND codempresa = ?', [prefijo1, prefijo2, sigla, codempresa]);
      const row = await db.get('SELECT comprobante as sigla, prefijo1, prefijo2, contador FROM comprobante WHERE comprobante = ? AND codempresa = ?', [sigla, codempresa]);
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Actualizar contador (ej: reset o ajuste). Se guarda valor explícito (no +1).
  async actualizarContador(sigla, nuevoContador, codempresa = 1) {
    try {
      if (!Number.isInteger(nuevoContador) || nuevoContador < 0) {
        throw new Error('Contador inválido');
      }
      const db = await this.dbController.getDatabase();
      await this._ensureRow(sigla, codempresa);
      await db.run('UPDATE comprobante SET contador = ? WHERE comprobante = ? AND codempresa = ?', [nuevoContador, sigla, codempresa]);
      const row = await db.get('SELECT comprobante as sigla, prefijo1, prefijo2, contador FROM comprobante WHERE comprobante = ? AND codempresa = ?', [sigla, codempresa]);
      return { success: true, data: row };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = ComprobanteService;
