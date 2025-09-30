import React, { useState, useEffect } from 'react';
import Cliente from '../../models/Cliente';
import ClienteController from '../../controllers/ClienteController';
const Empresas = require('../../models/Empresas');
const EmpresasController = require('../../controllers/EmpresasController');
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';

// Componentes refactorizados
import ClientesList from './ClientesList';
import ClienteForm from './ClienteForm';
import EmpresasList from './EmpresasList';
import EmpresaForm from './EmpresaForm';
import ActionPanel from './ActionPanel';

const ClientesView = () => {
  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Gestión de Clientes';
  }, []);

  // Estados principales
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [currentView, setCurrentView] = useState('clientes'); // 'clientes' o 'empresas'
  const [loading, setLoading] = useState(true);
  
  // Estados de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const { modalState, showConfirm, showAlert } = useModal();

  // Helpers de diálogo basados en Modal
  const modalAlert = async (message, title = 'Información') => {
    try { await showAlert(message, title); }
    catch (_e) { alert(`${title}: ${message}`); }
  };

  // Selección de fila de cliente en la tabla
  const handleClienteRowClick = (cliente) => {
    setSelectedCliente(cliente);
  };

  const modalConfirm = async (message, title = 'Confirmación') => {
    try { return await showConfirm(message, title); }
    catch (_e) { return window.confirm(`${title}: ${message}`); }
  };
  

  // Cargar datos iniciales
  useEffect(() => {
    loadClientes();
  }, []);

  // Manejar eventos del menú
  useEffect(() => {
    const handleMenuEvent = (event, message) => {
      if (message === 'menu-ver-empresas') {
        setCurrentView('empresas');
        loadEmpresas();
      } else if (message === 'menu-ver-personas') {
        setCurrentView('clientes');
        loadClientes();
      }
    };

    if (window.electronAPI) {
      window.electronAPI.onMenuEvent(handleMenuEvent);
    }

    return () => {
      if (window.electronAPI && window.electronAPI.removeMenuListener) {
        window.electronAPI.removeMenuListener(handleMenuEvent);
      }
    };
  }, []);

  // Funciones de carga de datos
  const loadClientes = async () => {
    try {
      setLoading(true);
      const result = await Cliente.findAll();
      setClientes(result || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      setLoading(true);
      const result = await Empresas.findAll();
      setEmpresas(result || []);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  // Funciones de manejo de clientes
  const handleNewCliente = () => {
    setSelectedCliente(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditCliente = () => {
    if (selectedCliente) {
      setIsEditing(true);
      setShowForm(true);
    }
  };

  // Empresa handlers (faltantes)
  const handleNewEmpresa = () => {
    setSelectedEmpresa(null);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEditEmpresa = () => {
    if (selectedEmpresa) {
      setIsEditing(true);
      setShowForm(true);
    }
  };

  const handleDeleteCliente = async () => {
    if (!selectedCliente) return;
    // Verificar referencias para evitar error de FOREIGN KEY
    try{
      const codOrCed = selectedCliente.cedula || selectedCliente.cod;
      const qVenta = await window.electronAPI.dbGetSingle('SELECT COUNT(1) AS c FROM venta WHERE idcliente = ? OR idcliente = ?', [codOrCed, selectedCliente.cod]);
      const ventasCount = (qVenta.success && qVenta.data && Number(qVenta.data.c)) || 0;
      const qCred = await window.electronAPI.dbGetSingle('SELECT COUNT(1) AS c FROM credito WHERE idcliente = ? OR idcliente = ?', [codOrCed, selectedCliente.cod]);
      const credCount = (qCred.success && qCred.data && Number(qCred.data.c)) || 0;
      const qAb = await window.electronAPI.dbGetSingle('SELECT COUNT(1) AS c FROM abono WHERE idcliente = ? OR idcliente = ?', [codOrCed, selectedCliente.cod]);
      const abCount = (qAb.success && qAb.data && Number(qAb.data.c)) || 0;
      if(ventasCount + credCount + abCount > 0){
        await modalAlert(`No se puede eliminar el cliente porque tiene datos relacionados:
Ventas: ${ventasCount}
Créditos: ${credCount}
Abonos: ${abCount}

Anule o reasigne esos registros antes de eliminar.`, 'Operación no permitida');
        return;
      }
    }catch(_e){ /* si falla el prechequeo, seguimos con confirmación normal */ }

    const confirmed = await modalConfirm('¿Está seguro de eliminar este cliente?', 'Confirmación');
    if (!confirmed) return;
    try {
      await Cliente.delete(selectedCliente.cod);
      setSelectedCliente(null);
      await loadClientes();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      if(String(error?.message||'').includes('FOREIGN KEY')){
        await modalAlert('No se puede eliminar el cliente porque tiene registros relacionados (ventas, créditos, abonos, etc.).', 'Operación no permitida');
      } else {
        await modalAlert('Error al eliminar cliente', 'Error');
      }
    }
  };

  const handleSaveCliente = async (clienteData) => {
    try {
      setFormLoading(true);
      const clienteController = new ClienteController();
      let result;
      if (isEditing && selectedCliente) {
        result = await clienteController.updateCliente(selectedCliente.cod, clienteData);
      } else {
        result = await clienteController.createCliente(clienteData);
      }
      if (!result.success) {
        await modalAlert(result.message || 'No se pudo guardar el cliente', 'Error');
        return;
      }
      // Resetear estados del formulario
      setShowForm(false);
      setSelectedCliente(null);
      setIsEditing(false);
      // Recargar datos
      await loadClientes();
      // Emitir evento
      window.dispatchEvent(new CustomEvent('cliente-updated', { detail: clienteData }));
    } catch (error) {
      await modalAlert('Error al guardar cliente', 'Error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEmpresa = async () => {
    if (selectedEmpresa) {
      const confirmed = await modalConfirm('¿Está seguro de eliminar esta empresa?', 'Confirmación');
      if (confirmed) {
        try {
          await Empresas.delete(selectedEmpresa.id);
          setSelectedEmpresa(null);
          loadEmpresas();
        } catch (error) {
          console.error('Error al eliminar empresa:', error);
          await modalAlert('Error al eliminar empresa', 'Error');
        }
      }
    }
  };

  const handleSaveEmpresa = async (empresaData) => {
    try {
      setFormLoading(true);
      const empresaController = new EmpresasController();
      let result;
      if (isEditing && selectedEmpresa) {
        result = await empresaController.updateEmpresa(selectedEmpresa.id, empresaData);
      } else {
        result = await empresaController.createEmpresa(empresaData);
      }
      if (!result.success) {
        await modalAlert(result.message || 'No se pudo guardar la empresa', 'Error');
        return;
      }
      // Resetear estados del formulario
      setShowForm(false);
      setSelectedEmpresa(null);
      setIsEditing(false);
      // Recargar datos
      await loadEmpresas();
    } catch (error) {
      await modalAlert('Error al guardar empresa', 'Error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEmpresaRowClick = (empresa) => {
    setSelectedEmpresa(empresa);
  };

  // Funciones de navegación
  const handleToggleView = (view) => {
    if (view !== currentView) {
      setCurrentView(view);
      setSelectedCliente(null);
      setSelectedEmpresa(null);
      setShowForm(false);
      setIsEditing(false);
      
      if (view === 'empresas') {
        loadEmpresas();
      } else {
        loadClientes();
      }
    }
  };

  const handleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      // Si se está cerrando la búsqueda, limpiar el término y recargar datos
      setSearchTerm('');
      if (currentView === 'clientes') {
        loadClientes();
      } else {
        loadEmpresas();
      }
    }
  };

  const handleExit = () => {
    window.close();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedCliente(null);
    setSelectedEmpresa(null);
  };

  // Filtrar datos basándose en el término de búsqueda
  const filteredClientes = searchTerm
    ? clientes.filter(cliente => 
        cliente.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.cedula?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : clientes;

  const filteredEmpresas = searchTerm
    ? empresas.filter(empresa => 
        empresa.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        empresa.ruc?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : empresas;

  // Determinar qué elementos están seleccionados y qué funciones usar
  const isClientView = currentView === 'clientes';
  const selectedItem = isClientView ? selectedCliente : selectedEmpresa;
  const handleNew = isClientView ? handleNewCliente : handleNewEmpresa;
  const handleEdit = isClientView ? handleEditCliente : handleEditEmpresa;
  const handleDelete = isClientView ? handleDeleteCliente : handleDeleteEmpresa;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Panel izquierdo - Acciones */}
        <ActionPanel
          currentView={currentView}
          selectedItem={selectedItem}
          onNewClick={handleNew}
          onEditClick={handleEdit}
          onDeleteClick={handleDelete}
          onSearchClick={handleSearch}
          onExitClick={handleExit}
          onToggleView={handleToggleView}
          loading={loading || formLoading}
        />

        {/* Área central - Tabla */}
        <div className="flex-1 p-2 min-h-0 flex flex-col">
          {/* Barra de búsqueda */}
          {showSearch && (
            <div className="mb-2 p-2 bg-white rounded border border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  Buscar {currentView === 'clientes' ? 'cliente' : 'empresa'}:
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Ingrese nombre, cédula${currentView === 'empresas' ? ' o RUC' : ''}...`}
                  className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchTerm('');
                    if (currentView === 'clientes') {
                      loadClientes();
                    } else {
                      loadEmpresas();
                    }
                  }}
                  className="px-2 py-1 text-gray-500 hover:text-gray-700"
                  title="Cerrar búsqueda"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Tablas */}
          <div className="flex-1 min-h-0">
            {isClientView ? (
              <ClientesList
                clientes={filteredClientes}
                loading={loading}
                selectedCliente={selectedCliente}
                onRowClick={handleClienteRowClick}
                currentView={currentView}
              />
            ) : (
              <EmpresasList
                empresas={filteredEmpresas}
                loading={loading}
                selectedEmpresa={selectedEmpresa}
                onRowClick={handleEmpresaRowClick}
                currentView={currentView}
              />
            )}
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-900">
              {isClientView 
                ? (isEditing ? 'Editar Cliente' : showForm ? 'Nuevo Cliente' : 'Datos del cliente')
                : (isEditing ? 'Editar Empresa' : showForm ? 'Nueva Empresa' : 'Datos de la empresa')
              }
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {showForm ? (
              // Mostrar formulario
              isClientView ? (
                <ClienteForm
                  cliente={selectedCliente}
                  isEditing={isEditing}
                  onSave={handleSaveCliente}
                  onCancel={handleCancelForm}
                  loading={formLoading}
                  formActive={true}
                />
              ) : (
                <EmpresaForm
                  empresa={selectedEmpresa}
                  isEditing={isEditing}
                  onSave={handleSaveEmpresa}
                  onCancel={handleCancelForm}
                  loading={formLoading}
                  formActive={true}
                />
              )
            ) : (
              // Mostrar datos del elemento seleccionado
              <div className="p-2 text-xs text-gray-500">
                {selectedItem ? (
                  <div className="space-y-1">
                    {isClientView ? (
                      <>
                        <div><strong>Código:</strong> {selectedItem.cod}</div>
                        <div><strong>Nombres:</strong> {selectedItem.nombres}</div>
                        <div><strong>Apellidos:</strong> {selectedItem.apellidos}</div>
                        <div><strong>Teléfono:</strong> {selectedItem.telefono}</div>
                        <div><strong>Email:</strong> {selectedItem.email}</div>
                      </>
                    ) : (
                      <>
                        <div><strong>ID:</strong> {selectedItem.id}</div>
                        <div><strong>Nombre:</strong> {selectedItem.nombre}</div>
                        <div><strong>RUC:</strong> {selectedItem.ruc}</div>
                        <div><strong>Teléfono:</strong> {selectedItem.telefono}</div>
                        <div><strong>Email:</strong> {selectedItem.email}</div>
                      </>
                    )}
                  </div>
                ) : (
                  <div>Seleccione un elemento para ver sus datos</div>
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

export default ClientesView;