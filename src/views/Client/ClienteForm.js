import React, { useState, useEffect } from 'react';

const ClienteForm = ({ 
  cliente, 
  isEditing, 
  onSave, 
  onCancel,
  loading,
  formActive = true
}) => {
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

  useEffect(() => {
    if (cliente && isEditing) {
      setFormData({
        tratamiento: cliente.tratamiento || '',
        apellidos: cliente.apellidos || '',
        nombres: cliente.nombres || '',
        direccion: cliente.direccion || '',
        telefono: cliente.telefono || '',
        cedula: cliente.cedula || '',
        referencias: cliente.referencias || '',
        email: cliente.email || '',
        relacionado: cliente.relacionado || '',
        trial272: cliente.trial272 || ''
      });
    } else {
      // Limpiar formulario para nuevo cliente
      setFormData({
        cod: '',
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
    }
  }, [cliente, isEditing]);

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
          Seleccione un cliente para ver los detalles
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-2 p-3">
          <div>
            <label className="block text-xs text-gray-700">Tratamiento</label>
            <select
              value={formData.tratamiento || ''}
              onChange={(e) => handleInputChange('tratamiento', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Seleccionar...</option>
              <option value="Sr.">Sr.</option>
              <option value="Sra.">Sra.</option>
              <option value="Srta.">Srta.</option>
              <option value="Dr.">Dr.</option>
              <option value="Dra.">Dra.</option>
              <option value="Ing.">Ing.</option>
              <option value="Lic.">Lic.</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-700">Apellidos *</label>
            <input
              type="text"
              value={formData.apellidos}
              onChange={(e) => handleInputChange('apellidos', e.target.value)}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Nombres *</label>
            <input
              type="text"
              value={formData.nombres}
              onChange={(e) => handleInputChange('nombres', e.target.value)}
              required
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
            <label className="block text-xs text-gray-700">Teléfono *</label>
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Cédula / RUC *</label>
            <input
              type="text"
              value={formData.cedula}
              onChange={(e) => handleInputChange('cedula', e.target.value)}
              required
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Referencias</label>
            <textarea
              value={formData.referencias}
              onChange={(e) => handleInputChange('referencias', e.target.value)}
              disabled={!formActive}
              rows={2}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">e-mail</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
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

export default ClienteForm;