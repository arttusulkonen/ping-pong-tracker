import React from 'react';


import PlayerList from './components/PlayerList';
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
        <PlayerList handleOpenModal={handleOpenModal} handleCloseModal={handleCloseModal} showModal={showModal}/>

        
      </div>
    </div>
  );
}

export default App;
