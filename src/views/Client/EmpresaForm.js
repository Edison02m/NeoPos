import React, { useState, useEffect } from 'react';

const EmpresaForm = ({ 
  empresa, 
  isEditing, 
  onSave, 
  onCancel,
  loading,
  formActive = true
}) => {
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (empresa && isEditing) {
      setFormData({
        nombre: empresa.nombre || '',
        ruc: empresa.ruc || '',
        razon_social: empresa.razon_social || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        fax: empresa.fax || '',
        email: empresa.email || '',
        pagina_web: empresa.pagina_web || '',
        representante: empresa.representante || ''
      });
    } else {
      // Limpiar formulario para nueva empresa
      setFormData({
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
    }
  }, [empresa, isEditing]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!formActive) {
    return (
      <div className="p-4 bg-white border-l border-gray-300">
        <div className="text-center text-gray-500">
          Seleccione una empresa para ver los detalles
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-2 p-3">
          <div>
            <label className="block text-xs text-gray-700">Nombre *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">RUC *</label>
            <input
              type="text"
              value={formData.ruc}
              onChange={(e) => handleInputChange('ruc', e.target.value)}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Razón Social</label>
            <input
              type="text"
              value={formData.razon_social}
              onChange={(e) => handleInputChange('razon_social', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Dirección</label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Teléfono</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Fax</label>
            <input
              type="text"
              value={formData.fax}
              onChange={(e) => handleInputChange('fax', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">E-mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Página Web</label>
            <input
              type="url"
              value={formData.pagina_web}
              onChange={(e) => handleInputChange('pagina_web', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Representante Legal</label>
            <input
              type="text"
              value={formData.representante}
              onChange={(e) => handleInputChange('representante', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {formActive && (
             <div className="pt-2">
               <button
                 type="submit"
                 className="w-full bg-gray-900 text-white py-1 px-2 text-xs rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
                 {isEditing ? 'Actualizar' : 'Guardar'}
               </button>
               <button
                 type="button"
                 onClick={onCancel}
                 className="w-full mt-1 bg-gray-300 text-gray-700 py-1 px-2 text-xs rounded hover:bg-gray-400 transition-colors flex items-center justify-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
                 Cancelar
               </button>
             </div>
           )}
        </form>
    </div>
  );
};

export default EmpresaForm;