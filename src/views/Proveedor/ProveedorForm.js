import React, { useState, useEffect } from 'react';

const ProveedorForm = ({ 
  proveedor, 
  isEditing, 
  onSave, 
  onCancel,
  loading,
  formActive = true
}) => {
  const [formData, setFormData] = useState({
    empresa: '',
    direccion: '',
    telefono: '',
    fax: '',
    ciudad: '',
    representante: '',
    mail: '',
    ruc: '',
    tipoid: '',
    relacionado: '',
    trial279: ''
  });

  useEffect(() => {
    if (proveedor && isEditing) {
      setFormData({
        empresa: proveedor.empresa || '',
        direccion: proveedor.direccion || '',
        telefono: proveedor.telefono || '',
        fax: proveedor.fax || '',
        ciudad: proveedor.ciudad || '',
        representante: proveedor.representante || '',
        mail: proveedor.mail || '',
        ruc: proveedor.ruc || '',
        tipoid: proveedor.tipoid || '',
        relacionado: proveedor.relacionado || '',
        trial279: proveedor.trial279 || ''
      });
    } else {
      // Limpiar formulario para nuevo proveedor
      setFormData({
        cod: '',
        empresa: '',
        direccion: '',
        telefono: '',
        fax: '',
        ciudad: '',
        representante: '',
        mail: '',
        ruc: '',
        tipoid: '',
        relacionado: '',
        trial279: ''
      });
    }
  }, [proveedor, isEditing]);

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
          Seleccione un proveedor para ver los detalles
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-2 p-3">
          <div>
            <label className="block text-xs text-gray-700">Empresa *</label>
            <input
              type="text"
              value={formData.empresa}
              onChange={(e) => handleInputChange('empresa', e.target.value)}
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
            <label className="block text-xs text-gray-700">Ciudad</label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => handleInputChange('ciudad', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Representante</label>
            <input
              type="text"
              value={formData.representante}
              onChange={(e) => handleInputChange('representante', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Email</label>
            <input
              type="email"
              value={formData.mail}
              onChange={(e) => handleInputChange('mail', e.target.value)}
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
            <label className="block text-xs text-gray-700">Tipo ID</label>
            <input
              type="text"
              value={formData.tipoid}
              onChange={(e) => handleInputChange('tipoid', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Relacionado</label>
            <input
              type="text"
              value={formData.relacionado}
              onChange={(e) => handleInputChange('relacionado', e.target.value)}
              disabled={!formActive}
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-700">Trial279</label>
            <input
              type="text"
              value={formData.trial279}
              onChange={(e) => handleInputChange('trial279', e.target.value)}
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

export default ProveedorForm;