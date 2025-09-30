import React, { useState, useEffect } from 'react';
import Proveedor from '../../models/Proveedor';
import ProveedorController from '../../controllers/ProveedorController';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';

// Componentes
import ProveedoresList from './ProveedoresList';
import ProveedorForm from './ProveedorForm';
import ActionPanel from './ActionPanel';

const ProveedoresView = () => {
  // document.title eliminado: control centralizado en WindowManager

  // Estados principales
  const [proveedores, setProveedores] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const { modalState, showConfirm, showAlert } = useModal();

  // Helpers de diálogo basados en Modal personalizado, con restauración de foco
  const tryFocus = (el) => {
    if (!el) return false;
    if (el.disabled || el.readOnly) return false;
    if (el.offsetParent === null && el !== document.body) return false; // not visible
    if (typeof el.focus === 'function') {
      el.focus();
      try {
        if (el.setSelectionRange && typeof el.value === 'string') {
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      } catch (_) {}
      return document.activeElement === el;
    }
    return false;
  };

  const getFirstFocusable = (root = document) => {
    const sel = 'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable="true"], button:not([disabled])';
    const list = Array.from(root.querySelectorAll(sel));
    return list.find(el => el.offsetParent !== null) || null;
  };

  const restoreFocus = (last) => {
    // Bring window to front
    try { window?.focus?.(); } catch (_) {}
    const container = (last && last.closest && last.closest('form')) || document;
    const candidate = (last && document.contains(last) && !last.disabled && last.offsetParent !== null) ? last : getFirstFocusable(container);
    const doRestore = () => {
      if (!tryFocus(candidate)) {
        // fallback to any focusable in document
        tryFocus(getFirstFocusable(document));
      }
    };
    // Two-phase restore to win over Electron timing
    setTimeout(doRestore, 0);
  };

  // Helpers basados en Modal (useModal)
  const modalAlert = async (message, title = 'Información') => {
    const lastEl = typeof document !== 'undefined' ? document.activeElement : null;
    try {
      await showAlert(message, title);
    } catch (_e) {
      alert(`${title}: ${message}`);
    } finally {
      restoreFocus(lastEl);
    }
  };

  const modalConfirm = async (message, title = 'Confirmación') => {
    const lastEl = typeof document !== 'undefined' ? document.activeElement : null;
    try {
      return await showConfirm(message, title);
    } catch (_e) {
      return window.confirm(`${title}: ${message}`);
    } finally {
      restoreFocus(lastEl);
    }
  };
  
  // Cargar datos iniciales
  useEffect(() => {
    loadProveedores();
  }, []);

  // Funciones de carga de datos
  const loadProveedores = async () => {
    try {
      setLoading(true);
      const result = await Proveedor.findAll();
      setProveedores(result || []);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de manejo de proveedores
  const handleNewProveedor = () => {
    setSelectedProveedor(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditProveedor = () => {
    if (selectedProveedor) {
      setIsEditing(true);
      setShowForm(true);
    }
  };

  const handleDeleteProveedor = async () => {
    if (!selectedProveedor) return;
    const confirmed = await modalConfirm('¿Está seguro de eliminar este proveedor?', 'Confirmación');
    if (!confirmed) return;
    try {
      await Proveedor.delete(selectedProveedor.cod);
      setSelectedProveedor(null);
      await loadProveedores();
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      const msg = String(error?.message||'');
      if (msg.includes('FOREIGN KEY')) {
        await modalAlert('No se puede eliminar el proveedor porque tiene registros relacionados.', 'Operación no permitida');
      } else {
        await modalAlert('Error al eliminar proveedor', 'Error');
      }
    }
  };

  const handleSaveProveedor = async (proveedorData) => {
    try {
      setFormLoading(true);
      
      const proveedorController = new ProveedorController();
      let result;
      
      if (isEditing && selectedProveedor) {
        result = await proveedorController.updateProveedor(selectedProveedor.cod, proveedorData);
      } else {
        result = await proveedorController.createProveedor(proveedorData);
      }
      
      if (!result.success) {
        setFormLoading(false);
        await modalAlert(result.message || 'No se pudo guardar el proveedor', 'Error');
        return;
      }
      
      // Resetear estados del formulario
      setShowForm(false);
      setSelectedProveedor(null);
      setIsEditing(false);
      setFormLoading(false);
      
      // Recargar datos
      await loadProveedores();
      
      // Emitir evento para notificar que los datos de proveedor se actualizaron
      window.dispatchEvent(new CustomEvent('proveedor-updated', { detail: proveedorData }));
    } catch (error) {
      setFormLoading(false);
      await modalAlert('Error al guardar proveedor', 'Error');
    }
  };

  const handleProveedorRowClick = (proveedor) => {
    setSelectedProveedor(proveedor);
  };

  const handleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      // Si se está cerrando la búsqueda, limpiar el término y recargar datos
      setSearchTerm('');
      loadProveedores();
    }
  };

  const handleExit = () => {
    window.close();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedProveedor(null);
  };

  // Filtrar datos basándose en el término de búsqueda
  const filteredProveedores = searchTerm
    ? proveedores.filter(proveedor => 
        proveedor.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proveedor.ruc?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : proveedores;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Panel izquierdo - Acciones */}
        <ActionPanel
          selectedItem={selectedProveedor}
          onNewClick={handleNewProveedor}
          onEditClick={handleEditProveedor}
          onDeleteClick={handleDeleteProveedor}
          onSearchClick={handleSearch}
          onExitClick={handleExit}
          loading={loading || formLoading}
        />

        {/* Área central - Tabla */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          {/* Barra de búsqueda */}
          {showSearch && (
            <div className="mb-2 p-2 bg-white rounded border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  Buscar proveedor:
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ingrese empresa o RUC..."
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchTerm('');
                    loadProveedores();
                  }}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700"
                  title="Cerrar búsqueda"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Tabla */}
          <div className="flex-1 min-h-0">
            <ProveedoresList
              proveedores={filteredProveedores}
              loading={loading}
              selectedProveedor={selectedProveedor}
              onRowClick={handleProveedorRowClick}
            />
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-900">
              {isEditing ? 'Editar Proveedor' : showForm ? 'Nuevo Proveedor' : 'Datos del proveedor'}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {showForm ? (
              // Mostrar formulario
              <ProveedorForm
                proveedor={selectedProveedor}
                isEditing={isEditing}
                onSave={handleSaveProveedor}
                onCancel={handleCancelForm}
                loading={formLoading}
                formActive={true}
              />
            ) : (
              // Mostrar datos del elemento seleccionado
              <div className="p-2 text-xs text-gray-500">
                {selectedProveedor ? (
                  <div className="space-y-1">
                    <div><strong>Código:</strong> {selectedProveedor.cod}</div>
                    <div><strong>Empresa:</strong> {selectedProveedor.empresa}</div>
                    <div><strong>Dirección:</strong> {selectedProveedor.direccion}</div>
                    <div><strong>Teléfono:</strong> {selectedProveedor.telefono}</div>
                    <div><strong>Fax:</strong> {selectedProveedor.fax}</div>
                    <div><strong>Ciudad:</strong> {selectedProveedor.ciudad}</div>
                    <div><strong>Representante:</strong> {selectedProveedor.representante}</div>
                    <div><strong>Email:</strong> {selectedProveedor.mail}</div>
                    <div><strong>RUC:</strong> {selectedProveedor.ruc}</div>
                    <div><strong>Tipo ID:</strong> {selectedProveedor.tipoid}</div>
                    <div><strong>Relacionado:</strong> {selectedProveedor.relacionado}</div>
                    <div><strong>Trial279:</strong> {selectedProveedor.trial279}</div>
                  </div>
                ) : (
                  <div>Seleccione un proveedor para ver sus datos</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onClose}
      />
    </div>
  );
};

export default ProveedoresView;