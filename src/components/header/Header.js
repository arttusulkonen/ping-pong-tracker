import { React, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth, signOut } from '../../firebase';

const Header = () => {
  const [user] = useAuthState(auth);

  const [player, setPlayer] = useState({});

  useEffect(() => {
    if (user) {
      setPlayer({
        id: user?.uid,
        name: user?.displayName,
      });
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
        {user && (
          <Link to={`/player/${player.id}`} className='text-white'>
            Hello, {user?.displayName}
          </Link>
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