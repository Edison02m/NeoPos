const Empresas = require('../models/Empresas');

class EmpresasController {
  constructor() {
    this.initializeTable();
  }

  async initializeTable() {
    try {
      await Empresas.createTable();
    } catch (error) {
      console.error('Error al inicializar tabla empresas:', error);
    }
  }

  async getAllEmpresas() {
    try {
      const empresas = await Empresas.findAll();
      return {
        success: true,
        data: empresas,
        message: 'Empresas obtenidas exitosamente'
      };
    } catch (error) {
      console.error('Error al obtener empresas:', error);
      return {
        success: false,
        data: [],
        message: 'Error al obtener empresas: ' + error.message
      };
    }
  }

  async getEmpresaById(id) {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          message: 'ID de empresa requerido'
        };
      }

      const empresa = await Empresas.findById(id);
      if (!empresa) {
        return {
          success: false,
          data: null,
          message: 'Empresa no encontrada'
        };
      }

      return {
        success: true,
        data: empresa,
        message: 'Empresa obtenida exitosamente'
      };
    } catch (error) {
      console.error('Error al obtener empresa por ID:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener empresa: ' + error.message
      };
    }
  }

  async getEmpresaByRuc(ruc) {
    try {
      if (!ruc) {
        return {
          success: false,
          data: null,
          message: 'RUC de empresa requerido'
        };
      }

      const empresa = await Empresas.findByRuc(ruc);
      return {
        success: true,
        data: empresa,
        message: empresa ? 'Empresa encontrada' : 'Empresa no encontrada'
      };
    } catch (error) {
      console.error('Error al obtener empresa por RUC:', error);
      return {
        success: false,
        data: null,
        message: 'Error al obtener empresa: ' + error.message
      };
    }
  }

  async createEmpresa(empresaData) {
    try {
      // Validar campos requeridos
      const requiredFields = ['nombre', 'ruc', 'razon_social', 'direccion'];
      const missingFields = requiredFields.filter(field => !empresaData[field] || empresaData[field].trim() === '');
      
      if (missingFields.length > 0) {
        return {
          success: false,
          data: null,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        };
      }

      // Verificar si ya existe una empresa con el mismo RUC
      const existingEmpresa = await Empresas.findByRuc(empresaData.ruc);
      if (existingEmpresa) {
        return {
          success: false,
          data: null,
          message: 'Ya existe una empresa con este RUC'
        };
      }

      // Crear nueva empresa
      const empresa = new Empresas(empresaData);
      const savedEmpresa = await empresa.save();

      return {
        success: true,
        data: savedEmpresa,
        message: 'Empresa creada exitosamente'
      };
    } catch (error) {
      console.error('Error al crear empresa:', error);
      return {
        success: false,
        data: null,
        message: 'Error al crear empresa: ' + error.message
      };
    }
  }

  async updateEmpresa(id, empresaData) {
    try {
      if (!id) {
        return {
          success: false,
          data: null,
          message: 'ID de empresa requerido'
        };
      }

      // Verificar si la empresa existe
      const existingEmpresa = await Empresas.findById(id);
      if (!existingEmpresa) {
        return {
          success: false,
          data: null,
          message: 'Empresa no encontrada'
        };
      }

      // Validar campos requeridos
      const requiredFields = ['nombre', 'ruc', 'razon_social', 'direccion'];
      const missingFields = requiredFields.filter(field => !empresaData[field] || empresaData[field].trim() === '');
      
      if (missingFields.length > 0) {
        return {
          success: false,
          data: null,
          message: `Campos requeridos faltantes: ${missingFields.join(', ')}`
        };
      }

      // Verificar si el RUC ya existe en otra empresa
      if (empresaData.ruc !== existingEmpresa.ruc) {
        const empresaWithSameRuc = await Empresas.findByRuc(empresaData.ruc);
        if (empresaWithSameRuc && empresaWithSameRuc.id !== id) {
          return {
            success: false,
            data: null,
            message: 'Ya existe otra empresa con este RUC'
          };
        }
      }

      // Actualizar empresa
      Object.assign(existingEmpresa, empresaData);
      const updatedEmpresa = await existingEmpresa.save();

      return {
        success: true,
        data: updatedEmpresa,
        message: 'Empresa actualizada exitosamente'
      };
    } catch (error) {
      console.error('Error al actualizar empresa:', error);
      return {
        success: false,
        data: null,
        message: 'Error al actualizar empresa: ' + error.message
      };
    }
  }

  async deleteEmpresa(id) {
    try {
      if (!id) {
        return {
          success: false,
          message: 'ID de empresa requerido'
        };
      }

      // Verificar si la empresa existe
      const existingEmpresa = await Empresas.findById(id);
      if (!existingEmpresa) {
        return {
          success: false,
          message: 'Empresa no encontrada'
        };
      }

      // Eliminar empresa
      const deleted = await Empresas.delete(id);
      
      if (deleted) {
        return {
          success: true,
          message: 'Empresa eliminada exitosamente'
        };
      } else {
        return {
          success: false,
          message: 'No se pudo eliminar la empresa'
        };
      }
    } catch (error) {
      console.error('Error al eliminar empresa:', error);
      return {
        success: false,
        message: 'Error al eliminar empresa: ' + error.message
      };
    }
  }

  async searchEmpresas(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getAllEmpresas();
      }

      const empresas = await Empresas.search(searchTerm.trim());
      return {
        success: true,
        data: empresas,
        message: `Se encontraron ${empresas.length} empresas`
      };
    } catch (error) {
      console.error('Error al buscar empresas:', error);
      return {
        success: false,
        data: [],
        message: 'Error al buscar empresas: ' + error.message
      };
    }
  }

  // Método para validar datos de empresa
  validateEmpresaData(data) {
    const errors = [];

    if (!data.nombre || data.nombre.trim() === '') {
      errors.push('El nombre de la empresa es requerido');
    }

    if (!data.ruc || data.ruc.trim() === '') {
      errors.push('El RUC es requerido');
    } else if (!/^\d{13}001$/.test(data.ruc)) {
      errors.push('El RUC debe tener el formato correcto (13 dígitos + 001)');
    }

    if (!data.razon_social || data.razon_social.trim() === '') {
      errors.push('La razón social es requerida');
    }

    if (!data.direccion || data.direccion.trim() === '') {
      errors.push('La dirección es requerida');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('El formato del email no es válido');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }
}

module.exports = EmpresasController;