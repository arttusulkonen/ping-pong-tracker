import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';

const MatchForm = ({ updatePlayerList }) => {
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

  const calculateElo = (playerRating, opponentRating, score) => {
    const kFactor = 32;
    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
    return Math.round(playerRating + kFactor * (score - expectedScore));
  };

  const updatePlayerRating = async (playerName, newRating) => {
    const playerDoc = players.find((player) => player.name === playerName);
    if (!playerDoc) {
      console.error(`Player ${playerName} not found!`);
      return;
    }
    const playerRef = doc(db, 'players', playerDoc.id);
    await updateDoc(playerRef, {
      rating: newRating,
    });
    updatePlayerList();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const score1Value = parseInt(score1);
    const score2Value = parseInt(score2);
    if (isNaN(score1Value) || isNaN(score2Value)) {
      alert('Please enter valid numbers for scores.');
      return;
    }

    if (!winner) {
      alert('Please select a winner.');
      return;
    }

    try {
      const player1Doc = players.find((player) => player.name === player1);
      const player2Doc = players.find((player) => player.name === player2);

      if (!player1Doc || !player2Doc) {
        alert('Players not found');
        return;
      }

      const player1Rating = player1Doc.rating || 1000;
      const player2Rating = player2Doc.rating || 1000;

      const player1Score = winner === player1 ? 1 : 0;
      const player2Score = winner === player2 ? 1 : 0;

      const newPlayer1Rating = calculateElo(
        player1Rating,
        player2Rating,
        player1Score
      );
      const newPlayer2Rating = calculateElo(
        player2Rating,
        player1Rating,
        player2Score
      );

      await addDoc(collection(db, 'matches'), {
        player1,
        player2,
        score1: score1Value,
        score2: score2Value,
        winner,
        timestamp: new Date(),
      });

      await updatePlayerRating(player1, newPlayer1Rating);
      await updatePlayerRating(player2, newPlayer2Rating);

      setPlayer1('');
      setPlayer2('');
      setScore1('');
      setScore2('');
      setWinner('');
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <div className='block -m-1.5 overflow-x-auto rounded-lg bg-surface-dark shadow-4 p-6'>
      <h2 className='text-xl font-bold mb-4'>Add Match</h2>
      <form onSubmit={handleSubmit}>
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
        <div className='col-start-1 col-span-full font-medium tracking-wider text-lg md:text-2xl flex justify-center mt-8'>
          <button
            type='submit'
            className='font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black mx-4 px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
          >
            Submit Match
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;
