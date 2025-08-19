import React, { useState, useEffect } from 'react';
import Cliente from '../models/Cliente';
import ClienteController from '../controllers/ClienteController';
const Empresas = require('../models/Empresas');
const EmpresasController = require('../controllers/EmpresasController');
import Modal from '../components/Modal';
import TableModel from '../components/TableModel';
import useModal from '../hooks/useModal';

const Clientes = () => {
  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Gestión de Clientes';
  }, []);
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState(null);
  const [currentView, setCurrentView] = useState('clientes'); // 'clientes' o 'empresas'
  const [formData, setFormData] = useState({
    tratamiento: '',
    apellidos: '',
    nombres: '',
    direccion: '',
    telefono: '',
    cedula: '',
    referencias: '',
    email: '',
    relacionado: '',
    trial272: ''
  });
  const [empresaFormData, setEmpresaFormData] = useState({
    nombre: '',
    ruc: '',
    razon_social: '',
    direccion: '',
    telefono: '',
    fax: '',
    email: '',
    pagina_web: '',
    representante: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { modalState, showConfirm, showAlert, closeModal } = useModal();

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

  const loadClientesOriginal = async () => {
    try {
      setLoading(true);
      const clientesData = await Cliente.findAll();
      setClientes(clientesData || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedCliente(null);
    setFormActive(true);
    setFormData({
      tratamiento: '',
      apellidos: '',
      nombres: '',
      direccion: '',
      telefono: '',
      cedula: '',
      referencias: '',
      email: '',
      relacionado: '',
      trial272: ''
    });
  };

  const handleEdit = () => {
    if (selectedCliente) {
      setIsEditing(true);
      setIsCreating(false);
      setFormActive(true);
      setFormData({
        tratamiento: selectedCliente.tratamiento || '',
        apellidos: selectedCliente.apellidos || '',
        nombres: selectedCliente.nombres || '',
        direccion: selectedCliente.direccion || '',
        telefono: selectedCliente.telefono || '',
        cedula: selectedCliente.cedula || '',
        referencias: selectedCliente.referencias || '',
        email: selectedCliente.email || '',
        relacionado: selectedCliente.relacionado || '',
        trial272: selectedCliente.trial272 || ''
      });
    }
  };

  const handleDelete = async () => {
    if (selectedCliente) {
      const confirmed = await showConfirm('¿Está seguro de eliminar este cliente?');
      if (confirmed) {
        try {
          await Cliente.delete(selectedCliente.cod);
          setSelectedCliente(null);
          loadClientes();
        } catch (error) {
          console.error('Error al eliminar cliente:', error);
          await showAlert('Error al eliminar cliente');
        }
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Crear objeto con solo los campos necesarios, excluyendo cod
      const clienteData = {
        tratamiento: formData.tratamiento || '',
        apellidos: formData.apellidos,
        nombres: formData.nombres,
        direccion: formData.direccion || '',
        telefono: formData.telefono || '',
        cedula: formData.cedula || '',
        referencias: formData.referencias || '',
        email: formData.email || '',
        relacionado: formData.relacionado || '',
        trial272: formData.trial272 || ''
      };
      
      const clienteController = new ClienteController();
      let result;
      
      if (isEditing && selectedCliente) {
        result = await clienteController.updateCliente(selectedCliente.cod, clienteData);
      } else {
        result = await clienteController.createCliente(clienteData);
      }
      
      if (!result.success) {
        await showAlert(result.message);
        return;
      }
      
      setSelectedCliente(null);
      setIsEditing(false);
      setIsCreating(false);
      setFormActive(false);
      loadClientes();
      setFormData({
        tratamiento: '',
        apellidos: '',
        nombres: '',
        direccion: '',
        telefono: '',
        cedula: '',
        referencias: '',
        email: '',
        relacionado: '',
        trial272: ''
      });
      
      // Emitir evento para notificar que los datos de cliente se actualizaron
      window.dispatchEvent(new CustomEvent('cliente-updated', { detail: clienteData }));
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      await showAlert('Error al guardar cliente');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRowClick = (cliente) => {
    setSelectedCliente(cliente);
    setIsEditing(false);
    setIsCreating(false);
    setFormActive(false);
  };

  // Funciones para manejar empresas
  const handleNewEmpresa = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedEmpresa(null);
    setFormActive(true);
    setEmpresaFormData({
      nombre: '',
      ruc: '',
      razon_social: '',
      direccion: '',
      telefono: '',
      fax: '',
      email: '',
      pagina_web: '',
      representante: ''
    });
  };

  const handleEditEmpresa = () => {
    if (selectedEmpresa) {
      setIsEditing(true);
      setIsCreating(false);
      setFormActive(true);
      setEmpresaFormData({
        nombre: selectedEmpresa.nombre || '',
        ruc: selectedEmpresa.ruc || '',
        razon_social: selectedEmpresa.razon_social || '',
        direccion: selectedEmpresa.direccion || '',
        telefono: selectedEmpresa.telefono || '',
        fax: selectedEmpresa.fax || '',
        email: selectedEmpresa.email || '',
        pagina_web: selectedEmpresa.pagina_web || '',
        representante: selectedEmpresa.representante || ''
      });
    }
  };

  const handleDeleteEmpresa = async () => {
    if (selectedEmpresa) {
      const confirmed = await showConfirm('¿Está seguro de eliminar esta empresa?');
      if (confirmed) {
        try {
          await Empresas.delete(selectedEmpresa.id);
          setSelectedEmpresa(null);
          loadEmpresas();
        } catch (error) {
          console.error('Error al eliminar empresa:', error);
          await showAlert('Error al eliminar empresa');
        }
      }
    }
  };

  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    try {
      const empresaData = {
        nombre: empresaFormData.nombre,
        ruc: empresaFormData.ruc,
        razon_social: empresaFormData.razon_social || '',
        direccion: empresaFormData.direccion || '',
        telefono: empresaFormData.telefono || '',
        fax: empresaFormData.fax || '',
        email: empresaFormData.email || '',
        pagina_web: empresaFormData.pagina_web || '',
        representante: empresaFormData.representante || ''
      };
      
      const empresaController = new EmpresasController();
      let result;
      
      if (isEditing && selectedEmpresa) {
        result = await empresaController.updateEmpresa(selectedEmpresa.id, empresaData);
      } else {
        result = await empresaController.createEmpresa(empresaData);
      }
      
      if (!result.success) {
        await showAlert(result.message);
        return;
      }
      
      setSelectedEmpresa(null);
      setIsEditing(false);
      setIsCreating(false);
      setFormActive(false);
      loadEmpresas();
      setEmpresaFormData({
        nombre: '',
        ruc: '',
        razon_social: '',
        direccion: '',
        telefono: '',
        fax: '',
        email: '',
        pagina_web: '',
        representante: ''
      });
    } catch (error) {
      console.error('Error al guardar empresa:', error);
      await showAlert('Error al guardar empresa');
    }
  };

  const handleEmpresaInputChange = (e) => {
    const { name, value } = e.target;
    setEmpresaFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmpresaRowClick = (empresa) => {
    setSelectedEmpresa(empresa);
    setIsEditing(false);
    setIsCreating(false);
    setFormActive(false);
  };

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: 'cod',
      title: 'Núm.',
      width: '16',
      fontFamily: 'mono',
      cellClassName: 'text-gray-600'
    },
    {
      key: 'tratamiento',
      title: 'Trat.',
      width: '20'
    },
    {
      key: 'apellidos',
      title: 'Apellidos',
      width: '32',
      fontWeight: 'bold',
      showTooltip: true
    },
    {
      key: 'nombres',
      title: 'Nombres',
      width: '32',
      showTooltip: true,
      cellClassName: 'text-gray-900'
    },
    {
      key: 'direccion',
      title: 'Dirección',
      width: '40',
      showTooltip: true
    },
    {
      key: 'telefono',
      title: 'Teléfono',
      width: '24'
    },
    {
      key: 'cedula',
      title: 'Cédula/RUC',
      width: '28',
      fontFamily: 'mono'
    },
    {
      key: 'tipo',
      title: 'Tipo',
      width: '16',
      align: 'center'
    },
    {
      key: 'limite',
      title: 'Límite',
      width: '20',
      type: 'currency',
      align: 'right'
    },
    {
      key: 'referencias',
      title: 'Referencias',
      width: '32',
      showTooltip: true
    },
    {
      key: 'email',
      title: 'E-mail',
      width: '40',
      showTooltip: true
    },
    {
      key: 'tipoid',
      title: 'TID',
      width: '16',
      align: 'center'
    },
    {
      key: 'relacionado',
      title: 'Relac.',
      width: '20',
      align: 'center'
    },
    {
      key: 'trial272',
      title: 'T272',
      width: '16',
      align: 'center'
    }
  ];

  // Configuración de columnas para la tabla de empresas
  const empresasColumns = [
    {
      key: 'id',
      title: 'ID',
      width: '16',
      fontFamily: 'mono',
      cellClassName: 'text-gray-600'
    },
    {
      key: 'nombre',
      title: 'Nombre',
      width: '40',
      fontWeight: 'bold',
      showTooltip: true
    },
    {
      key: 'ruc',
      title: 'RUC',
      width: '28',
      fontFamily: 'mono'
    },
    {
      key: 'razon_social',
      title: 'Razón Social',
      width: '40',
      showTooltip: true
    },
    {
      key: 'direccion',
      title: 'Dirección',
      width: '40',
      showTooltip: true
    },
    {
      key: 'telefono',
      title: 'Teléfono',
      width: '24'
    },
    {
      key: 'fax',
      title: 'Fax',
      width: '24'
    },
    {
      key: 'email',
      title: 'E-mail',
      width: '40',
      showTooltip: true
    },
    {
      key: 'pagina_web',
      title: 'Página Web',
      width: '40',
      showTooltip: true
    },
    {
      key: 'representante',
      title: 'Representante',
      width: '32',
      showTooltip: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      
      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Panel izquierdo - Acciones */}
      <div className="w-12 bg-white border-r border-gray-200 py-2">
        <div className="space-y-1 px-1">
          <button
            onClick={currentView === 'clientes' ? handleNew : handleNewEmpresa}
            title="Nuevo"
            className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            +
          </button>
          <button
            onClick={currentView === 'clientes' ? handleEdit : handleEditEmpresa}
            disabled={currentView === 'clientes' ? !selectedCliente : !selectedEmpresa}
            title="Editar"
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          >
            ✎
          </button>
          <button
            onClick={currentView === 'clientes' ? handleDelete : handleDeleteEmpresa}
            disabled={currentView === 'clientes' ? !selectedCliente : !selectedEmpresa}
            title="Eliminar"
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          >
            🗑
          </button>
          <button
            onClick={() => window.close()}
            title="Salir"
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Área central - Tabla de clientes */}
      <div className="flex-1 p-2 min-h-0">
        <TableModel
          title={currentView === 'clientes' ? 'Lista de Clientes' : 'Lista de Empresas'}
          columns={currentView === 'clientes' ? columns : empresasColumns}
          data={currentView === 'clientes' ? clientes : empresas}
          loading={loading}
          selectedRow={currentView === 'clientes' ? selectedCliente : selectedEmpresa}
          onRowClick={currentView === 'clientes' ? handleRowClick : handleEmpresaRowClick}
          emptyMessage={currentView === 'clientes' ? 'No hay clientes registrados' : 'No hay empresas registradas'}
        />
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-64 bg-white border-l border-gray-200 p-2">
        <div className="text-xs font-medium text-gray-900 mb-2">
          {currentView === 'clientes' 
            ? (isEditing ? 'Editar Cliente' : isCreating ? 'Nuevo Cliente' : 'Datos del cliente')
            : (isEditing ? 'Editar Empresa' : isCreating ? 'Nueva Empresa' : 'Datos de la empresa')
          }
        </div>
        {currentView === 'clientes' ? (
          <form onSubmit={handleSave} className="space-y-2">
          <div>
            <label className="block text-xs text-gray-700">Tratamiento</label>
            <input
              type="text"
              name="tratamiento"
              value={formData.tratamiento || ''}
              onChange={handleInputChange}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Apellidos *</label>
            <input
              type="text"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Nombres *</label>
            <input
              type="text"
              name="nombres"
              value={formData.nombres}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Teléfono *</label>
            <input
              type="text"
              name="telefono"
              value={formData.telefono}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Cédula / RUC *</label>
            <input
              type="text"
              name="cedula"
              value={formData.cedula}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Referencias</label>
            <textarea
              name="referencias"
              value={formData.referencias}
              onChange={handleInputChange}
              disabled={!formActive}
              rows={2}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">e-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Relacionado</label>
            <input
              type="text"
              name="relacionado"
              value={formData.relacionado}
              onChange={handleInputChange}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="flex items-center text-xs text-gray-700">
              <input
                type="checkbox"
                name="trial272"
                checked={formData.trial272 === '1'}
                onChange={(e) => setFormData({...formData, trial272: e.target.checked ? '1' : ''})}
                disabled={!formActive}
                className="mr-1"
              />
              Desea recibir boletín de novedades mediante e-mail
            </label>
          </div>
          {formActive && (
            <div className="flex space-x-1 pt-1">
              <button
                type="submit"
                className="flex-1 text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormActive(false);
                  setIsEditing(false);
                  setIsCreating(false);
                  setSelectedCliente(null);
                  setFormData({
                    tratamiento: '',
                    apellidos: '',
                    nombres: '',
                    direccion: '',
                    telefono: '',
                    cedula: '',
                    referencias: '',
                    email: '',
                    relacionado: '',
                    trial272: ''
                  });
                }}
                className="flex-1 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </form>
        ) : (
          <form onSubmit={handleSaveEmpresa} className="space-y-2">
            <div>
              <label className="block text-xs text-gray-700">Nombre *</label>
              <input
                type="text"
                name="nombre"
                value={empresaFormData.nombre}
                onChange={handleEmpresaInputChange}
                required
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">RUC *</label>
              <input
                type="text"
                name="ruc"
                value={empresaFormData.ruc}
                onChange={handleEmpresaInputChange}
                required
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Razón Social</label>
              <input
                type="text"
                name="razon_social"
                value={empresaFormData.razon_social}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Dirección</label>
              <input
                type="text"
                name="direccion"
                value={empresaFormData.direccion}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Teléfono</label>
              <input
                type="text"
                name="telefono"
                value={empresaFormData.telefono}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Fax</label>
              <input
                type="text"
                name="fax"
                value={empresaFormData.fax}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">E-mail</label>
              <input
                type="email"
                name="email"
                value={empresaFormData.email}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Página Web</label>
              <input
                type="url"
                name="pagina_web"
                value={empresaFormData.pagina_web}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-700">Representante</label>
              <input
                type="text"
                name="representante"
                value={empresaFormData.representante}
                onChange={handleEmpresaInputChange}
                disabled={!formActive}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            {formActive && (
              <div className="flex space-x-1 pt-1">
                <button
                  type="submit"
                  className="flex-1 text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormActive(false);
                    setIsEditing(false);
                    setIsCreating(false);
                    setSelectedEmpresa(null);
                    setEmpresaFormData({
                      nombre: '',
                      ruc: '',
                      razon_social: '',
                      direccion: '',
                      telefono: '',
                      fax: '',
                      email: '',
                      pagina_web: '',
                      representante: ''
                    });
                  }}
                  className="flex-1 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </form>
        )}
      </div>
      </div>
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        onClose={closeModal}
      />
    </div>
  );
};

export default Clientes;