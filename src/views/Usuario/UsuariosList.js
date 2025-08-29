import React from 'react';

const UsuariosList = ({ 
  usuarios, 
  selectedUser, 
  onUserSelect, 
  loading 
}) => {
  if (loading) {
    return (
      <div className="flex-1 p-2">
        <div className="bg-white border border-gray-200 h-full">
          <div className="border-b border-gray-200 px-3 py-2">
            <h1 className="text-sm font-medium text-gray-900">Usuarios del Sistema</h1>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-2">
      <div className="bg-white border border-gray-200 h-full">
        <div className="border-b border-gray-200 px-3 py-2">
          <h1 className="text-sm font-medium text-gray-900">Usuarios del Sistema</h1>
        </div>
        
        <div className="overflow-auto h-full">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left font-medium text-gray-600 w-12">ID</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600">Usuario</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600">Alias</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600">Tipo</th>
                <th className="px-2 py-1 text-left font-medium text-gray-600">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((usuario) => (
                <tr
                  key={usuario.cod}
                  onClick={() => onUserSelect(usuario)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedUser?.cod === usuario.cod ? 'bg-gray-100 border-l-2 border-gray-500' : ''
                  }`}
                >
                  <td className="px-2 py-1 text-gray-600 font-mono">{usuario.cod}</td>
                  <td className="px-2 py-1 font-medium text-gray-900">{usuario.usuario}</td>
                  <td className="px-2 py-1 text-gray-700">{usuario.alias || '-'}</td>
                  <td className="px-2 py-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      usuario.tipo === 1 
                        ? 'bg-gray-200 text-gray-800' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {usuario.tipo === 1 ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-gray-600">{usuario.empresa_nombre || 'Sin empresa'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {usuarios.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">👥</div>
              <p className="text-gray-500 text-sm">No hay usuarios registrados</p>
              <p className="text-gray-400 text-xs mt-1">Haga clic en + para agregar el primer usuario</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsuariosList;
