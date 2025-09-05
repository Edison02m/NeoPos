class Compra {
  constructor(data = {}) {
    this.id = data.id || '';
    this.idprov = data.idprov || '';
    this.fecha = data.fecha || new Date().toISOString().split('T')[0];
    this.subtotal = data.subtotal || 0;
    this.descuento = data.descuento || 0;
    this.total = data.total || 0;
    this.fpago = data.fpago || 0;
    this.codempresa = data.codempresa || 1;
    this.iva = data.iva || 0;
    this.descripcion = data.descripcion || '';
    this.numfactura = data.numfactura || '';
    this.autorizacion = data.autorizacion || '';
    this.subtotal0 = data.subtotal0 || 0;
    this.credito = data.credito || '';
    this.anticipada = data.anticipada || '';
    this.pagado = data.pagado || '';
    this.plazodias = data.plazodias || 0;
    this.tipo = data.tipo || '';
    this.sustento = data.sustento || '';
    this.trial272 = data.trial272 || '';
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

  // Validar datos de la compra
  validate() {
    const errors = [];

    if (!this.idprov || this.idprov.trim() === '') {
      errors.push('El proveedor es requerido');
    }

    if (!this.fecha || this.fecha.trim() === '') {
      errors.push('La fecha es requerida');
    }

    if (this.total <= 0) {
      errors.push('El total debe ser mayor a 0');
    }

    if (!this.numfactura || this.numfactura.trim() === '') {
      errors.push('El número de factura es requerido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Convertir a objeto plano para la base de datos
  toDatabase() {
    return {
      id: this.id,
      idprov: this.idprov,
      fecha: this.fecha,
      subtotal: this.subtotal,
      descuento: this.descuento,
      total: this.total,
      fpago: this.fpago,
      codempresa: this.codempresa,
      iva: this.iva,
      descripcion: this.descripcion,
      numfactura: this.numfactura,
      autorizacion: this.autorizacion,
      subtotal0: this.subtotal0,
      credito: this.credito,
      anticipada: this.anticipada,
      pagado: this.pagado,
      plazodias: this.plazodias,
      tipo: this.tipo,
      sustento: this.sustento,
      trial272: this.trial272
    };
  }

  // Crear desde datos de la base de datos
  static fromDatabase(data) {
    return new Compra(data);
  }

  // Obtener todas las compras
  static async getAll() {
    const result = await window.electronAPI.dbQuery('SELECT * FROM compra ORDER BY fecha DESC, id DESC');
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data.map(item => this.fromDatabase(item));
  }

  // Obtener compra por ID
  static async getById(id) {
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM compra WHERE id = ?', [id]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data ? this.fromDatabase(result.data) : null;
  }

  // Guardar compra
  async save() {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const dbData = this.toDatabase();

    if (this.id) {
      // Actualizar compra existente
      const updateQuery = `
        UPDATE compra SET 
          idprov = ?, fecha = ?, subtotal = ?, descuento = ?, total = ?,
          fpago = ?, codempresa = ?, iva = ?, descripcion = ?, numfactura = ?,
          autorizacion = ?, subtotal0 = ?, credito = ?, anticipada = ?, pagado = ?,
          plazodias = ?, tipo = ?, sustento = ?, trial272 = ?
        WHERE id = ?
      `;
      
      const params = [
        dbData.idprov, dbData.fecha, dbData.subtotal, dbData.descuento, dbData.total,
        dbData.fpago, dbData.codempresa, dbData.iva, dbData.descripcion, dbData.numfactura,
        dbData.autorizacion, dbData.subtotal0, dbData.credito, dbData.anticipada, dbData.pagado,
        dbData.plazodias, dbData.tipo, dbData.sustento, dbData.trial272, this.id
      ];
      
      const result = await window.electronAPI.dbRun(updateQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      return this;
    } else {
      // Crear nueva compra
      const insertQuery = `
        INSERT INTO compra (
          idprov, fecha, subtotal, descuento, total, fpago, codempresa, 
          iva, descripcion, numfactura, autorizacion, subtotal0, credito,
          anticipada, pagado, plazodias, tipo, sustento, trial272
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        dbData.idprov, dbData.fecha, dbData.subtotal, dbData.descuento, dbData.total,
        dbData.fpago, dbData.codempresa, dbData.iva, dbData.descripcion, dbData.numfactura,
        dbData.autorizacion, dbData.subtotal0, dbData.credito, dbData.anticipada, dbData.pagado,
        dbData.plazodias, dbData.tipo, dbData.sustento, dbData.trial272
      ];
      
      const result = await window.electronAPI.dbRun(insertQuery, params);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      this.id = result.data.lastID;
      return this;
    }
  }

  // Eliminar compra
  static async delete(id) {
    const result = await window.electronAPI.dbRun('DELETE FROM compra WHERE id = ?', [id]);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  }

  // Calcular totales
  calcularTotales() {
    this.subtotal = parseFloat(this.subtotal0) || 0;
    this.iva = this.subtotal * 0.12; // 12% IVA
    this.total = this.subtotal + this.iva - (parseFloat(this.descuento) || 0);
  }
}

export default Compra;
