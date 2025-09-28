import React, { useState, useEffect } from 'react';

const ConfigurarDispositivos = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [serialPorts, setSerialPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('');
  const [scannerConfig, setScannerConfig] = useState({
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  });
  const [testing, setTesting] = useState(false);
  const [scannedData, setScannedData] = useState('');

  // Cargar dispositivos al montar el componente
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setMessage('Detectando dispositivos conectados...');
      setMessageType('info');

      // Obtener lista de impresoras
      if (window.electronAPI?.getPrinters) {
        try {
          const printersResult = await window.electronAPI.getPrinters();
          if (printersResult.success && printersResult.printers?.length > 0) {
            setPrinters(printersResult.printers);
            setMessage('Impresoras detectadas: ' + printersResult.printers.length);
            // Cargar impresora guardada
            const savedPrinter = await window.electronAPI.getSavedPrinter();
            if (savedPrinter.success && savedPrinter.printer) {
              setSelectedPrinter(savedPrinter.printer);
            }
          } else {
            setMessage('No se detectaron impresoras instaladas');
            setMessageType('warning');
          }
        } catch (error) {
          console.error('Error al obtener impresoras:', error);
          setMessage('Error al detectar impresoras: ' + error.message);
          setMessageType('error');
        }
      }

      // Obtener puertos seriales
      if (window.electronAPI?.getSerialPorts) {
        try {
          const portsResult = await window.electronAPI.getSerialPorts();
          if (portsResult.success && portsResult.ports?.length > 0) {
            setSerialPorts(portsResult.ports);
            setMessage('Puertos seriales detectados: ' + portsResult.ports.length);
            // Cargar puerto guardado
            const savedPort = await window.electronAPI.getSavedSerialPort();
            if (savedPort.success && savedPort.port) {
              setSelectedPort(savedPort.port);
              setScannerConfig(savedPort.config || scannerConfig);
            }
          } else {
            setMessage('No se detectaron lectores de códigos conectados');
            setMessageType('warning');
          }
        } catch (error) {
          console.error('Error al obtener puertos seriales:', error);
          setMessage('Error al detectar lectores: ' + error.message);
          setMessageType('error');
        }
      }

      if (!printers.length && !serialPorts.length) {
        setMessage('No se detectaron dispositivos conectados');
        setMessageType('warning');
      } else {
        const devices = [];
        if (printers.length) devices.push(`${printers.length} impresora(s)`);
        if (serialPorts.length) devices.push(`${serialPorts.length} puerto(s) serial`);
        setMessage(`Dispositivos encontrados: ${devices.join(' y ')}`);
        setMessageType('success');
      }
    } catch (error) {
      console.error('Error cargando dispositivos:', error);
      setMessage('Error detectando dispositivos: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrinterTest = async () => {
    if (!selectedPrinter) {
      setMessage('Seleccione una impresora primero');
      setMessageType('warning');
      return;
    }

    try {
      setTesting(true);
      setMessage('Enviando prueba de impresión...');
      setMessageType('info');

      const result = await window.electronAPI.testPrinter(selectedPrinter);
      if (result.success) {
        setMessage('Prueba de impresión enviada correctamente');
        setMessageType('success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error en prueba de impresión:', error);
      setMessage('Error en prueba de impresión: ' + error.message);
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  const handleScannerTest = async () => {
    if (!selectedPort) {
      setMessage('Seleccione un puerto serial primero');
      setMessageType('warning');
      return;
    }

    try {
      setTesting(true);
      setMessage('Iniciando prueba de scanner...');
      setMessageType('info');
      setScannedData('');

      // Iniciar escucha de datos del scanner
      const result = await window.electronAPI.testScanner(selectedPort, scannerConfig);
      if (result.success) {
        // El scanner está listo, mostrar mensaje al usuario
        setMessage('Scanner listo. Escanee un código de barras para probar...');
        setMessageType('info');

        // Suscribirse a eventos de escaneo
        window.electron.ipcRenderer.on('barcode-scanned', (_, data) => {
          setScannedData(data);
          setMessage('Código escaneado correctamente');
          setMessageType('success');
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error en prueba de scanner:', error);
      setMessage('Error en prueba de scanner: ' + error.message);
      setMessageType('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage('Guardando configuración...');
      setMessageType('info');

      // Guardar configuración de impresora
      if (selectedPrinter) {
        await window.electronAPI.savePrinter(selectedPrinter);
      }

      // Guardar configuración de scanner
      if (selectedPort) {
        await window.electronAPI.saveSerialPort(selectedPort, scannerConfig);
      }

      setMessage('Configuración guardada correctamente');
      setMessageType('success');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setMessage('Error guardando configuración: ' + error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.electronAPI?.closeCurrentWindow) {
      window.electronAPI.closeCurrentWindow();
    } else {
      window.close();
    }
  };

  return (
    <div className="bg-white min-h-screen p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white">
        <div className="text-center mb-8 pb-6 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="3" y="7" width="18" height="10" rx="2"/>
              <rect x="7" y="3" width="10" height="4" rx="1"/>
              <rect x="9" y="17" width="6" height="2" rx="1"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configurar Dispositivos</h1>
          <p className="text-sm text-gray-600">Configure la impresora de facturas y el lector de códigos de barras</p>
        </div>

        {/* Mensajes de estado */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg text-center text-sm font-medium flex items-center justify-center gap-2
            ${messageType === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 
              messageType === 'error' ? 'bg-red-50 text-red-800 border-2 border-red-200' :
              messageType === 'warning' ? 'bg-yellow-50 text-yellow-800 border-2 border-yellow-200' :
              'bg-blue-50 text-blue-800 border-2 border-blue-200'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {messageType === 'success' ? (
                <polyline points="20,6 9,17 4,12"/>
              ) : messageType === 'error' ? (
                <>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </>
              ) : messageType === 'warning' ? (
                <>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </>
              ) : (
                <circle cx="12" cy="12" r="10"/>
              )}
            </svg>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Configuración de Impresora */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="7" width="18" height="10" rx="2"/>
                <line x1="7" y1="11" x2="17" y2="11"/>
                <line x1="7" y1="13" x2="17" y2="13"/>
              </svg>
              Impresora de Facturas
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Impresora
                </label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  disabled={loading}
                >
                  <option value="">Seleccione una impresora...</option>
                  {printers.map((printer) => (
                    <option key={printer.name} value={printer.name}>
                      {printer.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handlePrinterTest}
                disabled={!selectedPrinter || loading || testing}
                className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${!selectedPrinter || loading || testing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 transform hover:-translate-y-0.5'
                  }`}
              >
                {testing ? 'Enviando prueba...' : 'Imprimir Página de Prueba'}
              </button>
            </div>
          </div>

          {/* Configuración de Scanner */}
          <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <line x1="12" y1="12" x2="12" y2="12"/>
                <line x1="6" y1="12" x2="18" y2="12" strokeDasharray="1 3"/>
              </svg>
              Lector de Códigos
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puerto Serial
                </label>
                <select
                  value={selectedPort}
                  onChange={(e) => setSelectedPort(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  disabled={loading}
                >
                  <option value="">Seleccione un puerto...</option>
                  {serialPorts.map((port) => (
                    <option key={port.path} value={port.path}>
                      {port.path} - {port.manufacturer || 'Desconocido'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Velocidad (Baud Rate)
                  </label>
                  <select
                    value={scannerConfig.baudRate}
                    onChange={(e) => setScannerConfig(prev => ({ ...prev, baudRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    disabled={loading}
                  >
                    {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((rate) => (
                      <option key={rate} value={rate}>{rate}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bits de Datos
                  </label>
                  <select
                    value={scannerConfig.dataBits}
                    onChange={(e) => setScannerConfig(prev => ({ ...prev, dataBits: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all duration-200 bg-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    disabled={loading}
                  >
                    {[5, 6, 7, 8].map((bits) => (
                      <option key={bits} value={bits}>{bits}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScannerTest}
                disabled={!selectedPort || loading || testing}
                className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                  ${!selectedPort || loading || testing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600 transform hover:-translate-y-0.5'
                  }`}
              >
                {testing ? 'Probando scanner...' : 'Probar Scanner'}
              </button>

              {/* Área de resultado de escaneo */}
              {scannedData && (
                <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-1">
                    Código escaneado:
                  </div>
                  <div className="font-mono text-sm text-green-700 break-all">
                    {scannedData}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 justify-center mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || testing}
            className={`flex items-center gap-2 px-6 py-3 text-white border-none rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 ${
              loading || testing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-900 hover:bg-gray-800 cursor-pointer'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading || testing}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 transform hover:bg-gray-200 hover:-translate-y-0.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurarDispositivos;