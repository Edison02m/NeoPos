import Cliente from '../models/Cliente';

class ClienteController {
  constructor() {
    // El controlador usa el modelo Cliente directamente
  }

  // Obtener todos los clientes
  async getAllClientes() {
    try {
      const clientes = await Cliente.findAll();
      return {
        success: true,
        data: clientes || [],
        message: clientes && clientes.length > 0 ? null : 'No hay clientes registrados'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener clientes',
        error: error.message
      };
    }
  }

  // Obtener cliente por ID
  async getClienteById(id) {
    try {
      const cliente = await Cliente.findById(id);
      return {
        success: true,
        data: cliente,
        message: cliente ? null : 'Cliente no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al obtener cliente',
        error: error.message
      };
    }
  }

  // Buscar cliente por nombre
  async getClienteByName(name) {
    try {
      const cliente = await Cliente.findByName(name);
      return {
        success: true,
        data: cliente,
        message: cliente ? null : 'Cliente no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar cliente',
        error: error.message
      };
    }
  }

  // Buscar cliente por cédula/RUC
  async getClienteByCedulaRuc(cedulaRuc) {
    try {
      const cliente = await Cliente.findByCedulaRuc(cedulaRuc);
      return {
        success: true,
        data: cliente,
        message: cliente ? null : 'Cliente no encontrado'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar cliente',
        error: error.message
      };
    }
  }

  // Validar cédula ecuatoriana
  validateCedulaEcuatoriana(cedula) {
    if (!cedula) return true; // Si no hay cédula, es válido (campo opcional)
    
    let cedulaToValidate = cedula.toString().trim();
    
    // Si es RUC (13 dígitos), tomar solo los primeros 10
    if (cedulaToValidate.length === 13) {
      if (!cedulaToValidate.endsWith('001')) {
        return false; // RUC debe terminar en 001
      }
      cedulaToValidate = cedulaToValidate.substring(0, 10);
    }
    
    // Validar que tenga exactamente 10 dígitos
    if (cedulaToValidate.length !== 10 || !/^\d{10}$/.test(cedulaToValidate)) {
      return false;
    }
    
    // Algoritmo de validación de cédula ecuatoriana
    const digits = cedulaToValidate.split('').map(Number);
    const province = parseInt(cedulaToValidate.substring(0, 2));
    
    // Validar provincia (01-24)
    if (province < 1 || province > 24) {
      return false;
    }
    
    // Algoritmo de validación
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let result = digits[i] * coefficients[i];
      if (result > 9) {
        result -= 9;
      }
      sum += result;
    }
    
    const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);
    return verifier === digits[9];
  }

  // Crear nuevo cliente
  async createCliente(clienteData) {
    try {
      // Validar datos requeridos
      if (!clienteData.apellidos || !clienteData.nombres) {
        return {
          success: false,
          message: 'Los campos apellidos y nombres son requeridos'
        };
      }

      // Validar cédula/RUC ecuatoriana
      if (clienteData.cedula && !this.validateCedulaEcuatoriana(clienteData.cedula)) {
        return {
          success: false,
          message: 'La cédula/RUC ingresada no es válida'
        };
      }

      const cliente = await Cliente.create(clienteData);
      return {
        success: true,
        message: 'Cliente creado correctamente',
        data: cliente
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al crear cliente',
        error: error.message
      };
    }
  }

  // Actualizar cliente
  async updateCliente(id, clienteData) {
    try {
      // Validar que el cliente existe
      const existingCliente = await Cliente.findById(id);
      if (!existingCliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }

      // Validar datos requeridos
      if (!clienteData.apellidos || !clienteData.nombres) {
        return {
          success: false,
          message: 'Los campos apellidos y nombres son requeridos'
        };
      }

      // Validar cédula/RUC ecuatoriana
      if (clienteData.cedula && !this.validateCedulaEcuatoriana(clienteData.cedula)) {
        return {
          success: false,
          message: 'La cédula/RUC ingresada no es válida'
        };
      }

      const cliente = await Cliente.update(id, clienteData);
      return {
        success: true,
        message: 'Cliente actualizado correctamente',
        data: cliente
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al actualizar cliente',
        error: error.message
      };
    }
  }

  // Eliminar cliente
  async deleteCliente(id) {
    try {
      // Validar que el cliente existe
      const existingCliente = await Cliente.findById(id);
      if (!existingCliente) {
        return {
          success: false,
          message: 'Cliente no encontrado'
        };
      }

      await Cliente.delete(id);
      return {
        success: true,
        message: 'Cliente eliminado correctamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al eliminar cliente',
        error: error.message
      };
    }
  }

  // Buscar clientes (búsqueda general)
  async searchClientes(searchTerm) {
    try {
      const clientes = await Cliente.search(searchTerm);
      return {
        success: true,
        data: clientes || [],
        message: clientes && clientes.length > 0 ? null : 'No se encontraron clientes'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al buscar clientes',
        error: error.message
      };
    }
  }

  // Validar cédula/RUC único
  async validateUniqueCedulaRuc(cedulaRuc, clienteId = null) {
    try {
      const existingCliente = await Cliente.findByCedulaRuc(cedulaRuc);
      const isUnique = !existingCliente || (clienteId && existingCliente.cod === parseInt(clienteId));
      return {
        success: true,
        isUnique: isUnique,
        message: isUnique ? null : 'Ya existe un cliente con esta cédula/RUC'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al validar cédula/RUC',
        error: error.message
      };
    }
  }

  // Validar email único
  async validateUniqueEmail(email, clienteId = null) {
    try {
      if (!email) {
        return {
          success: true,
          isUnique: true
        };
      }

      const clientes = await Cliente.findAll();
      const existingCliente = clientes.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
      const isUnique = !existingCliente || (clienteId && existingCliente.cod === parseInt(clienteId));
      return {
        success: true,
        isUnique: isUnique,
        message: isUnique ? null : 'Ya existe un cliente con este email'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al validar email',
        error: error.message
      };
    }
  }
}

export default ClienteController;