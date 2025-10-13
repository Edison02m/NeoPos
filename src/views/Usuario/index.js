import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import Usuario from '../../models/Usuario';
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
    codempresa: 1,
    empresa_nombre: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({ isOpen:false, type:'alert', title:'', message:'', resolver:null });

  // Helpers de diálogo nativos (Electron) con fallback a navegador
  const restoreFocus = (el) => {
    if (el && typeof el.focus === 'function') {
      el.focus();
      try {
        if (el.setSelectionRange && typeof el.value === 'string') {
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      } catch (_) {}
    }
  };

  const nativeAlert = async (message, title = 'Información') => {
    const last = typeof document !== 'undefined' ? document.activeElement : null;
    await new Promise(resolve => {
      setModalState({ isOpen:true, type:'alert', title, message, resolver: () => resolve(true) });
    });
    setTimeout(() => restoreFocus(last), 0);
  };

  const nativeConfirm = async (message, title = 'Confirmación') => {
    const last = typeof document !== 'undefined' ? document.activeElement : null;
    const ok = await new Promise(resolve => {
      setModalState({ isOpen:true, type:'confirm', title, message, resolver: (v)=> resolve(!!v) });
    });
    setTimeout(() => restoreFocus(last), 0);
    return ok;
  };

  // document.title eliminado: título ahora fijo desde WindowManager

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
      showAlert('Error', 'Error al cargar usuarios');
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
      codempresa: empresas.length > 0 ? empresas[0].cod : '',
      empresa_nombre: empresas.length > 0 ? empresas[0].empresa : ''
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
        codempresa: selectedUser.codempresa || 1,
        empresa_nombre: selectedUser.empresa_nombre || ''
      });
    }
  };

  const handleDelete = async () => {
    if (selectedUser) {
      const confirmed = await nativeConfirm(
        `¿Está seguro de eliminar el usuario "${selectedUser.usuario}"?`,
        'Confirmación'
      );
      
      if (confirmed) {
        try {
          await Usuario.delete(selectedUser.cod);
          showAlert('Éxito', 'Usuario eliminado exitosamente');
          resetForm();
          loadUsuarios();
        } catch (error) {
          console.error('Error al eliminar usuario:', error);
          showAlert('Error', 'Error al eliminar usuario');
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
        showAlert('Éxito', 'Usuario actualizado exitosamente');
      } else {
        if (!userData.contrasena) {
          showAlert('Atención', 'La contraseña es requerida para usuarios nuevos');
          return;
        }
        await Usuario.create(userData);
        showAlert('Éxito', 'Usuario creado exitosamente');
      }

      resetForm();
      loadUsuarios();
      
      // Emitir evento para notificar que los datos de usuario se actualizaron
      window.dispatchEvent(new CustomEvent('user-updated', { detail: userData }));
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      showAlert('Error', 'Error al guardar usuario');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tipo' || name === 'codempresa' ? parseInt(value) : value
    }));

    // Si cambia la empresa, actualizar su nombre asociado
    if (name === 'codempresa') {
      const empresa = empresas.find(e => e.cod === parseInt(value));
      if (empresa) {
        setFormData(prev => ({
          ...prev,
          empresa_nombre: empresa.empresa
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          empresa_nombre: ''
        }));
      }
    }
  };

  const handleUserSelect = (usuario) => {
    setSelectedUser(usuario);
    setFormData({
      usuario: usuario.usuario,
      contrasena: '',
      alias: usuario.alias || '',
      tipo: usuario.tipo,
      codempresa: usuario.codempresa || 1,
      empresa_nombre: usuario.empresa_nombre || ''
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
        type={modalState.type === 'confirm' ? 'confirm' : 'alert'}
        title={modalState.title}
        message={modalState.message}
        onConfirm={()=>{ try{ modalState.resolver && modalState.resolver(true); } finally { setModalState(m=>({ ...m, isOpen:false })); } }}
        onClose={()=>{ try{ modalState.resolver && modalState.resolver(false); } finally { setModalState(m=>({ ...m, isOpen:false })); } }}
      />
    </div>
  );
};

export default Usuarios;
