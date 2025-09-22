import Reserva from '../models/Reserva';
import Cliente from '../models/Cliente';

class ReservaController {
  async listar(){
    try { const data = await Reserva.findAll(); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async obtener(id){
    try { const data = await Reserva.findById(id); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async listarPorCliente(cliente_id){
    try { const data = await Reserva.findByCliente(cliente_id); return { success:true, data }; } catch(e){ return { success:false, error:e.message }; }
  }
  async crear({ cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado }){
    try { const res = await Reserva.create({ cliente_id, fecha_reservacion, fecha_evento, descripcion, monto_reserva, estado }); return { success:true, data:{ id: res.id } }; } catch(e){ return { success:false, error:e.message }; }
  }
  async actualizarMonto({ id, monto_reserva }){
    try { await Reserva.actualizarMonto(id, monto_reserva); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
  async actualizarEstado({ id, estado }){
    try { await Reserva.actualizarEstado(id, estado); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
  async eliminar({ id }){
    try { await Reserva.delete(id); return { success:true }; } catch(e){ return { success:false, error:e.message }; }
  }
}

export default ReservaController;
