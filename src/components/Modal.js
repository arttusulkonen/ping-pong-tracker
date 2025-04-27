import React from 'react';

const Modal = ({ show, onClose, children  }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 shadow-lg w-full md:w-80 relative">
        <button className="absolute top-0 right-0 m-4 text-black" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;