const { SerialPort } = require('serialport');
const { BrowserWindow } = require('electron');
const Store = require('electron-store');
const path = require('path');
const DatabaseController = require('./DatabaseController');

class DispositivosController {
  constructor() {
    this.store = new Store();
    this.port = null;
    this.mainWindow = null;
    this.db = new DatabaseController();
  }

  async getImpresionConfig() {
    try {
      // Obtener todas las configuraciones de impresión
      const results = await Promise.all([
        this.db.executeQuery('SELECT objeto, posx, posy, TEXTo FROM impresion ORDER BY objeto'),
        this.db.executeQuery('SELECT nombre, valor FROM impresionauxiliar ORDER BY nombre'),
        this.db.executeQuery('SELECT offset FROM impresionoffset LIMIT 1')
      ]);

      const [impresion, auxiliar, offset] = results;
      
      return {
        impresion: impresion || [],
        auxiliar: auxiliar || [],
        offset: offset?.[0]?.offset || 0
      };
    } catch (error) {
      console.error('Error obteniendo configuración de impresión:', error);
      return null;
    }
  }

  setMainWindow(window) {
    this.mainWindow = window;
    console.log('Ventana principal asignada al controlador de dispositivos');
  }

  // Obtener lista de impresoras del sistema
  async getPrinters() {
    try {
      const util = require('util');
      const exec = util.promisify(require('child_process').exec);
      const printers = [];
      
      // En Windows, usar WMIC para obtener la lista de impresoras
      const { stdout, stderr } = await exec('wmic printer get name');
      
      if (stderr) {
        console.error('Error ejecutando WMIC:', stderr);
      }
      
      if (stdout) {
        // Procesar la salida de WMIC
        // WMIC devuelve un formato con una línea de encabezado "Name" y luego las impresoras
        const lines = stdout.split('\n')
          .map(line => line.trim())
          .filter(line => line && line !== 'Name'); // Filtrar líneas vacías y el encabezado
        
        for (const printerName of lines) {
          if (printerName) {
            printers.push({
              name: printerName,
              displayName: printerName,
              description: 'Impresora del sistema',
              isDefault: false
            });
          }
        }
        
        // Intentar identificar la impresora predeterminada
        try {
          const { stdout: defaultPrinter } = await exec('reg query "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v Device');
          if (defaultPrinter) {
            const defaultMatch = defaultPrinter.match(/([^,]+)/);
            if (defaultMatch) {
              const defaultName = defaultMatch[1].trim();
              // Marcar la impresora predeterminada
              printers.forEach(p => {
                if (p.name === defaultName) {
                  p.isDefault = true;
                }
              });
            }
          }
        } catch (defaultError) {
          console.warn('Error obteniendo impresora predeterminada:', defaultError);
        }
      }

      console.log('Impresoras detectadas:', printers);
      return { 
        success: true, 
        printers: printers.sort((a, b) => a.name.localeCompare(b.name))
      };
    } catch (error) {
      console.error('Error obteniendo impresoras:', error);
      return { success: false, error: error.message, printers: [] };
    }
  }

  // Obtener impresora guardada
  async getSavedPrinter() {
    try {
      const result = await this.db.executeQuery(
        'SELECT valor FROM configuracion_dispositivos WHERE tipo = ?',
        ['printer']
      );
      const printer = result.length > 0 ? result[0].valor : null;
      return { success: true, printer };
    } catch (error) {
      console.error('Error obteniendo impresora guardada:', error);
      return { success: false, error: error.message };
    }
  }

  // Guardar impresora seleccionada
  async savePrinter(printerName) {
    try {
      await this.db.runQuery(
        `INSERT OR REPLACE INTO configuracion_dispositivos (tipo, valor, configuracion) 
         VALUES (?, ?, ?)`,
        ['printer', printerName, JSON.stringify({name: printerName, timestamp: new Date().toISOString()})]
      );
      return { success: true };
    } catch (error) {
      console.error('Error guardando impresora:', error);
      return { success: false, error: error.message };
    }
  }

