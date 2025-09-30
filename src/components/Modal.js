import React, { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm' }) => {
  const okRef = useRef(null);
  const cancelRef = useRef(null);

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  useEffect(() => {
    if (okRef.current) okRef.current.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center select-none">
      <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />

      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-sm mx-4 border border-gray-300">
        {/* Header */}
        <div className="px-4 py-2 border-b border-gray-300 bg-gray-100/80 rounded-t-md flex items-center">
          <div className="mr-2">
            {type === 'confirm' ? (
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
              </svg>
            )}
          </div>
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title || (type === 'confirm' ? 'Confirmación' : 'Mensaje')}</h3>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <div className="text-[13px] leading-5 text-gray-800 whitespace-pre-line">{message}</div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-300 bg-gray-50 rounded-b-md flex justify-end gap-2">
          {type === 'confirm' ? (
            <>
              <button
                ref={cancelRef}
                onClick={handleCancel}
                className="px-3 py-1 text-[13px] rounded border border-gray-300 bg-white hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                ref={okRef}
                onClick={handleConfirm}
                className="px-3 py-1 text-[13px] rounded bg-gray-700 text-white hover:bg-gray-800"
              >
                Aceptar
              </button>
            </>
          ) : (
            <button
              ref={okRef}
              onClick={handleConfirm}
              className="px-3 py-1 text-[13px] rounded bg-gray-700 text-white hover:bg-gray-800"
            >
              Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;