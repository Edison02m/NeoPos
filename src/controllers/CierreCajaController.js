import CierreCaja from '../models/CierreCaja';

class CierreCajaController {
  async obtenerResumen(fecha){
    try {
      const resp = await CierreCaja.obtenerPorFecha(fecha);
      const existente = (resp && resp.success && resp.data) ? resp.data : null;
      const lista = await CierreCaja.listar(30);
      return { success:true, data:{ cierreHoy: existente || null, lista } };
    } catch(e){
      return { success:false, error: e.message };
    }
  }

  async guardarCierre(datos){
    try {
      // Validar que no exista ya un cierre para la fecha
      const resp = await CierreCaja.obtenerPorFecha(datos.fecha);
      const existente = (resp && resp.success && resp.data) ? resp.data : null;
      if(existente){
        return { success:false, error:'Ya existe un cierre registrado para esta fecha.' };
      }
      await CierreCaja.guardar(datos);
      return { success:true };
    } catch(e){
      return { success:false, error:e.message };
    }
  }

  async actualizarCierre(fecha, datos){
    try {
      await CierreCaja.actualizar(fecha, datos);
      return { success:true };
    } catch(e){ return { success:false, error:e.message }; }
  }

  async eliminarCierre(fecha){
    try { await CierreCaja.eliminar(fecha); return { success:true }; }
    catch(e){ return { success:false, error:e.message }; }
  }
}

export default CierreCajaController;