import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

// Modal liviano para registrar IMEIs de un producto en la compra actual
const ImeiModal = ({ isOpen, onClose, producto, onSave, cantidad }) => {
  const [imeis, setImeis] = useState([]); // array de strings
  const [input, setInput] = useState('');
  const [modalState, setModalState] = useState({ isOpen:false, type:'info', title:'', message:'', onConfirm:null, onClose:null });
  const modalAlert = (message, title='Información') => new Promise((resolve)=>{
    setModalState({ isOpen:true, type:'info', title, message, onConfirm:()=>{ setModalState(s=>({...s, isOpen:false})); resolve(true); }, onClose:()=>{ setModalState(s=>({...s, isOpen:false})); resolve(true); } });
  });
  const modalConfirm = (message, title='Confirmación') => new Promise((resolve)=>{
    setModalState({ isOpen:true, type:'confirm', title, message, onConfirm:()=>{ setModalState(s=>({...s, isOpen:false})); resolve(true); }, onClose:()=>{ setModalState(s=>({...s, isOpen:false})); resolve(false); } });
  });

  useEffect(()=>{ if(isOpen){ setImeis([]); setInput(''); } }, [isOpen, producto?.codigo]);
  if(!isOpen) return null;
  const restan = (cantidad || 0) - imeis.length;
  const add = () => {
    const val = input.trim();
    if(!val) return;
    if(imeis.includes(val)) { modalAlert('IMEI duplicado', 'Información'); return; }
    setImeis(prev=> [...prev, val]);
    setInput('');
  };
  const remove = (v)=> setImeis(prev=> prev.filter(x=> x!==v));
  const handleSave = async () => {
    if(restan !== 0){ const ok = await modalConfirm('Cantidad de IMEIs no coincide con cantidad del producto. ¿Guardar de todas formas?', 'Confirmación'); if(!ok) return; }
    onSave?.(producto, imeis);
  };
  const onKey = e=> { if(e.key==='Enter'){ e.preventDefault(); add(); } };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">IMEIs para {producto?.descripcion || producto?.codigo}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">Cerrar</button>
        </div>
        <div className="text-xs text-gray-600">Cantidad producto: {cantidad} | Registrados: {imeis.length} | Restan: {restan}</div>
        <div className="flex gap-2">
          <input value={input} onChange={e=> setInput(e.target.value)} onKeyDown={onKey} placeholder="Escanee / escriba IMEI y Enter" className="flex-1 px-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={add} className="px-3 py-2 bg-blue-600 text-white rounded text-xs disabled:opacity-40" disabled={!input.trim()}>Agregar</button>
        </div>
        <div className="border rounded p-2 h-48 overflow-auto text-xs space-y-1">
          {imeis.length===0 && <div className="text-gray-400">Sin IMEIs</div>}
          {imeis.map(i=> (
            <div key={i} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
              <span className="font-mono">{i}</span>
              <button onClick={()=> remove(i)} className="text-red-500 hover:text-red-600">Eliminar</button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button onClick={onClose} className="px-3 py-2 bg-gray-200 text-gray-700 rounded text-xs">Cancelar</button>
          <button onClick={handleSave} className="px-3 py-2 bg-green-600 text-white rounded text-xs disabled:opacity-40" disabled={imeis.length===0}>Guardar IMEIs</button>
        </div>
      </div>
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onClose={modalState.onClose}
      />
    </div>
  );
};
export default ImeiModal;
