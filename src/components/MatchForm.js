import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Store } from 'react-notifications-component';
import { db } from '../firebase';

const MatchForm = ({ updatePlayerList, roomId, playersList, onMatchAdded }) => {
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');

  useEffect(() => {
    setPlayers(playersList);
  }, [playersList]);

  const getFinnishFormattedDate = () => {
    return new Date().toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki' });
  };

  const calculateElo = (playerRating, opponentRating, score) => {
    const kFactor = 32;
    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
    const newRating = playerRating + kFactor * (score - expectedScore);
    return Math.round(newRating);
  };

  const getRank = (rating) => {
    if (rating < 1001) return 'Ping Pong Padawan';
    if (rating < 1200) return 'Table Tennis Trainee';
    if (rating < 1400) return 'Racket Rookie';
    if (rating < 1600) return 'Paddle Prodigy';
    if (rating < 1800) return 'Spin Sensei';
    if (rating < 2000) return 'Smash Samurai';
    return 'Ping Pong Paladin';
  };


  const updatePlayerStats = async (playerId, newRating, wins, losses) => {
    if (!playerId) {
      console.error('Player ID is undefined');
      return;
    }
    const playerRef = doc(db, 'users', playerId);

    try {
      await updateDoc(playerRef, {
        rating: newRating,
        wins: wins,
        losses: losses,
        rank: getRank(newRating),
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

    const score1Value = parseInt(score1);
    const score2Value = parseInt(score2);

    const timestamp = getFinnishFormattedDate();

    const winner = score1Value > score2Value ? player1 : player2;

    try {
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
          dismiss: {
            duration: 3000,
            onScreen: true,
          },
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
        },
        player2: {
          name: player2Doc.name,
          scores: score2Value,
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

      setPlayer1('');
      setPlayer2('');
      setScore1('');
      setScore2('');

      await fetchPlayers();
      updatePlayerList();
      onMatchAdded();
    } catch (error) {
      console.error('Error adding document:', error);
    }
  };

  return (
    <div className='block -m-1.5 overflow-x-auto bg-surface-dark shadow-4 py-6'>
      <h2 className='text-xl font-bold mb-4'>Add Match</h2>
      <form onSubmit={handleSubmit}>
        <div className='mb-4'>
          <label className='block text-sm font-bold mb-2' htmlFor='player1'>
            Player 1
          </label>
          <div className='flex flex-col md:flex-row gap-2'>
            <select
              className='w-full bg-surface-light text-black px-4 py-2 border-black border-2 capitalize'
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
              className='w-full bg-surface-light text-black px-4 py-2 border-black border-2'
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
          <div className='flex flex-col md:flex-row gap-2'>
            <select
              className='w-full bg-surface-light text-black px-4 py-2 border-black border-2 capitalize'
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
              className='w-full bg-surface-light text-black px-4 py-2 border-black border-2'
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder='Score'
            />
          </div>
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
