import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import MatchForm from './components/MatchForm';
import PlayerList from './components/PlayerList';
import Login from './components/registration/Login';
import Register from './components/registration/Register';
import { db } from './firebase';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const updatePlayerList = async () => {
    const querySnapshot = await getDocs(collection(db, 'players'));
    let playersData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    playersData.sort((a, b) => b.rating - a.rating);
    setPlayers(playersData);
    setLoading(false);
  };

  useEffect(() => {
    updatePlayerList();
  }, []);

  return (
    <div className='min-h-screen flex flex-col items-center justify-center '>
      <div className='max-w-screen-xl w-full px-4'>
        <h1 className='text-4xl font-bold mb-8 text-center'>
          Ping Pong Tracker
        </h1>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          {/* <div className='flex flex-col md:flex-row justify-between gap-4'>
          <PlayerList
            players={players}
            loading={loading}
            handleOpenModal={handleOpenModal}
            handleCloseModal={handleCloseModal}
            showModal={showModal}
            updatePlayerList={updatePlayerList}
          />
          <MatchForm updatePlayerList={updatePlayerList} />
        </div> */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
