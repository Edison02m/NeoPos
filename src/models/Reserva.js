class Reserva {
  // Tabla: reservacion (id, cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado, created_at)
  static async findAll(){
    const result = await window.electronAPI.dbQuery('SELECT * FROM reservacion ORDER BY fecha_reservacion DESC');
    if(!result.success) throw new Error(result.error);
    return result.data;
  }

  static async findById(id){
    const result = await window.electronAPI.dbGetSingle('SELECT * FROM reservacion WHERE id = ?', [id]);
    if(!result.success) throw new Error(result.error);
    return result.data;
  }

  static async findByCliente(cliente_id){
    const result = await window.electronAPI.dbQuery('SELECT * FROM reservacion WHERE cliente_id = ? ORDER BY fecha_reservacion DESC', [cliente_id]);
    if(!result.success) throw new Error(result.error);
    return result.data;
  }

  static async create({ cliente_id, fecha_reservacion, fecha_evento, descripcion = '', monto_reserva = 0, estado = 'ACTIVA' }){
    if(!cliente_id) throw new Error('cliente_id requerido');
    const hoy = new Date().toISOString().split('T')[0];
    const fReserva = fecha_reservacion || hoy;
    const result = await window.electronAPI.dbRun(
      'INSERT INTO reservacion (cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado, created_at) VALUES (?,?,?,?,?,?,datetime("now"))',
      [cliente_id, fReserva, fecha_evento || fReserva, descripcion, Number(monto_reserva)||0, estado]
    );
    if(!result.success) throw new Error(result.error);
    return { success:true, id: result.lastID };
  }

  static async actualizarMonto(id, monto_reserva){
    const result = await window.electronAPI.dbRun('UPDATE reservacion SET monto_reserva = ? WHERE id = ?', [Number(monto_reserva)||0, id]);
    if(!result.success) throw new Error(result.error);
    return { success:true };
  }

  static async actualizarEstado(id, estado){
    const result = await window.electronAPI.dbRun('UPDATE reservacion SET estado = ? WHERE id = ?', [estado, id]);
    if(!result.success) throw new Error(result.error);
    return { success:true };
  }

  static async delete(id){
    const result = await window.electronAPI.dbRun('DELETE FROM reservacion WHERE id = ?', [id]);
    if(!result.success) throw new Error(result.error);
    return { success:true };
  }
}

export default Reserva;
