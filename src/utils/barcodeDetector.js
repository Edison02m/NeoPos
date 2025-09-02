// Configuración para Barcode2Win y escáneres de código de barras
export const BarcodeConfig = {
  // Tiempo mínimo entre caracteres para considerar como código de barras (ms)
  minTimeBetweenChars: 50,
  
  // Tiempo máximo entre caracteres para seguir considerando el mismo código (ms)
  maxTimeBetweenChars: 100,
  
  // Longitud mínima del código de barras
  minBarcodeLength: 4,
  
  // Longitud máxima del código de barras
  maxBarcodeLength: 50,
  
  // Caracteres que indican fin de código de barras
  endChars: ['Enter', 'Tab'],
  
  // Prefijos comunes de códigos de barras (opcional)
  commonPrefixes: ['789', '780', '977', '978', '979'],
  
  // Configuración de sonidos
  sounds: {
    enabled: true,
    successFrequency: 800,
    errorFrequency: 200,
    volume: 0.1
  },
  
  // Configuración de vibración (para dispositivos móviles)
  vibration: {
    enabled: true,
    successPattern: [100],
    errorPattern: [100, 100, 100]
  }
};

// Clase para manejar la detección de códigos de barras
export class BarcodeDetector {
  constructor(onBarcodeDetected, config = {}) {
    this.onBarcodeDetected = onBarcodeDetected;
    this.config = { ...BarcodeConfig, ...config };
    this.buffer = '';
    this.lastKeystroke = 0;
    this.isListening = false;
    
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }
  
  startListening() {
    if (!this.isListening) {
      document.addEventListener('keypress', this.handleKeyPress);
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.isListening = true;
      console.log('Barcode detector started');
    }
  }
  
  stopListening() {
    if (this.isListening) {
      document.removeEventListener('keypress', this.handleKeyPress);
      document.removeEventListener('keydown', this.handleKeyDown.bind(this));
      this.isListening = false;
      console.log('Barcode detector stopped');
    }
  }
  
  handleKeyDown(e) {
    // Manejar teclas especiales como Enter y Tab
    if (this.config.endChars.includes(e.key)) {
      this.processBuffer(e);
    }
  }
  
  handleKeyPress(e) {
    const now = Date.now();
    
    // Si han pasado más de maxTimeBetweenChars ms, reiniciar buffer
    if (now - this.lastKeystroke > this.config.maxTimeBetweenChars) {
      this.buffer = '';
    }
    
    this.lastKeystroke = now;
    
    // Solo procesar caracteres imprimibles
    if (e.key && e.key.length === 1) {
      this.buffer += e.key;
      
      // Si el buffer es muy largo, truncar
      if (this.buffer.length > this.config.maxBarcodeLength) {
        this.buffer = this.buffer.slice(-this.config.maxBarcodeLength);
      }
    }
  }
  
  processBuffer(e) {
    if (this.buffer.length >= this.config.minBarcodeLength) {
      // Prevenir comportamiento por defecto
      e.preventDefault();
      e.stopPropagation();
      
      const barcode = this.buffer.trim();
      console.log('Código de barras detectado:', barcode);
      
      // Llamar callback
      if (this.onBarcodeDetected) {
        this.onBarcodeDetected(barcode);
      }
      
      // Limpiar buffer
      this.buffer = '';
    }
  }
  
  // Método para detectar si es probable que sea un código de barras
  isLikelyBarcode(text) {
    // Verificar longitud
    if (text.length < this.config.minBarcodeLength || 
        text.length > this.config.maxBarcodeLength) {
      return false;
    }
    
    // Verificar si contiene solo números (la mayoría de códigos de barras)
    const onlyNumbers = /^\d+$/.test(text);
    
    // Verificar si tiene un prefijo común
    const hasCommonPrefix = this.config.commonPrefixes.some(prefix => 
      text.startsWith(prefix)
    );
    
    return onlyNumbers || hasCommonPrefix;
  }
  
  // Reproducir sonido de éxito
  playSuccessSound() {
    if (!this.config.sounds.enabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(this.config.sounds.successFrequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.config.sounds.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Silenciar errores de audio
    }
  }
  
  // Reproducir sonido de error
  playErrorSound() {
    if (!this.config.sounds.enabled) return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(this.config.sounds.errorFrequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.config.sounds.volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      // Silenciar errores de audio
    }
  }
  
  // Vibrar dispositivo
  vibrate(pattern = 'success') {
    if (!this.config.vibration.enabled || !window.navigator || !window.navigator.vibrate) {
      return;
    }
    
    const vibrationPattern = pattern === 'success' 
      ? this.config.vibration.successPattern 
      : this.config.vibration.errorPattern;
      
    window.navigator.vibrate(vibrationPattern);
  }
}

export default BarcodeDetector;
