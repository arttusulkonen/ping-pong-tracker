import React from 'react';

const Modal = ({ show, onClose, children  }) => {
  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black mx-4 px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable">
        <button className="font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black mx-4 px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable" onClick={onClose}>
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;