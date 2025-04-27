import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ReactNotifications } from 'react-notifications-component';
import { Route, Routes } from 'react-router-dom';
import Player from './components/player/Player';
import PlayersTable from './components/PlayersTable';
import ResetPassword from './components/registration/forgot-password';
import Login from './components/registration/Login';
import Register from './components/registration/Register';
import CreateRoom from './components/rooms/CreateRoom';
import Room from './components/rooms/Room';
import RoomList from './components/rooms/RoomList';
import TournamentRoom from './components/rooms/TournamentRoom'; // We'll create this
import TournamentRoomList from './components/rooms/TournamentRoomList'; // We'll create this
import WelcomePage from './components/WelcomePage';
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

  const updateRoomList = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'rooms'));
      let roomsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRooms(roomsData);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateRoomList();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className='min-h-screen flex flex-col items-center'>
      <ReactNotifications />
      <div className='max-w-screen-xl w-full px-4 py-8'>
        <Routes>
          <Route
            path='/'
            element={
              currentUser ? (
                <div className='flex flex-col items-center space-y-4'>
                  <div className='w-full p-4'>
                    <CreateRoom
                      showModal={showModal}
                      handleOpenModal={handleOpenModal}
                      handleCloseModal={handleCloseModal}
                      currentUser={currentUser}
                    />
                  </div>
                  <div className='w-full'>
                    <RoomList 
                      rooms={rooms} 
                      loading={loading} 
                      currentUserId={currentUser?.uid}
                    />
                  </div>
                  <div className='w-full mt-4'>
                    <TournamentRoomList currentUserId={currentUser?.uid} />
                  </div>
                  <div className='w-full mt-8'>
                    <PlayersTable />
                  </div>
                </div>
              ) : (
                <WelcomePage />
              )
            }
          />
          <Route path='/player/:userId' element={<Player />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<ResetPassword />} />
          <Route path='/create-room' element={<CreateRoom />} />
          <Route path='/rooms/:roomId' element={<Room />} />
          {/* New route for Tournaments */}
          <Route path='/tournaments/:tournamentId' element={<TournamentRoom />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;