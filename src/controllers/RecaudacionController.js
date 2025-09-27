import Recaudacion from '../models/Recaudacion';
import Empresa from '../models/Empresa';

class RecaudacionController {
  async obtenerResumen(fecha){
    try {
      const resp = await Recaudacion.getByFecha(fecha);
      const existente = (resp && resp.success && resp.data) ? resp.data : null;
      const lista = await Recaudacion.listar(30);
      return { success:true, data:{ recaudacionHoy: existente || null, lista } };
    } catch(e){ return { success:false, error:e.message }; }
  }

  async guardarRecaudacion({ fecha, efectivo, cheque, tarjeta }){
    try {
      const resp = await Recaudacion.getByFecha(fecha);
      const existe = (resp && resp.success && resp.data) ? resp.data : null;
      if(existe){ return { success:false, error:'Ya existe una recaudación registrada para esta fecha.' }; }
      const empresa = await Empresa.getEmpresa();
      if(!empresa){ return { success:false, error:'Debe registrar la Empresa antes.' }; }
      await Recaudacion.guardar({ fecha, efectivo, cheque, tarjeta, codempresa: empresa.cod || 1 });
      return { success:true };
    } catch(e){ return { success:false, error:e.message }; }
  }
  
  async actualizarRecaudacion(fecha, { efectivo, cheque, tarjeta }){
    try { await Recaudacion.actualizar(fecha, { efectivo, cheque, tarjeta }); return { success:true }; }
    catch(e){ return { success:false, error:e.message }; }
  }
  
  async eliminarRecaudacion(fecha){
    try { await Recaudacion.eliminar(fecha); return { success:true }; }
    catch(e){ return { success:false, error:e.message }; }
  }
}
export default RecaudacionController;