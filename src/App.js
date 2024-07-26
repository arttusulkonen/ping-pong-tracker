import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Login from './components/registration/Login';
import Register from './components/registration/Register';
import CreateRoom from './components/rooms/CreateRoom';
import Room from './components/rooms/Room';
import RoomList from './components/rooms/RoomList';
import { auth, db } from './firebase';

function App() {
  const [showModal, setShowModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  // get rooms from firestore
  const updateRoomList = async () => {
    const querySnapshot = await getDocs(collection(db, 'rooms'));
    let roomsData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setRooms(roomsData);
    setLoading(false);
  };

  // const updatePlayerList = async () => {
  //   const querySnapshot = await getDocs(collection(db, 'players'));
  //   let playersData = querySnapshot.docs.map((doc) => ({
  //     id: doc.id,
  //     ...doc.data(),
  //   }));
  //   playersData.sort((a, b) => b.rating - a.rating);
  //   setPlayers(playersData);
  //   setLoading(false);
  // };

  useEffect(() => {
    // updatePlayerList();
    updateRoomList();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className='min-h-screen flex flex-col items-center'>
    <div className='max-w-screen-xl w-full px-4 py-8'>
      <Routes>
        <Route
          path='/'
          element={
            <div className='flex flex-col items-center space-y-4'>
              <div className='w-full rounded-lg p-4'>
                <CreateRoom
                  showModal={showModal}
                  handleOpenModal={handleOpenModal}
                  handleCloseModal={handleCloseModal}
                  currentUser={currentUser}
                />
              </div>
              <div className='w-full bg-white shadow-lg rounded-lg p-4'>
                <RoomList rooms={rooms} loading={loading}/>
              </div>
            </div>
          }
        />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/create-room' element={<CreateRoom />} />
        <Route path='/rooms/:roomId' element={<Room />} />
      </Routes>
    </div>
  </div>
  );
}

export default App;