  // Probar impresora
  async testPrinter(printerName) {
    try {
      // Obtener configuración de impresión
      const config = await this.getImpresionConfig();
      if (!config) {
        return { success: false, error: 'Error obteniendo configuración de impresión' };
      }

      // Comandos ESC/POS para impresora de tickets
      const testContent = [
        '\x1B\x40',     // Inicializar impresora
        '\x1B\x21\x08', // Enfatizado activado
        '\x1D\x21\x11', // Doble ancho y alto
        '\x1B\x61\x01', // Centrado
        '=== PRUEBA DE IMPRESIÓN ===\n\n',
        '\x1B\x21\x00', // Reset formato
        '\x1B\x61\x00', // Alineación izquierda
        'Impresora: ' + printerName + '\n',
        'Fecha: ' + new Date().toLocaleString() + '\n\n',
        'Configuración cargada:\n',
        '-----------------------\n',
        `Offset Y: ${config.offset}\n\n`
      ];

      // Agregar algunos elementos de configuración como ejemplo
      if (config.impresion.length > 0) {
        testContent.push('\x1B\x21\x01'); // Enfatizado
        testContent.push('Elementos configurados:\n');
        testContent.push('\x1B\x21\x00'); // Reset formato
        
        config.impresion.slice(0, 3).forEach(item => {
          const text = item.TEXTo ? ` (${item.TEXTo})` : '';
          testContent.push(`${item.objeto}: (${item.posx},${item.posy})${text}\n`);
        });
      }

      // Agregar configuraciones auxiliares
      if (config.auxiliar.length > 0) {
        testContent.push('\n\x1B\x21\x01'); // Enfatizado
        testContent.push('Configuraciones auxiliares:\n');
        testContent.push('\x1B\x21\x00'); // Reset formato
        
        config.auxiliar.slice(0, 3).forEach(item => {
          testContent.push(`${item.nombre}: ${item.valor}\n`);
        });
      }

      testContent.push(
        '\n',
        '\x1B\x61\x01', // Centrado
        '\x1B\x21\x01', // Enfatizado
        '=== FIN DE PRUEBA ===\n',
        '\x1B\x21\x00', // Reset formato
        '\n\n\n\n',     // Avance de papel
        '\x1D\x56\x41\x03' // Cortar papel (parcial)
      );

      // Enviar a imprimir usando la configuración de la base de datos
      try {
        // Necesitamos requerir estos módulos
        const os = require('os');
        const fs = require('fs');
        const { execSync } = require('child_process');
        
        // Crear archivo temporal
        const tempFile = path.join(os.tmpdir(), 'print_test.txt');
        
        // Guardar contenido en archivo temporal con codificación correcta
        fs.writeFileSync(tempFile, Buffer.from(testContent.join('')));
        
        // Imprimir usando copy con comandos de impresora
        execSync(`copy /b "${tempFile}" "${printerName}"`, { windowsHide: true });
        
        // Limpiar archivo temporal
        fs.unlinkSync(tempFile);
        
        console.log('Prueba enviada a impresión correctamente');
        return { success: true };
      } catch (printError) {
        console.error('Error enviando a impresora:', printError);
        return { success: false, error: 'Error al enviar a la impresora: ' + printError.message };
      }
    } catch (error) {
      console.error('Error en prueba de impresión:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener puertos seriales disponibles
  async getSerialPorts() {
    try {
      const ports = await SerialPort.list();
      return { success: true, ports };
    } catch (error) {
      console.error('Error obteniendo puertos seriales:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener configuración guardada del puerto serial
  async getSavedSerialPort() {
    try {
      const result = await window.electronAPI.dbQuery(
        'SELECT * FROM configuracion_dispositivos WHERE tipo = ?',
        ['scanner']
      );
      if (result.success && result.data.length > 0) {
        const config = JSON.parse(result.data[0].configuracion || '{}');
        return { success: true, port: result.data[0].valor, config };
      }
      return { success: true, port: null, config: null };
    } catch (error) {
      console.error('Error obteniendo configuración del puerto serial:', error);
      return { success: false, error: error.message };
    }
  }

  // Guardar configuración del puerto serial
  async saveSerialPort(portPath, config) {
    try {
      const result = await window.electronAPI.dbRun(
        `INSERT OR REPLACE INTO configuracion_dispositivos (tipo, valor, configuracion) 
         VALUES (?, ?, ?)`,
        ['scanner', portPath, JSON.stringify({
          ...config,
          timestamp: new Date().toISOString()
        })]
      );
      return { success: true };
    } catch (error) {
      console.error('Error guardando configuración del puerto serial:', error);
      return { success: false, error: error.message };
    }
  }

  // Probar scanner
  async testScanner(portPath, config) {
    try {
      // Cerrar puerto si ya está abierto
      if (this.port) {
        await new Promise((resolve) => this.port.close(resolve));
      }

      // Configurar nuevo puerto
      this.port = new SerialPort({
        path: portPath,
        baudRate: config.baudRate,
        dataBits: config.dataBits,
        stopBits: config.stopBits,
        parity: config.parity
      });

      // Manejar datos recibidos
      this.port.on('data', (data) => {
        const scanned = data.toString().trim();
        if (scanned && this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('barcode-scanned', scanned);
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error en prueba de scanner:', error);
      return { success: false, error: error.message };
    }
  }

  // Detener scanner
  async stopScanner() {
    try {
      if (this.port) {
        await new Promise((resolve) => this.port.close(resolve));
        this.port = null;
      }
      return { success: true };
    } catch (error) {
      console.error('Error deteniendo scanner:', error);
      return { success: false, error: error.message };
    }
  }

  // Establecer ventana principal para eventos
  setMainWindow(window) {
    this.mainWindow = window;
  }
}

module.exports = DispositivosController;