import React from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link } from 'react-router-dom';
import { auth, signOut } from '../../firebase';

const Header = () => {
  const [user] = useAuthState(auth);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <header className='bg-gray-800 text-white p-4 flex justify-between items-center'>
      <Link to='/' className='text-2xl font-bold'>
        Ping Pong Tracker
      </Link>
      {user ? (
        <button onClick={handleLogout}>Sign out</button>
      ) : (
        <Link to='/login'>Log in</Link>
      )}
    </header>
  );
};

export default Header;
