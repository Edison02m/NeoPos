import { useState, useCallback } from 'react';

const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: null,
    onClose: null
  });

  const showConfirm = useCallback((message, title = 'Confirmación') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onClose: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const showAlert = useCallback((message, title = 'Información') => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'alert',
        title,
        message,
        onConfirm: null,
        onClose: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve();
        }
      });
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modalState,
    showConfirm,
    showAlert,
    closeModal
  };
};

export default useModal;