import React, { useState, useEffect } from 'react';

const ProductoDetails = ({ producto }) => {
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Función para validar si la imagen existe y es válida
  const validateImagePath = (path) => {
    if (!path || typeof path !== 'string') return false;
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1) return false;
    const extension = path.toLowerCase().slice(lastDotIndex);
    return validExtensions.includes(extension);
  };

  // Función para convertir ruta de Windows a URL para vista previa
  const getImageUrl = (path) => {
    if (imagePreview) return imagePreview;
    if (!path) return '';
    if (path.match(/^[A-Za-z]:\\/)) {
      return `file:///${path.replace(/\\/g, '/')}`;
    }
    return path;
  };

  // Efecto para cargar la imagen cuando cambie el producto
  useEffect(() => {
    const loadImagePreview = async () => {
      if (!producto?.foto || !validateImagePath(producto.foto)) {
        setImagePreview(null);
        return;
      }

      // En navegador web, si es solo un nombre de archivo, no intentar cargar
      if (!window.electronAPI && !producto.foto.startsWith('data:')) {
        setImagePreview(null);
        return;
      }

      // Si es una ruta absoluta de Windows y tenemos Electron API
      if (producto.foto.match(/^[A-Za-z]:\\/) && window.electronAPI?.readImageAsBase64) {
        try {
          setImageLoading(true);
          const result = await window.electronAPI.readImageAsBase64(producto.foto);
          
          if (result.success) {
            setImagePreview(result.data);
          } else {
            setImagePreview(null);
          }
        } catch (error) {
          console.error('Error cargando imagen en detalles:', error);
          setImagePreview(null);
        } finally {
          setImageLoading(false);
        }
      } else if (producto.foto.startsWith('data:')) {
        setImagePreview(producto.foto);
      } else {
        setImagePreview(getImageUrl(producto.foto));
      }
    };

    if (producto?.foto) {
      loadImagePreview();
    } else {
      setImagePreview(null);
    }
  }, [producto?.foto]);
  if (!producto) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="mb-4">
          <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-sm">Seleccione un producto para ver los detalles</p>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price || 0);
  };

  const isServiceProduct = producto.isservicio === '1';
  const hasIVA = producto.grabaiva === '1';
  const ivaPercentage = producto.iva_percentage || 12;
  const pvpWithIVA = hasIVA ? (producto.pvp * (1 + ivaPercentage / 100)) : producto.pvp;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800">Datos del producto</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          
          {/* Información básica */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Información Básica</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Código:</span>
                <span className="font-mono font-medium">{producto.codigo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Descripción:</span>
                <span className="font-medium text-right max-w-32 truncate" title={producto.producto}>
                  {producto.producto}
                </span>
              </div>
              {producto.codbarra && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cód. Barras:</span>
                  <span className="font-mono">{producto.codbarra}</span>
                </div>
              )}
              {producto.codaux && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Cód. Auxiliar:</span>
                  <span className="font-mono">{producto.codaux}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isServiceProduct 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {isServiceProduct ? 'Servicio' : 'Producto'}
                </span>
              </div>
            </div>
          </div>

          {/* Precios */}
          <div className="bg-white p-3 rounded border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Precios</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">P. Compra:</span>
                <span className="font-medium">{formatPrice(producto.pcompra)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">P.V.P. sin IVA:</span>
                <span className="font-medium">{formatPrice(producto.pvp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">P.V.P. con IVA:</span>
                <span className="font-medium text-green-600">{formatPrice(pvpWithIVA)}</span>
              </div>
              {producto.pmayorista > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">P. Mayorista:</span>
                  <span className="font-medium">{formatPrice(producto.pmayorista)}</span>
                </div>
              )}
              {producto.pconsignacion > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">P. Consignación:</span>
                  <span className="font-medium">{formatPrice(producto.pconsignacion)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">IVA:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  hasIVA ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {hasIVA ? `${producto.iva_percentage || 12}%` : 'No grava'}
                </span>
              </div>
            </div>
          </div>

          {/* Existencias */}
          {!isServiceProduct && (
            <div className="bg-white p-3 rounded border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Existencias</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Almacén:</span>
                  <span className="font-medium">{producto.almacen || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bodega 1:</span>
                  <span className="font-medium">{producto.bodega1 || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bodega 2:</span>
                  <span className="font-medium">{producto.bodega2 || 0}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Total:</span>
                    <span className="text-blue-600">
                      {(producto.almacen || 0) + (producto.bodega1 || 0) + (producto.bodega2 || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Control de stock */}
          {!isServiceProduct && (producto.minimo > 0 || producto.maximo > 0) && (
            <div className="bg-white p-3 rounded border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Control de Stock</h4>
              <div className="space-y-2 text-xs">
                {producto.minimo > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock mínimo:</span>
                    <span className="font-medium">{producto.minimo}</span>
                  </div>
                )}
                {producto.maximo > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock máximo:</span>
                    <span className="font-medium">{producto.maximo}</span>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* Imagen del producto */}
          {producto.foto && validateImagePath(producto.foto) && (
            <div className="bg-white p-3 rounded border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Imagen del Producto</h4>
              <div className="flex justify-center">
                {imageLoading ? (
                  <div className="flex items-center justify-center h-32 text-xs text-gray-500">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </div>
                ) : imagePreview ? (
                  <div className="cursor-pointer" onClick={() => {
                    setShowImageModal(true);
                  }}>
                    <img
                      src={imagePreview}
                      alt="Imagen del producto"
                      className="max-w-full max-h-32 object-contain border border-gray-200 rounded hover:shadow-md transition-shadow"
                      onError={(e) => {
                        setImagePreview(null);
                      }}
                      title="Haz clic para ampliar la imagen"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-xs text-gray-400 text-center p-2">
                    <div>
                      <svg className="w-8 h-8 mx-auto mb-1 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>Imagen no disponible</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {producto.foto}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal de imagen ampliada */}
      {showImageModal && imagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => {
            setShowImageModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowImageModal(false);
            }
          }}
          tabIndex={0}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <img
              src={imagePreview}
              alt={`Imagen de ${producto.producto || 'producto'}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => {
                setShowImageModal(false);
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full w-10 h-10 flex items-center justify-center text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductoDetails;
