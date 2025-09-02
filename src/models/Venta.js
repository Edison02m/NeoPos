class Venta {
  constructor({
    id = null,
    numero_comprobante = '',
    tipo_comprobante = 'Nota de venta',
    fecha = new Date(),
    cliente_id = null,
    cliente_nombres = '',
    cliente_apellidos = '',
    cliente_ruc_ci = '',
    cliente_telefono = '',
    cliente_direccion = '',
    subtotal = 0,
    descuento = 0,
    iva = 0,
    total = 0,
    estado = 'pendiente',
    observaciones = '',
    items = []
  } = {}) {
    this.id = id;
    this.numero_comprobante = numero_comprobante;
    this.tipo_comprobante = tipo_comprobante;
    this.fecha = fecha;
    this.cliente_id = cliente_id;
    this.cliente_nombres = cliente_nombres;
    this.cliente_apellidos = cliente_apellidos;
    this.cliente_ruc_ci = cliente_ruc_ci;
    this.cliente_telefono = cliente_telefono;
    this.cliente_direccion = cliente_direccion;
    this.subtotal = subtotal;
    this.descuento = descuento;
    this.iva = iva;
    this.total = total;
    this.estado = estado;
    this.observaciones = observaciones;
    this.items = items;
  }

  // Calcular totales
  calcularTotales() {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
    this.iva = this.subtotal * 0.12; // IVA 12%
    this.total = this.subtotal + this.iva - this.descuento;
    
    return {
      subtotal: this.subtotal,
      iva: this.iva,
      total: this.total
    };
  }

  // Agregar item
  agregarItem(item) {
    const existingIndex = this.items.findIndex(i => i.producto_id === item.producto_id);
    
    if (existingIndex >= 0) {
      this.items[existingIndex].cantidad += item.cantidad;
    } else {
      this.items.push({
        id: Date.now(),
        producto_id: item.producto_id,
        codigo_barras: item.codigo_barras,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.cantidad * item.precio_unitario
      });
    }
    
    this.calcularTotales();
  }

  // Remover item
  removerItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    this.calcularTotales();
  }

  // Actualizar cantidad
  actualizarCantidad(itemId, nuevaCantidad) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.cantidad = nuevaCantidad;
      item.subtotal = item.cantidad * item.precio_unitario;
      this.calcularTotales();
    }
  }

  // Generar número de comprobante automático
  static generarNumeroComprobante(tipo = 'nota') {
    const fecha = new Date();
    const year = fecha.getFullYear().toString().slice(-2);
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-5);
    
    if (tipo === 'factura') {
      return `002-001-${timestamp}`;
    } else {
      return `001-001-${timestamp}`;
    }
  }

  // Validar venta
  validar() {
    const errores = [];
    
    if (this.items.length === 0) {
      errores.push('Debe agregar al menos un producto a la venta');
    }
    
    if (this.tipo_comprobante === 'Factura' && !this.cliente_ruc_ci) {
      errores.push('Para facturas es obligatorio ingresar RUC/CI del cliente');
    }
    
    if (this.items.some(item => item.cantidad <= 0)) {
      errores.push('Todos los productos deben tener cantidad mayor a 0');
    }
    
    return {
      valido: errores.length === 0,
      errores
    };
  }

  // Convertir a objeto para base de datos
  toDatabase() {
    return {
      numero_comprobante: this.numero_comprobante,
      tipo_comprobante: this.tipo_comprobante,
      fecha: this.fecha.toISOString().split('T')[0],
      cliente_nombres: this.cliente_nombres,
      cliente_apellidos: this.cliente_apellidos,
      cliente_ruc_ci: this.cliente_ruc_ci,
      cliente_telefono: this.cliente_telefono,
      cliente_direccion: this.cliente_direccion,
      subtotal: this.subtotal,
      descuento: this.descuento,
      iva: this.iva,
      total: this.total,
      estado: this.estado,
      observaciones: this.observaciones
    };
  }
}

export default Venta;
