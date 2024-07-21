import React from 'react';
import MatchForm from './components/MatchForm';
import PlayerList from './components/PlayerList';

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
        <div className='flex flex-col md:flex-row justify-between gap-24'>
          <PlayerList
            handleOpenModal={handleOpenModal}
            handleCloseModal={handleCloseModal}
            showModal={showModal}
          />
          <MatchForm />
        </div>
      </div>
    </div>
  );
}

export default App;
