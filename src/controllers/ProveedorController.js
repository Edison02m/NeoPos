import Proveedor from '../models/Proveedor';

class ProveedorController {
  constructor() {
    // El controlador usa el modelo Proveedor directamente
  }

  // Obtener todos los proveedores
  async getAllProveedores() {
    try {
      const proveedores = await Proveedor.findAll();
      return {
        success: true,
        data: proveedores || [],
        message: proveedores && proveedores.length > 0 ? null : 'No hay proveedores registrados'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener proveedores',
        error: error.message
      };
    }
  }

  // Obtener proveedor por ID
  async getProveedorById(id) {
    try {
      const proveedor = await Proveedor.findById(id);
      return {
        success: true,
        data: proveedor,
        message: proveedor ? null : 'Proveedor no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener proveedor',
        error: error.message
      };
    }
  }

  // Buscar proveedor por nombre
  async getProveedorByName(name) {
    try {
      const proveedor = await Proveedor.findByName(name);
      return {
        success: true,
        data: proveedor,
        message: proveedor ? null : 'Proveedor no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar proveedor',
        error: error.message
      };
    }
  }

  // Buscar proveedor por RUC
  async getProveedorByRuc(ruc) {
    try {
      const proveedor = await Proveedor.findByRuc(ruc);
      return {
        success: true,
        data: proveedor,
        message: proveedor ? null : 'Proveedor no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar proveedor',
        error: error.message
      };
    }
  }

  // Validar RUC ecuatoriano
  validateRucEcuatoriano(ruc) {
    if (!ruc) return true; // Si no hay RUC, es válido (campo opcional)
    
    const rucToValidate = ruc.toString().trim();
    
    // Validar que tenga 13 dígitos y termine en 001
    if (rucToValidate.length !== 13 || !/^\d{13}$/.test(rucToValidate) || !rucToValidate.endsWith('001')) {
      return false;
    }
    
    // Extraer los primeros 10 dígitos (que corresponden a la cédula)
    const cedulaPart = rucToValidate.substring(0, 10);
    
    // Validar la parte de la cédula usando el mismo algoritmo
    const digits = cedulaPart.split('').map(Number);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    
    for (let i = 0; i < 9; i++) {
      let valor = digits[i] * coeficientes[i];
      suma += valor >= 10 ? valor - 9 : valor;
    }
    
    const digitoVerificador = suma % 10 === 0 ? 0 : 10 - (suma % 10);
    
    return digitoVerificador === digits[9];
  }

  // Crear un nuevo proveedor
  async createProveedor(proveedorData) {
    try {
      // Validaciones básicas
      if (!proveedorData.empresa || proveedorData.empresa.trim() === '') {
        return {
          success: false,
          message: 'El nombre de la empresa es obligatorio'
        };
      }
      
      // Validar RUC si se proporciona
      if (proveedorData.ruc && proveedorData.ruc.trim() !== '') {
        if (!this.validateRucEcuatoriano(proveedorData.ruc)) {
          return {
            success: false,
            message: 'El RUC ingresado no es válido'
          };
        }
        
        // Verificar si ya existe un proveedor con ese RUC
        const existingProveedor = await Proveedor.findByRuc(proveedorData.ruc);
        if (existingProveedor) {
          return {
            success: false,
            message: 'Ya existe un proveedor con este RUC'
          };
        }
      }
      
      // Crear el proveedor
      await Proveedor.create(proveedorData);
      
      return {
        success: true,
        message: 'Proveedor creado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear proveedor',
        error: error.message
      };
    }
  }

  // Actualizar un proveedor existente
  async updateProveedor(id, proveedorData) {
    try {
      // Validaciones básicas
      if (!proveedorData.empresa || proveedorData.empresa.trim() === '') {
        return {
          success: false,
          message: 'El nombre de la empresa es obligatorio'
        };
      }
      
      // Validar RUC si se proporciona
      if (proveedorData.ruc && proveedorData.ruc.trim() !== '') {
        if (!this.validateRucEcuatoriano(proveedorData.ruc)) {
          return {
            success: false,
            message: 'El RUC ingresado no es válido'
          };
        }
        
        // Verificar si ya existe otro proveedor con ese RUC
        const existingProveedor = await Proveedor.findByRuc(proveedorData.ruc);
        if (existingProveedor && existingProveedor.cod !== id) {
          return {
            success: false,
            message: 'Ya existe otro proveedor con este RUC'
          };
        }
      }
      
      // Verificar que el proveedor exista
      const proveedor = await Proveedor.findById(id);
      if (!proveedor) {
        return {
          success: false,
          message: 'Proveedor no encontrado'
        };
      }
      
      // Actualizar el proveedor
      await Proveedor.update(id, proveedorData);
      
      return {
        success: true,
        message: 'Proveedor actualizado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar proveedor',
        error: error.message
      };
    }
  }

  // Eliminar un proveedor
  async deleteProveedor(id) {
    try {
      // Verificar que el proveedor exista
      const proveedor = await Proveedor.findById(id);
      if (!proveedor) {
        return {
          success: false,
          message: 'Proveedor no encontrado'
        };
      }
      
      // Eliminar el proveedor
      await Proveedor.delete(id);
      
      return {
        success: true,
        message: 'Proveedor eliminado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar proveedor',
        error: error.message
      };
    }
  }

  // Buscar proveedores
  async searchProveedores(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getAllProveedores();
      }
      
      const proveedores = await Proveedor.search(searchTerm);
      
      return {
        success: true,
        data: proveedores || [],
        message: proveedores && proveedores.length > 0 ? null : 'No se encontraron proveedores'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar proveedores',
        error: error.message
      };
    }
  }
}

export default ProveedorController;