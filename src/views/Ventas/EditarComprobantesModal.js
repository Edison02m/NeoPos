import React, { useEffect, useState } from 'react';

// Modal simple usando tailwind (asumiendo tailwind disponible). Ajustar estilos según proyecto.
const EditarComprobantesModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const cargar = async () => {
    if (!window.electronAPI?.comprobantes) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await window.electronAPI.comprobantes.listar();
      if (resp.success) {
        setRows(resp.data.map(r => ({ ...r, prefijo1Edit: r.prefijo1, prefijo2Edit: r.prefijo2, contadorEdit: r.contador })));
      } else {
        setError(resp.error || 'No se pudo cargar');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargar();
      setSuccessMsg(null);
    }
  }, [open]);

  const actualizarPrefijos = async (sigla) => {
    const row = rows.find(r => r.sigla === sigla);
    if (!row) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resp = await window.electronAPI.comprobantes.actualizarPrefijos(sigla, row.prefijo1Edit, row.prefijo2Edit);
      if (!resp.success) throw new Error(resp.error);
      setSuccessMsg(`Prefijos de ${sigla} actualizados`);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const actualizarContador = async (sigla) => {
    const row = rows.find(r => r.sigla === sigla);
    if (!row) return;
    if (!window.confirm('¿Confirmar cambio de contador? Afectará el siguiente número generado.')) return;
    const nuevo = parseInt(row.contadorEdit, 10);
    if (Number.isNaN(nuevo) || nuevo < 0) {
      setError('Contador inválido');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resp = await window.electronAPI.comprobantes.actualizarContador(sigla, nuevo);
      if (!resp.success) throw new Error(resp.error);
      setSuccessMsg(`Contador de ${sigla} actualizado`);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg w-full max-w-3xl p-4 relative">
        <h2 className="text-xl font-semibold mb-4">Editar Comprobantes</h2>
        <button className="absolute top-2 right-2 text-gray-500 hover:text-black" onClick={onClose}>✕</button>
        {loading && <div className="text-sm text-blue-600 mb-2">Cargando...</div>}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {successMsg && <div className="text-sm text-green-600 mb-2">{successMsg}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Sigla</th>
                <th className="p-2 border">Prefijo 1</th>
                <th className="p-2 border">Prefijo 2</th>
                <th className="p-2 border">Contador actual</th>
                <th className="p-2 border">Nuevo contador</th>
                <th className="p-2 border">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.sigla} className="hover:bg-gray-50">
                  <td className="p-2 border font-medium">{r.sigla}</td>
                  <td className="p-2 border">
                    <input
                      className="border px-1 py-0.5 w-20 text-center"
                      value={r.prefijo1Edit}
                      maxLength={3}
                      onChange={e => setRows(rows.map(x => x.sigla === r.sigla ? { ...x, prefijo1Edit: e.target.value.replace(/[^0-9]/g,'').slice(0,3) } : x))}
                    />
                  </td>
                  <td className="p-2 border">
                    <input
                      className="border px-1 py-0.5 w-20 text-center"
                      value={r.prefijo2Edit}
                      maxLength={3}
                      onChange={e => setRows(rows.map(x => x.sigla === r.sigla ? { ...x, prefijo2Edit: e.target.value.replace(/[^0-9]/g,'').slice(0,3) } : x))}
                    />
                  </td>
                  <td className="p-2 border text-center">{r.contador}</td>
                  <td className="p-2 border">
                    <input
                      className="border px-1 py-0.5 w-24 text-center"
                      value={r.contadorEdit}
                      onChange={e => setRows(rows.map(x => x.sigla === r.sigla ? { ...x, contadorEdit: e.target.value.replace(/[^0-9]/g,'') } : x))}
                    />
                  </td>
                  <td className="p-2 border space-y-1 flex flex-col">
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      disabled={loading || r.prefijo1 === r.prefijo1Edit && r.prefijo2 === r.prefijo2Edit}
                      onClick={() => actualizarPrefijos(r.sigla)}
                    >Guardar prefijos</button>
                    <button
                      className="bg-amber-600 text-white px-2 py-1 rounded text-xs hover:bg-amber-700 disabled:opacity-50"
                      disabled={loading || String(r.contador) === String(r.contadorEdit)}
                      onClick={() => actualizarContador(r.sigla)}
                    >Actualizar contador</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500">Sin comprobantes</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          <p>Nota: El siguiente número generado usa contador+1. Si establece contador en 15, el próximo será 001-001-000016.</p>
          <p>Precaución: Cambiar prefijos después de emitir documentos puede requerir autorización tributaria.</p>
        </div>
        <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default EditarComprobantesModal;
