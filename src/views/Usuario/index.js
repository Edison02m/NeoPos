import React, { useState, useEffect } from 'react';
import Usuario from '../../models/Usuario';
import Modal from '../../components/Modal';
import useModal from '../../hooks/useModal';
import ActionPanel from './ActionPanel';
import UsuariosList from './UsuariosList';
import UsuarioForm from './UsuarioForm';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    usuario: '',
    contrasena: '',
    alias: '',
    tipo: 1,
    codempresa: 1
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const { modalState, showConfirm, showAlert, closeModal } = useModal();

  // Establecer el título de la ventana
  useEffect(() => {
    document.title = 'Gestión de Usuarios - NeoPOS';
  }, []);

  useEffect(() => {
    loadUsuarios();
    loadEmpresas();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const usuariosData = await Usuario.findAll();
      setUsuarios(usuariosData || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      await showAlert('Error al cargar usuarios');
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const empresasData = await Usuario.getAllEmpresas();
      setEmpresas(empresasData || []);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setEmpresas([]);
    }
  };

  const resetForm = () => {
    setFormData({
      usuario: '',
      contrasena: '',
      alias: '',
      tipo: 1,
      codempresa: empresas.length > 0 ? empresas[0].cod : ''
    });
    setSelectedUser(null);
    setIsEditing(false);
    setIsCreating(false);
    setFormActive(false);
  };

  const handleNew = () => {
    resetForm();
    setIsCreating(true);
    setFormActive(true);
  };

  const handleEdit = () => {
    if (selectedUser) {
      setIsEditing(true);
      setIsCreating(false);
      setFormActive(true);
      setFormData({
        usuario: selectedUser.usuario,
        contrasena: '', // No mostrar la contraseña actual
        alias: selectedUser.alias || '',
        tipo: selectedUser.tipo,
        codempresa: selectedUser.codempresa || 1
      });
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const confirmed = await showConfirm(
        `¿Está seguro de eliminar el usuario "${selectedUser.usuario}"?`,
        'Esta acción no se puede deshacer.'
      );
      
      if (confirmed) {
        try {
          await Usuario.delete(selectedUser.cod);
          await showAlert('Usuario eliminado exitosamente', 'success');
          resetForm();
          loadUsuarios();
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          await showAlert('Error al eliminar usuario');
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const userData = {
        usuario: formData.usuario.trim(),
        alias: formData.alias.trim(),
        tipo: formData.tipo,
        codempresa: formData.codempresa
      };

      // Solo incluir contraseña si se proporcionó
      if (formData.contrasena.trim()) {
        userData.contrasena = formData.contrasena.trim();
      }

      if (isEditing && selectedUser) {
        await Usuario.update(selectedUser.cod, userData);
        await showAlert('Usuario actualizado exitosamente', 'success');
      } else {
        if (!userData.contrasena) {
          await showAlert('La contraseña es requerida para usuarios nuevos');
          return;
        }
        await Usuario.create(userData);
        await showAlert('Usuario creado exitosamente', 'success');
      }

      resetForm();
      loadUsuarios();
      
      // Emitir evento para notificar que los datos de usuario se actualizaron
      window.dispatchEvent(new CustomEvent('user-updated', { detail: userData }));
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      await showAlert('Error al guardar usuario');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tipo' || name === 'codempresa' ? parseInt(value) : value
    }));
  };

  const handleUserSelect = (usuario) => {
    setSelectedUser(usuario);
    setFormData({
      usuario: usuario.usuario,
      contrasena: '',
      alias: usuario.alias || '',
      tipo: usuario.tipo,
      codempresa: usuario.codempresa || 1
    });
    setIsEditing(false);
    setIsCreating(false);
    setFormActive(false);
  };

  const handleCancel = () => {
    if (selectedUser) {
      // Volver a mostrar los datos del usuario seleccionado
      handleUserSelect(selectedUser);
    } else {
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <ActionPanel
        selectedUser={selectedUser}
        onNew={handleNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <UsuariosList
        usuarios={usuarios}
        selectedUser={selectedUser}
        onUserSelect={handleUserSelect}
        loading={loading}
      />
      
      <UsuarioForm
        formData={formData}
        isEditing={isEditing}
        isCreating={isCreating}
        formActive={formActive}
        empresas={empresas}
        onSubmit={handleSubmit}
        onChange={handleInputChange}
        onCancel={handleCancel}
      />
      
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

export default Usuarios;
