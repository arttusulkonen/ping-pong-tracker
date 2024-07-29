import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';

const Player = () => {
  const [user] = useAuthState(auth);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const getPlayer = async () => {
      const playerRef = doc(db, 'users', user.uid);
      const playerSnap = await getDoc(playerRef);
      if (playerSnap.exists()) {
        setPlayer(playerSnap.data());
      }
    };
    if (user) {
      getPlayer();
    }
  }, [user]);

  return (
    <div>
      <h1>Player</h1>

      {player && (
        <div>
          <h2>Hei,{player.name}</h2>

          <p>Rating: {player.rating}</p>
          <p>Wins: {player.wins}</p>
          <p>Losses: {player.losses}</p>
        </div>
      )}
    </div>
  );
};

export default Player;
