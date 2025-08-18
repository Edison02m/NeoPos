import React, { useState, useEffect } from 'react';
import Cliente from '../models/Cliente';
import ClienteController from '../controllers/ClienteController';
import Modal from '../components/Modal';
import useModal from '../hooks/useModal';

const Clientes = () => {
  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Gestión de Clientes';
  }, []);
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
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
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { modalState, showConfirm, showAlert, closeModal } = useModal();

  useEffect(() => {
    loadClientes();
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      
      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Panel izquierdo - Acciones */}
      <div className="w-12 bg-white border-r border-gray-200 py-2">
        <div className="space-y-1 px-1">
          <button
            onClick={handleNew}
            title="Nuevo"
            className="w-8 h-8 flex items-center justify-center text-lg bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            +
          </button>
          <button
            onClick={handleEdit}
            disabled={!selectedCliente}
            title="Editar"
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          >
            ✎
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedCliente}
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
        <div className="bg-white border border-gray-200 h-full flex flex-col">
          <div className="border-b border-gray-200 px-3 py-2 flex-shrink-0">
            <h2 className="text-sm font-medium text-gray-900">Lista de Clientes</h2>
          </div>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando clientes...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative">
              <div className="absolute inset-0 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-16 border-r border-gray-200">Núm.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-20 border-r border-gray-200">Trat.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-32 border-r border-gray-200">Apellidos</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-32 border-r border-gray-200">Nombres</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-40 border-r border-gray-200">Dirección</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-24 border-r border-gray-200">Teléfono</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-28 border-r border-gray-200">Cédula/RUC</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-16 border-r border-gray-200">Tipo</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-20 border-r border-gray-200">Límite</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-32 border-r border-gray-200">Referencias</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-40 border-r border-gray-200">E-mail</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-16 border-r border-gray-200">TID</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-20 border-r border-gray-200">Relac.</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-16">T272</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientes.map((cliente) => (
                      <tr
                        key={cliente.cod}
                        onClick={() => handleRowClick(cliente)}
                        className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                          selectedCliente?.cod === cliente.cod ? 'bg-blue-100' : ''
                        }`}
                      >
                        <td className="px-2 py-2 text-gray-600 font-mono border-r border-gray-100 truncate">{cliente.cod}</td>
                        <td className="px-2 py-2 text-gray-500 border-r border-gray-100 truncate">{cliente.tratamiento || '-'}</td>
                        <td className="px-2 py-2 font-medium border-r border-gray-100 truncate" title={cliente.apellidos}>{cliente.apellidos}</td>
                        <td className="px-2 py-2 border-r border-gray-100 truncate" title={cliente.nombres}>{cliente.nombres}</td>
                        <td className="px-2 py-2 text-gray-500 border-r border-gray-100 truncate" title={cliente.direccion || '-'}>{cliente.direccion || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 border-r border-gray-100 truncate">{cliente.telefono || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 font-mono border-r border-gray-100 truncate">{cliente.cedula || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 text-center border-r border-gray-100 truncate">{cliente.tipo || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 text-right border-r border-gray-100 truncate">{cliente.limite ? `$${parseFloat(cliente.limite).toFixed(2)}` : '-'}</td>
                        <td className="px-2 py-2 text-gray-500 border-r border-gray-100 truncate" title={cliente.referencias || '-'}>{cliente.referencias || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 border-r border-gray-100 truncate" title={cliente.email || '-'}>{cliente.email || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 text-center border-r border-gray-100 truncate">{cliente.tipoid || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 text-center border-r border-gray-100 truncate">{cliente.relacionado || '-'}</td>
                        <td className="px-2 py-2 text-gray-500 text-center truncate">{cliente.trial272 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clientes.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-gray-500">No hay clientes registrados</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-64 bg-white border-l border-gray-200 p-2">
        <div className="text-xs font-medium text-gray-900 mb-2">
          {isEditing ? 'Editar Cliente' : isCreating ? 'Nuevo Cliente' : 'Datos del cliente'}
        </div>
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