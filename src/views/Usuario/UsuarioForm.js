import React from 'react';

const UsuarioForm = ({ 
  formData, 
  isEditing, 
  isCreating, 
  formActive,
  empresas = [],
  onSubmit, 
  onChange, 
  onCancel 
}) => {
  const getFormTitle = () => {
    if (isEditing) return 'Editar Usuario';
    if (isCreating) return 'Nuevo Usuario';
    return 'Datos del Usuario';
  };

  const isFormActive = formActive && (isEditing || isCreating);

  return (
    <div className="w-64 bg-white border-l border-gray-200 p-3">
      <div className="text-sm font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">
        {getFormTitle()}
      </div>
      
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Usuario *
          </label>
          <input
            type="text"
            name="usuario"
            value={formData.usuario}
            onChange={onChange}
            required
            disabled={!isFormActive}
            placeholder="Nombre de usuario"
            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Alias
          </label>
          <input
            type="text"
            name="alias"
            value={formData.alias}
            onChange={onChange}
            disabled={!isFormActive}
            placeholder="Nombre completo o alias"
            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
          </label>
          <input
            type="password"
            name="contrasena"
            value={formData.contrasena}
            onChange={onChange}
            required={!isEditing}
            disabled={!isFormActive}
            placeholder={isEditing ? "Nueva contraseña (opcional)" : "Contraseña"}
            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              Dejar vacío para mantener la contraseña actual
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tipo de Usuario *
          </label>
          <select
            name="tipo"
            value={formData.tipo}
            onChange={onChange}
            disabled={!isFormActive}
            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value={1}>Administrador</option>
            <option value={2}>Operador</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Empresa *
          </label>
          <select
            name="codempresa"
            value={formData.codempresa}
            onChange={onChange}
            disabled={!isFormActive}
            required
            className="block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Seleccione una empresa</option>
            {empresas.map((empresa) => (
              <option key={empresa.cod} value={empresa.cod}>
                {empresa.empresa}
              </option>
            ))}
          </select>
        </div>

        {isFormActive && (
          <div className="flex space-x-2 pt-3 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-gray-700 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              {isEditing ? 'Actualizar' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}
      </form>

      {!isFormActive && formData.usuario && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-xs font-medium text-gray-900 mb-2">Información del Usuario</h4>
          <dl className="space-y-1">
            <div>
              <dt className="text-xs text-gray-500">Usuario:</dt>
              <dd className="text-xs font-medium text-gray-900">{formData.usuario}</dd>
            </div>
            {formData.alias && (
              <div>
                <dt className="text-xs text-gray-500">Alias:</dt>
                <dd className="text-xs font-medium text-gray-900">{formData.alias}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Tipo:</dt>
              <dd className="text-xs font-medium text-gray-900">
                {formData.tipo === 1 ? 'Administrador' : 'Operador'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Empresa:</dt>
              <dd className="text-xs font-medium text-gray-900">{formData.codempresa}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
};

export default UsuarioForm;
