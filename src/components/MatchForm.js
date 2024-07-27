import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';

const MatchForm = ({ updatePlayerList, roomId, playersList }) => {
  // State to manage form inputs and player data
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [winner, setWinner] = useState('');

  // Effect to set players list whenever it changes
  useEffect(() => {
    setPlayers(playersList);
  }, [playersList]);

  // Function to calculate new Elo rating
  // This function takes in the current rating of the player, the rating of the opponent,
  // and the score (1 for a win, 0 for a loss) and returns the new rating of the player.
  const calculateElo = (playerRating, opponentRating, score) => {
    // The kFactor is a constant that determines how sensitive the rating changes are.
    // A higher kFactor means larger changes in rating after each game.
    const kFactor = 32;

    // Calculate the expected score for the player.
    // The expected score is the probability of the player winning against the opponent.
    // The formula is derived from the logistic distribution and takes into account the rating difference.
    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));

    // Calculate the new rating.
    // The new rating is the old rating plus a fraction of the difference between the actual score and the expected score.
    // If the player wins, score = 1, and the new rating will increase.
    // If the player loses, score = 0, and the new rating will decrease.
    // The amount of change depends on the kFactor and the expected score.
    const newRating = playerRating + kFactor * (score - expectedScore);

    // Round the new rating to the nearest whole number.
    return Math.round(newRating);
  };

  // Function to update player's rating in Firestore
  const updatePlayerRating = async (playerId, newRating, matchData) => {
    if (!playerId) {
      console.error('Player ID is undefined');
      return;
    }
    const playerRef = doc(db, 'users', playerId);

    try {
      await updateDoc(playerRef, {
        rating: newRating,
        matches: arrayUnion(matchData), // Adding new match data to matches array
      });
      console.log(`Player ${playerId} updated`);
    } catch (error) {
      console.error(`Error updating player ${playerId}:`, error);
    }
  };

  // Function to update player's room-specific rating
  const updateRoomMemberRating = async (roomId, userId, newRoomRating) => {
    if (!userId) {
      console.error('User ID is undefined');
      return;
    }
    const roomRef = doc(db, 'rooms', roomId);
    try {
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) {
        console.error(`Room ${roomId} not found!`);
        return;
      }
      const roomData = roomDoc.data();
      const updatedMembers = roomData.members.map((member) =>
        member.userId === userId ? { ...member, rating: newRoomRating } : member
      );
      await updateDoc(roomRef, { members: updatedMembers });
      console.log(`Room member ${userId} updated`);
    } catch (error) {
      console.error(`Error updating room member ${userId}:`, error);
    }
  };

  // Function to fetch players from Firestore
  const fetchPlayers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const playerList = [];
    querySnapshot.forEach((doc) => {
      playerList.push({ id: doc.id, ...doc.data() });
    });
    setPlayers(playerList);
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const score1Value = parseInt(score1);
    const score2Value = parseInt(score2);
    if (isNaN(score1Value) || isNaN(score2Value)) {
      alert('Please enter valid numbers for scores.');
      return;
    }

    const winner = score1Value > score2Value ? player1 : player2;

    try {
      const player1Doc = players.find((player) => player.name === player1);
      const player2Doc = players.find((player) => player.name === player2);

      if (!player1Doc || !player2Doc) {
        alert('Players not found');
        return;
      }

      // Get overall ratings from Firestore
      const player1Ref = doc(db, 'users', player1Doc.userId);
      const player2Ref = doc(db, 'users', player2Doc.userId);
      const player1Snapshot = await getDoc(player1Ref);
      const player2Snapshot = await getDoc(player2Ref);
      const player1OverallRating = player1Snapshot.data().rating || 1000;
      const player2OverallRating = player2Snapshot.data().rating || 1000;

      // Determine the score for each player based on the winner
      const player1Score = winner === player1 ? 1 : 0;
      const player2Score = winner === player2 ? 1 : 0;

      // Calculate new ratings using the Elo formula
      const newPlayer1Rating = calculateElo(
        player1OverallRating,
        player2OverallRating,
        player1Score
      );
      const newPlayer2Rating = calculateElo(
        player2OverallRating,
        player1OverallRating,
        player2Score
      );

      // Create match data object
      const matchData = {
        player1: player1Doc.name,
        player2: player2Doc.name,
        score1: score1Value,
        score2: score2Value,
        winner,
        roomId,
        timestamp: new Date(),
      };

      console.log('Adding match:', matchData);
      await addDoc(collection(db, 'matches'), matchData);

      // Calculate earned points for each player
      const player1EarnedPoints = newPlayer1Rating - player1OverallRating;
      const player2EarnedPoints = newPlayer2Rating - player2OverallRating;

      // Update overall ratings in Firestore
      const newOverallPlayer1Rating =
        player1OverallRating + player1EarnedPoints;
      const newOverallPlayer2Rating =
        player2OverallRating + player2EarnedPoints;

      console.log('newOverallPlayer1Rating ' + newOverallPlayer1Rating);

      await updatePlayerRating(
        player1Doc.userId,
        newOverallPlayer1Rating,
        matchData
      );
      await updatePlayerRating(
        player2Doc.userId,
        newOverallPlayer2Rating,
        matchData
      );

      // Update room-specific ratings
      const newRoomPlayer1Rating = player1Doc.rating + player1EarnedPoints;
      const newRoomPlayer2Rating = player2Doc.rating + player2EarnedPoints;

      console.log('newRoomPlayer1Rating ' + newRoomPlayer1Rating);

      await updateRoomMemberRating(
        roomId,
        player1Doc.userId,
        newRoomPlayer1Rating
      );
      await updateRoomMemberRating(
        roomId,
        player2Doc.userId,
        newRoomPlayer2Rating
      );

      // Reset form fields
      setPlayer1('');
      setPlayer2('');
      setScore1('');
      setScore2('');
      setWinner('');

      // Fetch updated player data and update player list
      await fetchPlayers();
      updatePlayerList();
    } catch (error) {
      console.error('Error adding document:', error);
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
                <option key={player.userId} value={player.name}>
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
                <option key={player.userId} value={player.name}>
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
