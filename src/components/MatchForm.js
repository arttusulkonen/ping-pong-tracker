import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaSpinner, FaTrash } from 'react-icons/fa';
import { Store } from 'react-notifications-component';
import { db } from '../firebase';

const MatchForm = ({ updatePlayerList, roomId, playersList, onMatchAdded }) => {

  const [players, setPlayers] = useState([]); 
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState(''); 
  const [matches, setMatches] = useState([{ score1: '', score2: '' }]); 
  const [loading, setLoading] = useState(false);

  const isFormValid =
    Boolean(player1 && player2) && matches.every((m) => m.score1 && m.score2);

  useEffect(() => {
    setPlayers(playersList);
  }, [playersList]);

  const getFinnishFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}.${minutes}.${seconds}`;
  };

  const calculateElo = (playerRating, opponentRating, score) => {
    const kFactor = 32;
    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
    const newRating = playerRating + kFactor * (score - expectedScore);
    return Math.round(newRating);
  };

  const getRank = (maxRating) => {
    if (maxRating < 1001) return 'Ping Pong Padawan';
    if (maxRating < 1100) return 'Table Tennis Trainee';
    if (maxRating < 1200) return 'Racket Rookie';
    if (maxRating < 1400) return 'Paddle Prodigy';
    if (maxRating < 1800) return 'Spin Sensei';
    if (maxRating < 2000) return 'Smash Samurai';
    return 'Ping Pong Paladin';
  };

  const updatePlayerStats = async (playerId, newRating, wins, losses) => {
    if (!playerId) {
      console.error('Player ID is undefined');
      return;
    }
    const playerRef = doc(db, 'users', playerId);

    try {
      const playerSnapshot = await getDoc(playerRef);
      const playerData = playerSnapshot.data();
      const adjustedRating = Math.round(newRating);

      const newMaxRating = Math.max(
        playerData.maxRating || adjustedRating,
        adjustedRating
      );

      await updateDoc(playerRef, {
        rating: adjustedRating,
        maxRating: newMaxRating,
        wins: wins,
        losses: losses,
        rank: getRank(newMaxRating),
      });
    } catch (error) {
      console.error(`Error updating player ${playerId}:`, error);
    }
  };

  const updateRoomMemberStats = async (
    roomId,
    userId,
    newRoomRating,
    newWins,
    newLosses
  ) => {
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
      const timestamp = getFinnishFormattedDate();

      const updatedMembers = roomData.members.map((member) => {
        if (member.userId === userId) {
          return {
            ...member,
            date: timestamp,
            rating: newRoomRating,
            wins: newWins,
            losses: newLosses,
          };
        }
        return member;
      });
      await updateDoc(roomRef, { members: updatedMembers });
    } catch (error) {
      console.error(`Error updating room member ${userId}:`, error);
    }
  };

  const fetchPlayers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const playerList = [];
    querySnapshot.forEach((doc) => {
      playerList.push({ id: doc.id, ...doc.data() });
    });
    setPlayers(playerList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isFormValid) {
      Store.addNotification({
        title: 'Error',
        message: 'Please fill all required fields before submitting.',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000, onScreen: true },
      });
      setLoading(false);
      return;
    }

    try {
      for (const match of matches) {
        const { score1, score2 } = match;
        const score1Value = parseInt(score1);
        const score2Value = parseInt(score2);
        const timestamp = getFinnishFormattedDate();
        const winner = score1Value > score2Value ? player1 : player2;

        const player1Doc = players.find((player) => player.name === player1);
        const player2Doc = players.find((player) => player.name === player2);

        if (!player1Doc || !player2Doc) {
          Store.addNotification({
            title: 'Error',
            message: 'Please select valid players',
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            animationIn: ['animate__animated', 'animate__fadeIn'],
            animationOut: ['animate__animated', 'animate__fadeOut'],
            dismiss: { duration: 3000, onScreen: true },
          });
          return;
        }

        const player1Ref = doc(db, 'users', player1Doc.userId);
        const player2Ref = doc(db, 'users', player2Doc.userId);
        const player1Snapshot = await getDoc(player1Ref);
        const player2Snapshot = await getDoc(player2Ref);

        const player1OverallRating = player1Snapshot.data().rating || 1000;
        const player2OverallRating = player2Snapshot.data().rating || 1000;
        const player1OverallWins = player1Snapshot.data().wins || 0;
        const player1OverallLosses = player1Snapshot.data().losses || 0;
        const player2OverallWins = player2Snapshot.data().wins || 0;
        const player2OverallLosses = player2Snapshot.data().losses || 0;

        const player1Score = winner === player1 ? 1 : 0;
        const player2Score = winner === player2 ? 1 : 0;

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

        const matchData = {
          player1Id: player1Doc.userId,
          player2Id: player2Doc.userId,
          players: [player1Doc.userId, player2Doc.userId],
          player1: {
            name: player1Doc.name,
            scores: score1Value,
            addedPoints: newPlayer1Rating - player1OverallRating,
            oldRating: player1OverallRating,
            newRating: newPlayer1Rating,
          },
          player2: {
            name: player2Doc.name,
            scores: score2Value,
            addedPoints: newPlayer2Rating - player2OverallRating,
            oldRating: player2OverallRating,
            newRating: newPlayer2Rating,
          },
          timestamp: timestamp,
          roomId: roomId,
          winner: winner,
        };

        await addDoc(collection(db, 'matches'), matchData);

        const player1EarnedPoints = newPlayer1Rating - player1OverallRating;
        const player2EarnedPoints = newPlayer2Rating - player2OverallRating;

        const newOverallPlayer1Rating =
          player1OverallRating + player1EarnedPoints;
        const newOverallPlayer2Rating =
          player2OverallRating + player2EarnedPoints;
        const newPlayer1OverallWins =
          winner === player1 ? player1OverallWins + 1 : player1OverallWins;
        const newPlayer1OverallLosses =
          winner === player1 ? player1OverallLosses : player1OverallLosses + 1;
        const newPlayer2OverallWins =
          winner === player2 ? player2OverallWins + 1 : player2OverallWins;
        const newPlayer2OverallLosses =
          winner === player2 ? player2OverallLosses : player2OverallLosses + 1;

        await updatePlayerStats(
          player1Doc.userId,
          newOverallPlayer1Rating,
          newPlayer1OverallWins,
          newPlayer1OverallLosses
        );
        await updatePlayerStats(
          player2Doc.userId,
          newOverallPlayer2Rating,
          newPlayer2OverallWins,
          newPlayer2OverallLosses
        );

        const roomDoc = await getDoc(doc(db, 'rooms', roomId));
        if (!roomDoc.exists()) {
          console.error(`Room ${roomId} not found!`);
          return;
        }
        const roomData = roomDoc.data();
        const player1RoomData =
          roomData.members.find(
            (member) => member.userId === player1Doc.userId
          ) || {};
        const player2RoomData =
          roomData.members.find(
            (member) => member.userId === player2Doc.userId
          ) || {};

        const newRoomPlayer1Rating = player1RoomData.rating
          ? player1RoomData.rating + player1EarnedPoints
          : player1EarnedPoints;
        const newRoomPlayer2Rating = player2RoomData.rating
          ? player2RoomData.rating + player2EarnedPoints
          : player2EarnedPoints;

        const newPlayer1RoomWins =
          winner === player1
            ? (player1RoomData.wins || 0) + 1
            : player1RoomData.wins || 0;
        const newPlayer1RoomLosses =
          winner === player1
            ? player1RoomData.losses || 0
            : (player1RoomData.losses || 0) + 1;
        const newPlayer2RoomWins =
          winner === player2
            ? (player2RoomData.wins || 0) + 1
            : player2RoomData.wins || 0;
        const newPlayer2RoomLosses =
          winner === player2
            ? player2RoomData.losses || 0
            : (player2RoomData.losses || 0) + 1;

        await updateRoomMemberStats(
          roomId,
          player1Doc.userId,
          newRoomPlayer1Rating,
          newPlayer1RoomWins,
          newPlayer1RoomLosses
        );
        await updateRoomMemberStats(
          roomId,
          player2Doc.userId,
          newRoomPlayer2Rating,
          newPlayer2RoomWins,
          newPlayer2RoomLosses
        );
      }

      setPlayer1('');
      setPlayer2('');
      setMatches([{ score1: '', score2: '' }]);

      await fetchPlayers();
      updatePlayerList();
      onMatchAdded();
    } catch (error) {
      console.error('Error adding document:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMatch = () => {
    setMatches([...matches, { score1: '', score2: '' }]);
  };

  const removeMatch = (index) => {
    const updatedMatches = matches.filter((_, i) => i !== index);
    setMatches(updatedMatches);
  };

  return (
    <div className='block bg-surface-dark rounded-lg'>
      <h2 className='text-2xl font-bold font-outfit text-center mb-6'>
        Add Match
      </h2>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='grid grid-cols-2 gap-4 mb-4'>
          <div>
            <label
              className='block text-sm font-semibold mb-2'
              htmlFor='player1'
            >
              Player 1
            </label>
            <select
              id='player1'
              className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
            >
              <option value=''>Select Player 1</option>
              {players
                .filter((player) => player.name !== player2)
                .map((player) => (
                  <option key={player.userId} value={player.name}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              className='block text-sm font-semibold mb-2'
              htmlFor='player2'
            >
              Player 2
            </label>
            <select
              id='player2'
              className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
            >
              <option value=''>Select Player 2</option>
              {players
                .filter((player) => player.name !== player1)
                .map((player) => (
                  <option key={player.userId} value={player.name}>
                    {player.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {matches.map((match, index) => (
          <div key={index} className='grid grid-cols-2 gap-4 mb-4 relative'>
            <div>
              <input
                type='number'
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
                value={match.score1}
                onChange={(e) =>
                  setMatches(
                    matches.map((m, i) =>
                      i === index ? { ...m, score1: e.target.value } : m
                    )
                  )
                }
                placeholder={`Player 1 Score ${index + 1}`}
              />
            </div>

            <div>
              <input
                type='number'
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
                value={match.score2}
                onChange={(e) =>
                  setMatches(
                    matches.map((m, i) =>
                      i === index ? { ...m, score2: e.target.value } : m
                    )
                  )
                }
                placeholder={`Player 2 Score ${index + 1}`}
              />
            </div>

            {index > 0 && (
              <button
                type='button'
                onClick={() => removeMatch(index)}
                className='text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 absolute top-1/2 transform -translate-y-1/2 -right-6'
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}

        <button
          type='button'
          className='w-full md:w-auto bg-blue-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-600 transition-colors duration-200'
          onClick={addMatch}
        >
          + Add another match
        </button>

        <div className='flex justify-center mt-8'>
          <button
            type='submit'
            className='bg-green-500 text-white font-semibold py-3 px-8 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            disabled={loading || !isFormValid}
          >
            {loading && <FaSpinner className='animate-spin mr-2' />}
            {loading ? 'Submitting...' : 'Submit Match(es)'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;
