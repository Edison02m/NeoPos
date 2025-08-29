const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const DatabaseController = require('./controllers/DatabaseController');
const WindowManager = require('./windows/WindowManager');

class MainController {
  constructor() {
    this.mainWindow = null;
    this.databaseController = new DatabaseController();
    this.windowManager = new WindowManager();
  }

  async initializeApp() {
    try {
      await this.databaseController.initializeDatabase();
      this.createWindow();
      this.setupMenu(false); // Start with login menu
      this.setupIpcHandlers();
    } catch (error) {
      console.error('Error al inicializar la aplicación:', error);
    }
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../assets/images/icon.png'),
      show: false,
      titleBarStyle: 'default'
    });

    // Detectar automáticamente si estamos en desarrollo o producción
    const isDev = !app.isPackaged;
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      // Habilitar DevTools en desarrollo
      this.mainWindow.webContents.openDevTools();
    } else {
      // En producción, cargar el archivo HTML compilado por React
      this.mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      // Cerrar todas las ventanas secundarias antes de cerrar la principal
      this.windowManager.closeAllWindows();
      this.mainWindow = null;
      // No cerrar la base de datos aquí, se hace en window-all-closed
    });
  }

  setupMenu(isAuthenticated = false) {
    let template;

    if (isAuthenticated) {
      // Menu para usuarios autenticados con nueva estructura
      template = [
        {
          label: 'Inventario',
          submenu: [
            {
              label: 'Productos',
              accelerator: 'CmdOrCtrl+P',
              click: () => {
                this.windowManager.createProductoWindow(this.mainWindow);
              }
            },
            {
              label: 'Inventario',
              accelerator: 'CmdOrCtrl+I',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-stock');
              }
            },
            {
              label: 'Clientes',
              accelerator: 'CmdOrCtrl+C',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-customers');
              }
            },
            {
              label: 'Proveedores',
              accelerator: 'CmdOrCtrl+S',
              click: () => {
                this.mainWindow.webContents.send('menu-inventory-suppliers');
              }
            }
          ]
        },
        {
          label: 'Transacciones',
          submenu: [
            {
              label: 'Ventas',
              accelerator: 'CmdOrCtrl+V',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-sales');
              }
            },
            {
              label: 'Compras',
              accelerator: 'CmdOrCtrl+B',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-purchases');
              }
            },
            {
              label: 'Crédito',
              accelerator: 'CmdOrCtrl+R',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-credit');
              }
            },
            {
              label: 'Reservaciones',
              accelerator: 'CmdOrCtrl+E',
              click: () => {
                this.mainWindow.webContents.send('menu-transactions-reservations');
              }
            }
          ]
        },
        {
          label: 'Reportes',
          submenu: [
            {
              label: 'Reporte de Ventas',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-sales');
              }
            },
            {
              label: 'Reportes de Compras',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-purchases');
              }
            },
            {
              label: 'Productos Más Vendidos',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-top-products');
              }
            },
            {
              label: 'Declaraciones SRI',
              click: () => {
                this.mainWindow.webContents.send('menu-reports-sri-declarations');
              }
            }
          ]
        },
        {
          label: 'Configurar',
          submenu: [
            {
              label: 'Usuario',
              click: () => {
                this.mainWindow.webContents.send('menu-config-user');
              }
            },
            {
              label: 'Empresa',
              click: () => {
                this.mainWindow.webContents.send('menu-config-company');
              }
            },
            {
              label: 'Impresión de Facturas',
              click: () => {
                this.mainWindow.webContents.send('menu-config-invoice-printing');
              }
            }
          ]
        },
        {
          label: 'Utilitarios',
          submenu: [
            {
              label: 'Cierre de Caja',
              click: () => {
                this.mainWindow.webContents.send('menu-utilities-cash-closing');
              }
            },
            {
              label: 'Facturaciones',
              click: () => {
                this.mainWindow.webContents.send('menu-utilities-invoicing');
              }
            }
          ]
        },
        {
          label: 'Salir',
          submenu: [
            {
              label: 'Salir del Programa',
              accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
              click: () => {
                app.quit();
              }
            },
            {
              label: 'Cerrar Sesión',
              accelerator: 'CmdOrCtrl+L',
              click: () => {
                this.mainWindow.webContents.send('menu-logout');
              }
            }
          ]
        }
      ];
    } else {
      // Menu para usuarios no autenticados (solo login)
      template = [
        {
          label: 'Archivo',
          submenu: [
            {
              label: 'Salir',
              accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
              click: () => {
                app.quit();
              }
            }
          ]
        }
      ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    ipcMain.handle('db-initialize', async () => {
      try {
        if (!this.databaseController.isConnected()) {
          await this.databaseController.initializeDatabase();
        }
        return { success: true };
      } catch (error) {
        console.error('Error initializing database:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-query', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.executeQuery(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-get-single', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.getSingleRecord(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database single record error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('db-run', async (event, query, params = []) => {
      try {
        const result = await this.databaseController.runQuery(query, params);
        return { success: true, data: result };
      } catch (error) {
        console.error('Database run error:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Manejo de archivos
    ipcMain.handle('file-exists', async (event, filePath) => {
      try {
        const fs = require('fs').promises;
        await fs.access(filePath);
        return { success: true, exists: true };
      } catch (error) {
        return { success: true, exists: false };
      }
    });

    // Leer imagen como base64 para mostrar en la interfaz
    ipcMain.handle('read-image-as-base64', async (event, filePath) => {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
          return { success: false, error: 'Archivo no encontrado' };
        }

        // Verificar que es una imagen válida
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const ext = path.extname(filePath).toLowerCase();
        if (!validExtensions.includes(ext)) {
          return { success: false, error: 'Formato de imagen no válido' };
        }

        // Leer el archivo y convertir a base64
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Determinar el tipo MIME
        let mimeType = 'image/jpeg';
        switch (ext) {
          case '.png': mimeType = 'image/png'; break;
          case '.gif': mimeType = 'image/gif'; break;
          case '.bmp': mimeType = 'image/bmp'; break;
          case '.webp': mimeType = 'image/webp'; break;
        }

        return { 
          success: true, 
          data: `data:${mimeType};base64,${base64Image}`,
          mimeType: mimeType 
        };
      } catch (error) {
        console.error('Error reading image:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('quitApp', () => {
      app.quit();
    });

    // Menu state handlers
    ipcMain.handle('update-menu-authenticated', () => {
      this.setupMenu(true);
    });

    ipcMain.handle('update-menu-unauthenticated', () => {
      this.setupMenu(false);
    });

    // Window management handlers
    ipcMain.handle('open-users-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createUserWindow(this.mainWindow);
      return { success: true };
    });

    ipcMain.handle('open-empresa-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createEmpresaWindow(this.mainWindow);
      return { success: true };
    });

    ipcMain.handle('open-cliente-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createClienteWindow(this.mainWindow);
      return { success: true };
    });

    ipcMain.handle('open-proveedor-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createProveedorWindow(this.mainWindow);
      return { success: true };
    });

    ipcMain.handle('open-producto-window', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        return { success: false, error: 'Ventana principal no disponible' };
      }
      this.windowManager.createProductoWindow(this.mainWindow);
      return { success: true };
    });

    // Agregar listener para debugging de eventos de menú
    ipcMain.handle('debug-menu-event', (event, menuEvent) => {
      console.log('Debug: Simulando evento de menú:', menuEvent);
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(menuEvent);
        return { success: true };
      }
      return { success: false, error: 'Ventana no disponible' };
    });

    ipcMain.handle('close-window', (event, windowName) => {
      this.windowManager.closeWindow(windowName);
    });

    // Handler de autenticación
    ipcMain.handle('authenticate-user', async (event, usuario, contrasena) => {
      try {
        const bcrypt = require('bcrypt');
        
        // Buscar el usuario en la base de datos
        const query = 'SELECT * FROM usuario WHERE usuario = ?';
        const userResult = await this.databaseController.getSingleRecord(query, [usuario]);
        
        if (!userResult) {
          return { success: false, error: 'Usuario no encontrado' };
        }
        
        // Verificar la contraseña
        const isValid = await bcrypt.compare(contrasena, userResult.contrasena);
        
        if (!isValid) {
          return { success: false, error: 'Contraseña incorrecta' };
        }
        
        // Retornar los datos del usuario (sin la contraseña)
        const { contrasena: _, ...userData } = userResult;
        
        return { 
          success: true, 
          data: userData
        };
        
      } catch (error) {
        console.error('Error en autenticación:', error);
        return { success: false, error: error.message };
      }
    });

  // Handler para generar reportes en Excel/CSV
  ipcMain.handle('generate-excel-report', async (event, data, filename, sheetName) => {
      try {
        
        const fs = require('fs');
        const path = require('path');
        const { dialog } = require('electron');
        
        // Verificar que tenemos datos
        if (!data || data.length === 0) {
          return { success: false, error: 'No hay datos para generar el reporte' };
        }
        
        // Mostrar diálogo para guardar archivo
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Guardar reporte Excel/CSV',
          // Por defecto XLSX (abre perfecto en Excel)
          defaultPath: `${filename}.xlsx`,
          filters: [
            { name: 'Archivos Excel (.xlsx)', extensions: ['xlsx'] },
            { name: 'Archivos CSV (UTF-8)', extensions: ['csv'] }
          ]
        });
        
        if (result.canceled) {
          return { success: false, error: 'Operación cancelada por el usuario' };
        }
        
        const headers = Object.keys(data[0]);
        let targetPath = result.filePath;
        let ext = path.extname(targetPath).toLowerCase();
        if (!ext) {
          ext = '.xlsx';
          targetPath = `${targetPath}.xlsx`;
        }

        if (ext === '.xlsx') {
          // Generar XLSX real (soporta tildes/ñ correctamente)
          const XLSX = require('xlsx');
          const wb = XLSX.utils.book_new();
          const aoa = [headers, ...data.map(row => headers.map(h => row[h]))];
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Reporte').slice(0, 31));
          XLSX.writeFile(wb, targetPath);
          return { success: true, filePath: targetPath, message: 'Reporte XLSX generado exitosamente' };
        }

        // Generar CSV en UTF-8 con BOM y separador ";" (excel-español)
        const delimiter = ';';
        const csvHeaders = headers.join(delimiter);
        const csvRows = data.map(row =>
          headers
            .map(header => {
              const value = row[header];
              const stringValue = String(value ?? '');
              if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(delimiter)
        );
        const csvContent = [csvHeaders, ...csvRows].join('\n');
        const bom = '\ufeff'; // UTF-8 BOM para que Excel detecte la codificación
        // Normalizar la extensión a .csv si no lo es
        if (ext !== '.csv') targetPath = targetPath.replace(/\.[^.]+$/i, '.csv');
        fs.writeFileSync(targetPath, bom + csvContent, 'utf8');
        return { success: true, filePath: targetPath, message: 'Reporte CSV (UTF-8) generado exitosamente' };
        
      } catch (error) {
        console.error('❌ Error generando reporte:', error);
        return { success: false, error: error.message };
      }
    });

    // Handler para generar reportes en PDF con tabla (PDFKit)
  ipcMain.handle('generate-pdf-report', async (event, reportData, filename) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const { dialog } = require('electron');
        const PDFDocument = require('pdfkit');
        
        // Verificar que tenemos datos
        if (!reportData || !reportData.data || reportData.data.length === 0) {
          return { success: false, error: 'No hay datos para generar el reporte' };
        }
        
        // Mostrar diálogo para guardar archivo
        const result = await dialog.showSaveDialog(this.mainWindow, {
          title: 'Guardar reporte PDF',
          defaultPath: `${filename}.pdf`,
          filters: [
            { name: 'Archivos PDF', extensions: ['pdf'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ]
        });
        
        if (result.canceled) {
          return { success: false, error: 'Operación cancelada por el usuario' };
        }
        
        const pdfPath = path.extname(result.filePath).toLowerCase() === '.pdf' 
          ? result.filePath 
          : `${result.filePath}.pdf`;

        const headers = reportData.headers || [];
        const rows = reportData.data || [];
  const isWide = headers.length >= 6;

        // Crear documento PDF (usar horizontal si hay muchas columnas)
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: isWide ? 'landscape' : 'portrait' });
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

      // Configurar colores y fuentes (estilo clásico)
      const primaryColor = '#111827';  // Negro/gris muy oscuro
      const secondaryColor = '#6b7280'; // Gris
      const borderColor = '#d1d5db';   // Gris claro
      const headerBg = '#ffffff';      // Blanco

      // Encabezado centrado tipo ejemplo
      const titleText = reportData.title || 'REPORTE DE PRODUCTOS';
      doc.font('Helvetica-Bold').fontSize(18).fillColor(primaryColor)
        .text(titleText, { align: 'center' });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10).fillColor(secondaryColor)
        .text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, { align: 'center' });

      // Espacio después del encabezado
      doc.moveDown(1.0);
      doc.y = doc.y + 5;

        // Dibujo de tabla con estilo mejorado
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const startX = doc.page.margins.left;
        let y = doc.y + 20;
        const colCount = headers.length || 1;
        
        // Asignación de anchos: distribución amigable por encabezado
        let widths = new Array(colCount).fill(1);
        const norm = (s) => String(s || '').toLowerCase();
        headers.forEach((h, i) => {
          const t = norm(h);
          if (t.includes('producto')) widths[i] = 2.8;
          else if (t.includes('código') || t.includes('codigo')) widths[i] = 1.4;
          else if (t.includes('barras')) widths[i] = 1.5;
          else if (t.includes('p. venta') || t.includes('p.  venta') || t.includes('venta')) widths[i] = 1.2;
          else if (t === 'iva') widths[i] = 0.9;
          else if (t.includes('existencia')) widths[i] = 1.1;
        });
        const totalUnits = widths.reduce((a,b)=>a+b,0);
        let colWidth = widths.map(w => (pageWidth * w) / totalUnits);

        // Enforce mínimos por columna para evitar desbordes
        const headerAt = (i) => norm(headers[i] || '');
        const minFor = (i) => {
          const t = headerAt(i);
          if (t.includes('producto')) return 180;
          if (t.includes('código') || t.includes('codigo')) return 70;
          if (t.includes('barras')) return 100;
          if (t.includes('p. venta') || t.includes('venta')) return 75;
          if (t === 'iva') return 50;
          if (t.includes('existencia')) return 60;
          return 60;
        };
        // Ajustar tomando ancho del mayor (preferentemente 'producto')
        const productoIdx = headers.findIndex(h => /producto/i.test(h));
        for (let i = 0; i < colWidth.length; i++) {
          const min = minFor(i);
          if (colWidth[i] < min) {
            const need = min - colWidth[i];
            let donor = productoIdx !== -1 ? productoIdx : colWidth.indexOf(Math.max(...colWidth));
            if (donor === i) donor = colWidth.indexOf(Math.max(...colWidth.filter((_,j)=>j!==i)));
            if (donor !== -1 && donor !== i && colWidth[donor] - need > minFor(donor) - 10) {
              colWidth[donor] -= need;
              colWidth[i] = min;
            } else {
              colWidth[i] = min; // en peor caso, solo garantizamos mínimo
            }
          }
        }

        // Encabezados abreviados para reducir cortes
        const abbreviate = (h) => {
          const t = norm(h);
          if (t.includes('existencia')) return 'Exist.';
          if (t.includes('código') || t.includes('codigo')) return 'Código';
          if (t.includes('barras')) return 'Cód. Barras';
          if (t.includes('p. venta') || t.includes('venta')) return 'P. Venta';
          if (t === 'iva') return 'IVA';
          if (t.includes('producto')) return 'Producto';
          return h;
        };
        const displayedHeaders = headers.map(abbreviate);

        // Utilidad: truncar texto para que encaje en el ancho de la celda
        const truncateToFit = (text, maxWidth, isBold) => {
          const originalFont = isBold ? 'Helvetica-Bold' : 'Helvetica';
          doc.font(originalFont);
          let s = String(text ?? '');
          if (doc.widthOfString(s) <= maxWidth) return s;
          const ellipsis = '…';
          while (s.length > 0 && doc.widthOfString(s + ellipsis) > maxWidth) {
            s = s.slice(0, -1);
          }
          return s.length ? s + ellipsis : '';
        };

        const drawRow = (cells, isHeader = false, isTotal = false) => {
          // Calcular altura de fila en función del texto envuelto
          const heights = cells.map((cell, i) => {
            const text = String(cell ?? '');
            const w = Array.isArray(colWidth) ? colWidth[i] : colWidth;
            return doc.heightOfString(text, { width: w - 12 });
          });
          const rowHeight = Math.max(isHeader ? 40 : 26, Math.max(...heights) + 12);

          // Salto de página si no entra
          if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 50) {
            doc.addPage();
            y = doc.page.margins.top + 20;
            // Redibujar encabezado al cambiar de página
            if (headers.length && !isHeader) {
              drawRow(headers, true);
            }
          }

          // Fondo de encabezado (línea superior) y fila total sutil
            if (isHeader) {
              // Banda suave de encabezado + línea superior
              doc.save();
              doc.rect(startX, y, pageWidth, rowHeight).fill('#f3f4f6');
              doc.restore();
              doc.save();
              doc.moveTo(startX, y)
                 .lineTo(startX + pageWidth, y)
                 .lineWidth(1)
                 .stroke(primaryColor);
              doc.restore();
            }
            if (isTotal) {
              doc.save();
              doc.rect(startX, y, pageWidth, rowHeight)
                 .fill('#f9fafb');
              doc.restore();
            }

          // Bordes y texto
          let x = startX;
          for (let i = 0; i < cells.length; i++) {
            const w = Array.isArray(colWidth) ? colWidth[i] : colWidth;
            
            // Borde de celda con líneas finas
            doc.rect(x, y, w, rowHeight).stroke(borderColor);
            
            const text = String(cells[i] ?? '');
            const numeric = !isNaN(Number(text
              .replace(/\./g,'')
              .replace(/,/g,'.')
              .replace(/[^0-9.\-]/g,'')));
            const align = isHeader ? 'center' : (numeric ? 'right' : 'left');
            
            // Configurar fuente y color
        doc.font(isHeader || isTotal ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(isHeader ? 11 : 9.5)
          .fillColor(primaryColor);
            
            // Posicionar texto con mejor espaciado
            const textX = x + 8; // siempre desde el inicio de la celda con padding
            const textY = y + (rowHeight - doc.currentLineHeight()) / 2;

            // Evitar desbordes forzando clip al área de la celda
            doc.save();
            doc.rect(x, y, w, rowHeight).clip();
            const fitted = truncateToFit(text, w - 16, isHeader || isTotal);
            doc.text(fitted, textX, textY, {
              width: w - 16,
              align: align
            });
            doc.restore();
            
            x += w;
          }
          y += rowHeight + 2; // pequeño espacio entre filas
        };

  if (headers.length) drawRow(displayedHeaders, true);
        rows.forEach(r => drawRow(r, false));

        // Fila de totales (si viene definida explícitamente)
        if (reportData.footerTotals) {
       // Línea separadora antes de totales
       doc.save();
       doc.moveTo(startX, y)
         .lineTo(startX + pageWidth, y)
         .stroke(primaryColor);
       doc.restore();
          y += 10;
          
          const { label = 'TOTAL GENERAL', labelIndex = Math.max(0, colCount - 2), totals = {} } = reportData.footerTotals;
          const cells = new Array(colCount).fill('');
          cells[labelIndex] = label;
          Object.keys(totals).forEach(k => {
            const idx = Number(k);
            const val = totals[k];
            const formatted = typeof val === 'number'
              ? val.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : String(val);
            cells[idx] = formatted;
          });
          drawRow(cells, false, true);
        }

        // Resumen/estadísticas con mejor diseño
        if (reportData.stats && reportData.stats.length) {
          y += 30;
          
          // Caja para estadísticas
          const statsHeight = reportData.stats.length * 18 + 30;
          doc.save();
          doc.rect(startX, y, pageWidth, statsHeight)
             .fill('#f8fafc')
             .stroke(borderColor);
          doc.restore();
          
       doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor)
         .text('Resumen del Reporte', startX + 15, y + 15);
          
          y += 35;
          reportData.stats.forEach(stat => {
            doc.font('Helvetica').fontSize(10).fillColor('#374151')
               .text(`• ${stat}`, startX + 20, y);
            y += 18;
          });
        }

        // Pie de página
        const footerY = doc.page.height - doc.page.margins.bottom;
        doc.save();
        doc.moveTo(startX, footerY - 20)
           .lineTo(startX + pageWidth, footerY - 20)
           .stroke(borderColor);
        doc.restore();
        
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor)
           .text('Generado por NeoPos - Sistema de Gestión', startX, footerY - 15, { align: 'center' });
        doc.text(`Página ${doc.bufferedPageRange().start + 1}`, startX, footerY - 5, { align: 'center' });

        // Finalizar y esperar a que se escriba el archivo
        await new Promise((resolve, reject) => {
          stream.on('finish', resolve);
          stream.on('error', reject);
          doc.end();
        });

        return { success: true, filePath: pdfPath, message: 'Reporte PDF generado exitosamente' };
        
      } catch (error) {
        console.error('❌ Error generando reporte PDF:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

const mainController = new MainController();

app.whenReady().then(() => {
  mainController.initializeApp();
});

app.on('window-all-closed', async () => {
  console.log('Todas las ventanas cerradas, iniciando proceso de limpieza...');
  
  try {
    // Cerrar todas las ventanas secundarias si aún están abiertas
    if (mainController.windowManager) {
      mainController.windowManager.closeAllWindows();
    }
    
    // Cerrar la base de datos antes de salir
    if (mainController.databaseController) {
      console.log('Cerrando conexión a la base de datos...');
      await mainController.databaseController.close();
    }
    
    console.log('Proceso de limpieza completado');
  } catch (error) {
    console.error('Error durante el proceso de limpieza:', error);
    // Forzar el cierre si hay un error
    if (mainController.databaseController) {
      mainController.databaseController.forceClose();
    }
  } finally {
    // En todas las plataformas, cerrar la aplicación cuando se cierren todas las ventanas
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainController.createWindow();
  }
});

// Manejo adicional para asegurar que la base de datos se cierre antes de salir
app.on('before-quit', async (event) => {
  if (mainController.databaseController && mainController.databaseController.isConnected()) {
    event.preventDefault(); // Prevenir el cierre inmediato
    
    try {
      console.log('Cerrando conexiones de base de datos antes de salir...');
      await mainController.databaseController.close();
      console.log('Base de datos cerrada correctamente');
      app.quit(); // Salir después del cierre limpio
    } catch (error) {
      console.error('Error al cerrar la base de datos:', error);
      mainController.databaseController.forceClose();
      app.quit(); // Salir incluso si hay error
    }
  }
});