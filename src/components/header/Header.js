import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { React, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth, signOut, db } from '../../firebase';

const Header = () => {
  const [user, loading] = useAuthState(auth);
  const [player, setPlayer] = useState({});
  const [playerLoading, setPlayerLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      if (loading) {
        console.log("User is still loading.");
        return; 
      }

      if (!user) {
        console.log("No user is logged in.");
        setPlayerLoading(false); 
        return;
      }

      console.log('Fetching player data');
      try {
        const playersRef = collection(db, 'users');
        const q = query(playersRef, where('id', '==', user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.log('No matching player found');
        } else {
          querySnapshot.forEach((doc) => {
            setPlayer({ id: doc.id, ...doc.data() });
            console.log('Player data:', doc.data());
          });
        }

        setPlayerLoading(false); 
      } catch (error) {
        console.error("Error fetching player data: ", error);
        setPlayerLoading(false); 
      }
    };

    fetchPlayer();
  }, [user, loading]);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className='bg-gray-800 text-white p-4 flex justify-between items-center'>
      <div className='flex items-center space-x-4'>
        <Link to='/' className='text-2xl font-outfit font-bold'>
          Ping Pong Tracker
        </Link>
      </div>
      <div className='flex items-center gap-4'>
        {playerLoading ? (
          <div>Loading...</div>
        ) : user && player?.name ? (
          <Link to={`/player/${player.id}`} className='text-white'>
            Hello, {player.name}
          </Link>
        ) : (
          <div>No user data available</div>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
          >
            Sign out
          </button>
        ) : (
          <Link
            to='/login'
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
};

export default Header;

