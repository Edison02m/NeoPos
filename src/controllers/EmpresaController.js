import Empresa from '../models/Empresa';

class EmpresaController {
  constructor() {
    // El controlador ahora usa el modelo directamente
  }

  // Guardar empresa (crear o actualizar)
  async saveEmpresa(empresaData) {
    try {
      const empresa = await Empresa.save(empresaData);
      return {
        success: true,
        message: empresa.id ? 'Empresa actualizada correctamente' : 'Empresa creada correctamente',
        data: empresa
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al guardar empresa',
        error: error.message
      };
    }
  }

  // Obtener empresa (solo puede haber una)
  async getEmpresa() {
    try {
      const empresa = await Empresa.getEmpresa();
      return {
        success: true,
        data: empresa,
        message: empresa ? null : 'No hay empresa registrada'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar si existe una empresa registrada
  async existeEmpresa() {
    try {
      const exists = await Empresa.exists();
      return {
        success: true,
        exists: exists
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Eliminar empresa (usar con precaución)
  async deleteEmpresa() {
    try {
      await Empresa.delete();
      return {
        success: true,
        message: 'Empresa eliminada correctamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validar RUC
  async validarRUC(ruc, empresaId = null) {
    try {
      const isUnique = await Empresa.validateUniqueRUC(ruc, empresaId);
      return {
        success: true,
        isUnique: isUnique
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default EmpresaController;