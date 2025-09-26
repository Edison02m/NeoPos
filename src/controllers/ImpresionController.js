import Impresion from '../models/Impresion';
import ImpresionAuxiliar from '../models/ImpresionAuxiliar';
import ImpresionNC from '../models/ImpresionNC';
import ImpresionOffset from '../models/ImpresionOffset';
import ImpresionRetencion from '../models/ImpresionRetencion';

class ImpresionController {
  async listarTodo(){
    try {
      const [impresion, auxiliar, nc, offset, retencion] = await Promise.all([
        Impresion.findAll(),
        ImpresionAuxiliar.findAll(),
        ImpresionNC.findAll(),
        ImpresionOffset.getOffset(),
        ImpresionRetencion.findAll()
      ]);
      return { success:true, data:{ impresion, auxiliar, nc, offset, retencion } };
    } catch(e){ return { success:false, error:e.message }; }
  }
  async guardar({ impresion=[], auxiliar=[], nc=[], retencion=[], offset=null }){
    try {
      if(Array.isArray(impresion)) await Impresion.bulkSave(impresion);
      if(Array.isArray(auxiliar)) await ImpresionAuxiliar.bulkSave(auxiliar);
      if(Array.isArray(nc)) await ImpresionNC.bulkSave(nc);
      if(Array.isArray(retencion)) await ImpresionRetencion.bulkSave(retencion);
      if(offset !== null && offset !== undefined){
        await ImpresionOffset.setOffset(offset);
      }
      return { success:true };
    } catch(e){ return { success:false, error:e.message }; }
  }
}
export default ImpresionController;
