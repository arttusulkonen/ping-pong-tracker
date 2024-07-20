import React from 'react';

import AddPlayerForm from './components/AddPlayerForm';
import Modal from './components/Modal';
import './index.css';

function App() {
  const [showModal, setShowModal] = React.useState(false);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center'>
      <div className='max-w-screen-xl w-full px-4'>
        <h1 className='text-4xl font-bold mb-8 text-center'>
          Ping Pong Tracker
        </h1>
        <button
          onClick={handleOpenModal}
          className='bg-blue-500 text-white px-4 py-2 rounded mt-4'
        >
          Add Player
        </button>
        <Modal show={showModal} onClose={handleCloseModal}>
          <AddPlayerForm onClose={handleCloseModal} />
        </Modal>
      </div>
    </div>
  );
}

export default App;
