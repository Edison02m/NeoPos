import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import TableModel from '../../components/TableModel';
import ActionPanel from './ActionPanel';
import InventarioFilter from './InventarioFilter';
import SearchFilter from '../../components/SearchFilter';

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [filteredInventario, setFilteredInventario] = useState([]);
  const [totales, setTotales] = useState({
    total_productos: 0,
    total_existencias: 0,
    total_invertido: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('todos');
  const [stockMinimo, setStockMinimo] = useState(5);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  
  // Estados para SearchFilter
  const [searchType, setSearchType] = useState('producto');
  const [searchValue, setSearchValue] = useState('');
  const [searchExactMatch, setSearchExactMatch] = useState(false);

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await window.electronAPI.dbQuery(`
        SELECT 
          codigo,
          producto as producto,
          almacen as existencia,
          pvp as precio_unitario,
          ROUND(almacen * pvp, 2) as precio_total
        FROM producto 
        WHERE almacen > 0
        ORDER BY producto ASC
      `);

      if (result.success) {
        setInventario(result.data);
        setFilteredInventario(result.data);
        
        // Calcular totales
        const totalProductos = result.data.length;
        const totalExistencias = result.data.reduce((sum, item) => sum + item.existencia, 0);
        const totalInvertido = result.data.reduce((sum, item) => sum + item.precio_total, 0);
        
        setTotales({
          total_productos: totalProductos,
          total_existencias: totalExistencias,
          total_invertido: Math.round(totalInvertido * 100) / 100
        });
      } else {
        throw new Error(result.error || 'Error al cargar inventario');
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setError('Error al cargar el inventario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    applyFilters(term, currentFilter, searchType, searchExactMatch);
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    applyFilters(searchTerm, filter, searchType, searchExactMatch);
  };

  const applyFilters = (term, filter, type = 'producto', exactMatch = false) => {
    let filtered = [...inventario];

    // Aplicar búsqueda por término y tipo
    if (term && term.trim()) {
      const searchPattern = exactMatch ? term : term.toLowerCase();
      
      filtered = filtered.filter(item => {
        let fieldValue = '';
        
        switch (type) {
          case 'producto':
            fieldValue = item.producto || '';
            break;
          case 'codbarra':
          case 'codaux':
            fieldValue = item.codigo || '';
            break;
          default:
            fieldValue = item.producto || '';
        }
        
        if (exactMatch) {
          return fieldValue === searchPattern;
        } else {
          return fieldValue.toLowerCase().includes(searchPattern);
        }
      });
    }

    // Aplicar filtro especial
    switch (filter) {
      case 'stock_bajo':
        filtered = filtered.filter(item => item.existencia <= stockMinimo);
        break;
      case 'alto_valor':
        filtered = filtered.filter(item => item.precio_total >= 100);
        break;
      case 'bajo_valor':
        filtered = filtered.filter(item => item.precio_total < 20);
        break;
      default:
        // 'todos' - no aplicar filtro adicional
        break;
    }

    setFilteredInventario(filtered);

    // Recalcular totales para productos filtrados
    const totalProductos = filtered.length;
    const totalExistencias = filtered.reduce((sum, item) => sum + item.existencia, 0);
    const totalInvertido = filtered.reduce((sum, item) => sum + item.precio_total, 0);
    
    setTotales({
      total_productos: totalProductos,
      total_existencias: totalExistencias,
      total_invertido: Math.round(totalInvertido * 100) / 100
    });
  };

  const handleExportReport = async () => {
    try {
      console.log('Datos filtrados:', filteredInventario.length);
      
      if (!filteredInventario || filteredInventario.length === 0) {
        alert('No hay datos para exportar. Verifique que haya productos en el inventario.');
        return;
      }

      const reportData = {
        title: 'Inventario de Existencias',
        data: filteredInventario.map(item => [
          item.codigo || '',
          item.producto || '',
          item.existencia?.toString() || '0',
          `$${parseFloat(item.precio_unitario || 0).toFixed(2)}`,
          `$${parseFloat(item.precio_total || 0).toFixed(2)}`
        ]),
        headers: ['Código', 'Producto', 'Stock', 'P. Unitario', 'P. Total'],
        footerTotals: {
          label: 'TOTALES',
          labelIndex: 1, // Columna "Producto"
          totals: {
            2: totales.total_existencias, // Columna "Stock"
            4: `$${totales.total_invertido.toFixed(2)}` // Columna "P. Total"
          }
        },
        stats: [
          `Total de productos: ${totales.total_productos}`,
          `Total existencias: ${totales.total_existencias} unidades`,
          `Valor total invertido: $${totales.total_invertido.toFixed(2)}`
        ]
      };

      console.log('Enviando datos al PDF:', reportData);

      // Generar reporte en PDF
      const pdfResult = await window.electronAPI.generatePDFReport(
        reportData,
        `inventario_${new Date().toISOString().split('T')[0]}`
      );

      if (pdfResult.success) {
        alert('Reporte PDF generado exitosamente');
      } else {
        throw new Error(pdfResult.error || 'Error desconocido al generar PDF');
      }
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte: ' + error.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const excelData = filteredInventario.map(item => ({
        'Código': item.codigo,
        'Producto': item.producto,
        'Existencia': item.existencia,
        'P. Unitario': item.precio_unitario,
        'P. Total': item.precio_total
      }));

      const result = await window.electronAPI.generateExcelReport(
        excelData,
        `inventario_${new Date().toISOString().split('T')[0]}.xlsx`,
        'Inventario'
      );

      if (result.success) {
        alert('Reporte Excel generado exitosamente');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error al generar Excel:', error);
      alert('Error al generar el reporte Excel: ' + error.message);
    }
  };

  const handleRefresh = () => {
    setSearchTerm('');
    setSearchValue('');
    setCurrentFilter('todos');
    setSearchType('producto');
    setSearchExactMatch(false);
    loadInventario();
  };

  const handleBuscar = () => {
    setShowSearchOverlay(true);
  };

  // Funciones para SearchFilter
  const handleSearchExecute = () => {
    setSearchTerm(searchValue);
    applyFilters(searchValue, currentFilter, searchType, searchExactMatch);
  };

  const handleSearchClear = () => {
    setSearchValue('');
    setSearchTerm('');
    setSearchType('producto');
    setSearchExactMatch(false);
    applyFilters('', currentFilter, 'producto', false);
  };

  const handleCloseSearch = () => {
    setShowSearchOverlay(false);
  };

  const handleSalir = async () => {
    try {
      console.log('Intentando cerrar ventana de inventario...');
      
      // Método 1: Usar WindowManager específico
      if (window.electronAPI && window.electronAPI.closeWindow) {
        console.log('Intentando con closeWindow(inventario)...');
        const result = await window.electronAPI.closeWindow('inventario');
        console.log('Resultado closeWindow:', result);
        return;
      }
      
      // Método 2: Usar closeCurrentWindow
      if (window.electronAPI && window.electronAPI.closeCurrentWindow) {
        console.log('Intentando con closeCurrentWindow...');
        const result = await window.electronAPI.closeCurrentWindow();
        console.log('Resultado closeCurrentWindow:', result);
        
        if (result && result.success) {
          return;
        }
      }
      
      // Método 3: Fallback tradicional
      console.log('Usando fallback window.close()...');
      if (window.close) {
        window.close();
      } else {
        console.error('No hay métodos disponibles para cerrar la ventana');
      }
      
    } catch (error) {
      console.error('Error al cerrar ventana:', error);
      // Último recurso
      if (window.close) {
        window.close();
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error al cargar inventario</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Content - Sin header */}
      <div className="flex flex-1 min-h-0">
        {/* Action Panel - Izquierda */}
        <div className="flex-shrink-0">
          <ActionPanel
            onBuscar={handleBuscar}
            onSalir={handleSalir}
            onRefresh={handleRefresh}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportReport}
          />
        </div>

        {/* Main Content - Centro */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          {/* Cuadro de búsqueda arriba de la tabla */}
          {showSearchOverlay && (
            <div className="mb-2 flex-shrink-0">
              <SearchFilter
                isVisible={showSearchOverlay}
                mode="search"
                type={searchType}
                value={searchValue}
                exactMatch={searchExactMatch}
                onTypeChange={setSearchType}
                onValueChange={setSearchValue}
                onExactMatchChange={setSearchExactMatch}
                onExecute={handleSearchExecute}
                onClear={handleSearchClear}
                loading={loading}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleCloseSearch}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-300 rounded-md transition-colors"
                >
                  <X size={16} className="inline mr-1" />
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Tabla de inventario */}
          <div className="flex-1 min-h-0">
            <TableModel
              title="Inventario de Productos"
              data={filteredInventario}
              loading={loading}
              columns={[
                {
                  key: 'codigo',
                  title: 'Código',
                  width: '100px',
                  fontFamily: 'mono'
                },
                {
                  key: 'producto',
                  title: 'Producto',
                  width: '300px'
                },
                {
                  key: 'existencia',
                  title: 'Stock',
                  width: '80px',
                  align: 'center',
                  fontFamily: 'mono',
                  render: (value, row) => {
                    const stock = parseInt(value) || 0;
                    const isLowStock = stock < 5;
                    return (
                      <div className={`flex items-center justify-center ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {isLowStock && (
                          <span className="mr-1 text-red-500" title="Stock bajo">⚠️</span>
                        )}
                        <span className={isLowStock ? 'font-semibold' : ''}>{stock}</span>
                      </div>
                    );
                  }
                },
                {
                  key: 'precio_unitario',
                  title: 'P. Unit.',
                  width: '100px',
                  align: 'right',
                  type: 'currency'
                },
                {
                  key: 'precio_total',
                  title: 'P. Total',
                  width: '100px',
                  align: 'right',
                  type: 'currency',
                  fontWeight: 'bold'
                }
              ]}
              emptyMessage="No hay productos en el inventario"
            />
          </div>
        </div>

        {/* Filters Panel - Derecha */}
        <div className="w-96 p-2 flex flex-col min-h-0 flex-shrink-0">
          <div className="flex-1 bg-white rounded border border-gray-200 overflow-hidden min-h-0">
            <div className="h-full overflow-y-auto">
              <InventarioFilter
                currentFilter={currentFilter}
                onFilterChange={handleFilterChange}
                stockMinimo={stockMinimo}
                onStockMinimoChange={setStockMinimo}
                totales={totales}
                productosCount={filteredInventario.length}
                searchTerm={searchTerm}
                onClearSearch={handleSearchClear}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventario;
