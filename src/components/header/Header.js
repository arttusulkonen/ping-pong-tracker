import { collection, getDocs, query, where } from 'firebase/firestore';
import { React, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth, signOut, db } from '../../firebase';

const Header = () => {
  const [user] = useAuthState(auth);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchPlayer = async () => {
        setLoading(true); 
        const playersRef = collection(db, 'users');
        const q = query(playersRef, where('id', '==', user.uid));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          setPlayer({ id: doc.id, ...doc.data() });
        });
        setLoading(false);
      };
      fetchPlayer();
    } else {
      setLoading(false);
    }
  }, [user]);

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
        {loading ? (
          <div className='text-white animate-pulse'>
            <div className='h-4 bg-gray-700 rounded w-24'></div>
          </div>
        ) : (
          user &&
          player && (
            <Link to={`/player/${player.id}`} className='text-white'>
              Hello, {player.name}
            </Link>
          )
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
