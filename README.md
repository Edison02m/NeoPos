# NeoPOS - Sistema de Punto de Venta

Sistema de punto de venta desarrollado con **Electron**, **React** y **Tailwind CSS** siguiendo el patrón **Modelo-Vista-Controlador (MVC)** con base de datos **SQLite**.

## Características

- ✅ Interfaz de escritorio moderna con Electron
- ✅ Diseño responsive con React y Tailwind CSS v3.4
- ✅ Base de datos SQLite integrada
- ✅ Arquitectura MVC bien estructurada
- ✅ Gestión completa de inventario
- ✅ Sistema de ventas con facturación
- ✅ Reportes y estadísticas
- ✅ Gestión de clientes y proveedores

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalados:

- **Node.js** v18.0.0 o superior
- **npm** v9.0.0 o superior
- **Git** (opcional)

## Instalación Paso a Paso

### 1. Clonar o descargar el proyecto

```bash
git clone [URL_DEL_REPOSITORIO]
cd neopos-electron
```

### 2. Instalar dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install

# Esto instalará:
# - React 18.2.0
# - Electron 27.0.0
# - Tailwind CSS 3.4.0
# - SQLite3 5.1.6
# - React Router DOM 6.17.0
# - Y todas las demás dependencias listadas en package.json
```

### 3. Verificar la instalación

```bash
# Verificar que todas las dependencias se instalaron correctamente
npm list --depth=0
```

### 4. Configuración de desarrollo

#### Opción A: Desarrollo con hot reload (recomendado)

```bash
# Iniciar el servidor de desarrollo de React y Electron simultáneamente
npm run dev
```

Esto hará:
1. Iniciar el servidor de desarrollo de React en `http://localhost:3000`
2. Esperar a que el servidor esté listo
3. Abrir la aplicación Electron con hot reload

#### Opción B: Desarrollo manual

```bash
# Terminal 1: Iniciar servidor de React
npm run dev-react

# Terminal 2: Una vez que React esté corriendo, iniciar Electron
npm start
```

### 5. Configuración de producción

#### Construir la aplicación

```bash
# Construir la aplicación para producción
npm run build-all

# Esto generará:
# - Carpeta /build con la aplicación React optimizada
# - Carpeta /dist con el ejecutable de Electron
```

#### Ejecutar la versión de producción

```bash
# La aplicación ejecutable estará en:
# Windows: dist/NeoPOS Setup.exe
# macOS: dist/NeoPOS.dmg
# Linux: dist/NeoPOS.AppImage
```

## Estructura del Proyecto (MVC)

```
neopos-electron/
├── src/
│   ├── main.js                 # Controlador principal de Electron
│   ├── preload.js             # Puente seguro entre procesos
│   ├── models/                # Modelos de datos
│   ├── views/                 # Vistas de React
│   │   ├── components/        # Componentes reutilizables
│   │   ├── context/          # Contexto de React
│   │   └── pages/            # Páginas principales
│   ├── controllers/           # Controladores de lógica
│   │   └── DatabaseController.js
│   ├── database/             # Archivos de base de datos
│   └── utils/                # Utilidades
├── public/                   # Archivos públicos de React
├── assets/                   # Recursos estáticos
├── config/                   # Configuraciones
├── scripts/                  # Scripts de utilidad
└── database/                 # Base de datos SQLite
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia Electron en modo producción |
| `npm run dev` | Inicia desarrollo con hot reload |
| `npm run dev-react` | Solo servidor de React |
| `npm run build` | Construye React para producción |
| `npm run electron-build` | Construye ejecutable de Electron |
| `npm run build-all` | Construye todo para producción |

## Solución de Problemas Comunes

### Error: "sqlite3 no se puede instalar"

```bash
# Limpiar caché de npm
npm cache clean --force

# Reinstalar con build desde fuente
npm install --build-from-source sqlite3

# O usar node-gyp
npm install -g node-gyp
npm install
```

### Error: "Electron no inicia"

```bash
# Verificar que React esté corriendo en localhost:3000
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Error: "Tailwind CSS no funciona"

```bash
# Verificar que PostCSS esté configurado
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Configuración de Base de Datos

La base de datos SQLite se crea automáticamente en:
- **Desarrollo**: `database/neopos.db`
- **Producción**: Dentro del ejecutable

### Estructura de la base de datos:

- **categories**: Categorías de productos
- **suppliers**: Proveedores
- **products**: Catálogo de productos
- **customers**: Clientes
- **sales**: Ventas realizadas
- **sale_items**: Detalles de cada venta
- **inventory_movements**: Movimientos de inventario
- **users**: Usuarios del sistema

## Credenciales de Prueba

- **Usuario**: admin
- **Contraseña**: admin123

## Desarrollo Adicional

Para agregar nuevas funcionalidades:

1. **Modelos**: Crear en `src/models/`
2. **Vistas**: Crear componentes en `src/views/`
3. **Controladores**: Agregar lógica en `src/controllers/`
4. **Rutas**: Agregar rutas en React Router

## Soporte

Si encuentras problemas:
1. Verifica los logs en la consola de desarrollo
2. Consulta la sección de solución de problemas
3. Crea un issue en el repositorio

## Licencia

MIT License - Ver archivo LICENSE para más detalles.