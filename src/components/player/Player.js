import React, { useEffect, useState } from 'react';

import { auth } from '../../firebase';

const Player = () => {
  const [user, setUser] = useState();

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  return (
    <div>
      <h1>Player</h1>
      <p>{user && user.email}</p>
    </div>
  );
};

export default Player;
