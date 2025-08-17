import React, { useState, useEffect } from 'react';
import Usuario from '../models/Usuario';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    usuario: '',
    contrasena: '',
    tipo: 1,
    alias: '',
    codempresa: 1
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await Usuario.findAll();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setSelectedUser(null);
    setIsEditing(false);
    setIsCreating(true);
    setFormActive(true);
    setFormData({
      usuario: '',
      contrasena: '',
      tipo: 1
    });
  };

  const handleEdit = () => {
    if (selectedUser) {
      setIsEditing(true);
      setIsCreating(false);
      setFormActive(true);
      setFormData({
        usuario: selectedUser.usuario,
        contrasena: selectedUser.contrasena,
        tipo: selectedUser.tipo
      });
    }
  };

  const handleDelete = async () => {
    if (selectedUser && window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await Usuario.delete(selectedUser.cod);
        setSelectedUser(null);
        loadUsers();
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
        alert('Error al eliminar usuario');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const userData = {
        ...formData,
        codempresa: 1 // Siempre es 1 según requerimiento
      };
      if (isEditing && selectedUser) {
        await Usuario.update(selectedUser.cod, userData);
      } else {
        await Usuario.create(userData);
      }
      setSelectedUser(null);
      setIsEditing(false);
      setIsCreating(false);
      setFormActive(false);
      loadUsers();
      setFormData({
        usuario: '',
        contrasena: '',
        tipo: 1
      });
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert('Error al guardar usuario');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tipo' ? parseInt(value) : value
    }));
  };

  const handleRowClick = (user) => {
    setSelectedUser(user);
    setIsEditing(false);
    setIsCreating(false);
    setFormActive(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
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
            disabled={!selectedUser}
            title="Editar"
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          >
            ✎
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedUser}
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

      {/* Área central - Tabla de usuarios */}
      <div className="flex-1 p-2">
        <div className="bg-white border border-gray-200 h-full">
          <div className="border-b border-gray-200 px-3 py-2">
            <h1 className="text-sm font-medium text-gray-900">Usuarios</h1>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">ID</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Usuario</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Clave</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr
                      key={user.cod}
                      onClick={() => handleRowClick(user)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.cod === user.cod ? 'bg-gray-100' : ''
                      }`}
                    >
                      <td className="px-2 py-1 text-gray-600">{user.cod}</td>
                      <td className="px-2 py-1 font-medium">{user.usuario}</td>
                      <td className="px-2 py-1 text-gray-500 font-mono text-xs">{user.contrasena}</td>
                      <td className="px-2 py-1 text-xs">
                        {user.tipo === 1 ? 'Administrador' : 'Operador'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay usuarios registrados</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Formulario */}
      <div className="w-48 bg-white border-l border-gray-200 p-2">
        <div className="text-xs font-medium text-gray-900 mb-2">
          {isEditing ? 'Editar' : isCreating ? 'Nuevo' : 'Seleccione una acción'}
        </div>
        <form onSubmit={handleSave} className="space-y-2">
          <div>
            <label className="block text-xs text-gray-700">Usuario</label>
            <input
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Clave</label>
            <input
              type="text"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleInputChange}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-700">Tipo</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleInputChange}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value={1}>Administrador</option>
              <option value={2}>Operador</option>
            </select>
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
                  setSelectedUser(null);
                  setFormData({
                    usuario: '',
                    contrasena: '',
                    tipo: 1
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
  );
};

export default Users;