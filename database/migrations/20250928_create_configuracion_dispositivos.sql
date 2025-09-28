-- Tabla para configuración de dispositivos
CREATE TABLE IF NOT EXISTS configuracion_dispositivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,  -- 'printer', 'scanner', etc.
    valor TEXT NOT NULL, -- nombre del dispositivo o puerto
    configuracion TEXT,  -- JSON con configuración adicional
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tipo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_config_disp_tipo ON configuracion_dispositivos(tipo);