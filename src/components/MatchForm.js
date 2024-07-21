import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';

const MatchForm = () => {
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [winner, setWinner] = useState('');

  useEffect(() => {
    const fetchPlayers = async () => {
      const querySnapshot = await getDocs(collection(db, 'players'));
      const playerList = [];
      querySnapshot.forEach((doc) => {
        playerList.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(playerList);
    };

    fetchPlayers();
  }, []);

  return (
    <div className='block -m-1.5 overflow-x-auto rounded-lg bg-surface-dark shadow-4'>
      <h2 className='text-xl font-bold mb-4'>Add Match</h2>
      <form>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='player1'>
            Player 1
          </label>
          <div className='flex gap-2'>
            <select
              className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2 capitalize'
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
            >
              <option value=''>Select a player 1</option>
              {players.map((player) => (
                <option key={player.id} value={player.name}>
                  {player.name}
                </option>
              ))}
            </select>
            <input
              type='number'
              className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2'
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              placeholder='Score'
            />
          </div>
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='player2'>
            Player 2
          </label>
          <div className='flex gap-2'>
            <select
              className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2 capitalize'
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
            >
              <option value=''>Select a player 2</option>
              {players.map((player) => (
                <option key={player.id} value={player.name}>
                  {player.name}
                </option>
              ))}
            </select>
            <input
              type='number'
              className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2'
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder='Score'
            />
          </div>
        </div>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='winner'>
            Winner
          </label>
          <select
            id='winner'
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2 capitalize'
          >
            <option value=''>Select Winner</option>
            {player1 && <option value={player1}>{player1}</option>}
            {player2 && <option value={player2}>{player2}</option>}
          </select>
        </div>
        <button
          type='submit'
          className='bg-blue-500 text-white px-4 py-2 rounded w-full mt-4'
        >
          Submit Match
        </button>
      </form>
    </div>
  );
};

export default MatchForm;
