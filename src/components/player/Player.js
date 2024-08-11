import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  setDoc,
} from 'firebase/firestore';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { Store } from 'react-notifications-component';
import { db, auth } from '../../firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  faLeaf,
  faMedal,
  faStar,
  faFireAlt,
  faCrown,
  faShieldAlt,
  faTrophy,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';

const Player = ({ onNameUpdate }) => {
  const { userId } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [maxWinStreak, setMaxWinStreak] = useState(0);
  const [currentWinStreak, setCurrentWinStreak] = useState(0);
  const [error, setError] = useState(null);
  const [displayInput, setDisplayInput] = useState(false);
  const [user] = useAuthState(auth);

  const getRank = (rating) => {
    if (rating < 1001) return 'Ping Pong Padawan';
    if (rating < 1200) return 'Table Tennis Trainee';
    if (rating < 1400) return 'Racket Rookie';
    if (rating < 1600) return 'Paddle Prodigy';
    if (rating < 1800) return 'Spin Sensei';
    if (rating < 2000) return 'Smash Samurai';
    return 'Ping Pong Paladin';
  };

  const getMedal = (rank) => {
    switch (rank) {
      case 'Ping Pong Padawan':
        return <FontAwesomeIcon icon={faLeaf} />;
      case 'Table Tennis Trainee':
        return <FontAwesomeIcon icon={faMedal} />;
      case 'Racket Rookie':
        return <FontAwesomeIcon icon={faStar} />;
      case 'Paddle Prodigy':
        return <FontAwesomeIcon icon={faFireAlt} />;
      case 'Spin Sensei':
        return <FontAwesomeIcon icon={faCrown} />;
      case 'Smash Samurai':
        return <FontAwesomeIcon icon={faShieldAlt} />;
      case 'Ping Pong Paladin':
        return <FontAwesomeIcon icon={faTrophy} />;
      default:
        return null;
    }
  };

  const getAllRankExplanations = () => {
    return `
      <div class="tooltip-content font-outfit p-2 text-base">
        <div><strong>Ping Pong Padawan:</strong> Less than 1001 points</div>
        <div><strong>Table Tennis Trainee:</strong> 1001-1199 points</div>
        <div><strong>Racket Rookie:</strong> 1200-1399 points</div>
        <div><strong>Paddle Prodigy:</strong> 1400-1599 points</div>
        <div><strong>Spin Sensei:</strong> 1600-1799 points</div>
        <div><strong>Smash Samurai:</strong> 1800-1999 points</div>
        <div><strong>Ping Pong Paladin:</strong> 2000+ points</div>
      </div>
    `;
  };

  const handleEditClick = () => {
    setDisplayInput(!displayInput);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();

    if (!player.name.trim()) {
      Store.addNotification({
        title: 'Update failed',
        message: 'Name cannot be empty or just spaces.',
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

    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      let isNicknameTaken = false;

      usersSnapshot.forEach((doc) => {
        if (doc.data().name.toLowerCase() === player.name.toLowerCase()) {
          isNicknameTaken = true;
        }
      });

      if (isNicknameTaken) {
        throw new Error('4');
      }

      await setDoc(doc(db, 'users', userId), {
        ...player,
        name: player.name,
      });

      const roomsCollection = collection(db, 'rooms');
      const roomsSnapshot = await getDocs(roomsCollection);
      roomsSnapshot.forEach(async (roomDoc) => {
        const roomData = roomDoc.data();
        const updatedMembers = roomData.members.map((member) =>
          member.userId === userId ? { ...member, name: player.name } : member
        );

        await setDoc(doc(db, 'rooms', roomDoc.id), {
          ...roomData,
          members: updatedMembers,
        });
      });

      const matchesCollection = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesCollection);
      matchesSnapshot.forEach(async (matchDoc) => {
        const matchData = matchDoc.data();
        let updatedMatch = { ...matchData };

        if (matchData.player1Id === userId) {
          updatedMatch = {
            ...matchData,
            player1: { ...matchData.player1, name: player.name },
          };
        }

        if (matchData.player2Id === userId) {
          updatedMatch = {
            ...matchData,
            player2: { ...matchData.player2, name: player.name },
          };
        }

        await setDoc(doc(db, 'matches', matchDoc.id), updatedMatch);
      });

      onNameUpdate(player.name);

      Store.addNotification({
        title: 'Success',
        message: 'Name updated successfully in all collections.',
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: {
          duration: 3000,
          onScreen: true,
        },
      });
    } catch (error) {
      if (error.message === '4') {
        Store.addNotification({
          title: 'Update failed',
          message: 'Nickname is already taken. Please choose another one.',
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
      }
    } finally {
      setDisplayInput(false);
      await fetchMatches(); // Refresh matches
    }
  };

  const fetchPlayer = useCallback(async () => {
    try {
      const playerRef = doc(db, 'users', userId);
      const playerSnap = await getDoc(playerRef);

      if (playerSnap.exists()) {
        setPlayer({
          ...playerSnap.data(),
          totalMatches: playerSnap.data().wins + playerSnap.data().losses,
          id: userId,
        });
      } else {
        setError('Player not found');
      }
    } catch (err) {
      setError('Error fetching player data');
    } finally {
      setLoadingPlayer(false);
    }
  }, [userId]);

  const fetchMatches = useCallback(async () => {
    try {
      const matchesCollection = collection(db, 'matches');
      const q = query(
        matchesCollection,
        where('players', 'array-contains', userId),
        orderBy('timestamp', 'desc')
      );
      const matchesSnapshot = await getDocs(q);
      const matchesData = matchesSnapshot.docs.map((doc) => doc.data());

      setMatches(matchesData);
    } catch (err) {
      setError('Error fetching matches');
    } finally {
      setLoadingMatches(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchPlayer();
      fetchMatches();
    }
  }, [userId, fetchPlayer, fetchMatches]);

  useEffect(() => {
    const calculateWinStreaks = () => {
      let maxWinStreak = 0;
      let currentWinStreak = 0;
      let tempCurrentWinStreak = 0;

      const sortedMatches = [...matches].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      for (let match of sortedMatches) {
        const isWinner =
          (match.player1Id === userId && match.winner === match.player1.name) ||
          (match.player2Id === userId && match.winner === match.player2.name);

        if (isWinner) {
          tempCurrentWinStreak++;
        } else {
          break;
        }
      }

      currentWinStreak = tempCurrentWinStreak;

      let tempMaxWinStreak = 0;
      for (let match of sortedMatches) {
        const isWinner =
          (match.player1Id === userId && match.winner === match.player1.name) ||
          (match.player2Id === userId && match.winner === match.player2.name);

        if (isWinner) {
          tempMaxWinStreak++;
          if (tempMaxWinStreak > maxWinStreak) {
            maxWinStreak = tempMaxWinStreak;
          }
        } else {
          tempMaxWinStreak = 0;
        }
      }

      setMaxWinStreak(maxWinStreak);
      setCurrentWinStreak(currentWinStreak);
    };

    calculateWinStreaks();
  }, [matches, userId]);

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  const rank = player ? getRank(player.rating) : '';
  const medal = player ? getMedal(rank) : '';
  const rankExplanations = getAllRankExplanations();

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-outfit font-bold mb-6'>Player Profile</h1>
      <div className='bg-white shadow rounded-lg p-6 mb-8 relative'>
        <h2 className='text-2xl font-outfit font-bold mb-4 text-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center'>
          <div>
            <span>{player ? player.name : 'Player Name'}</span>
            {userId && user?.uid === userId && (
              <>
                <button
                  onClick={handleEditClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                {displayInput && (
                  <>
                    <input
                      type='text'
                      className='border border-gray-300 rounded px-2 py-1 ml-2'
                      value={player ? player.name : ''}
                      onChange={(e) =>
                        setPlayer({ ...player, name: e.target.value })
                      }
                    />
                    <button
                      onClick={handleSaveName}
                      className='bg-blue-500 text-white rounded px-2 py-1 ml-2'
                    >
                      Save
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {rank && (
            <div className='flex items-center mt-2 sm:mt-0'>
              <span
                className='text-lg font-bold mr-2'
                data-tooltip-id='rank-tooltip'
                data-tooltip-html={rankExplanations}
              >
                {rank}
              </span>
              <span className='text-2xl'>{medal}</span>
              <Tooltip id='rank-tooltip' />
            </div>
          )}
        </h2>
        {loadingPlayer ? (
          <div className='animate-pulse'>
            <div className='h-4 bg-gray-300 rounded w-3/4 mb-4'></div>
            <div className='h-4 bg-gray-300 rounded w-1/2 mb-4'></div>
            <div className='h-4 bg-gray-300 rounded w-1/4 mb-4'></div>
          </div>
        ) : (
          <>
            <p className='text-gray-700'>
              <strong>Rating:</strong> {player.rating}
            </p>
            <p className='text-gray-700'>
              <strong>Total Matches:</strong>{' '}
              {player.totalMatches ? player.totalMatches : 0}
            </p>
            <p className='text-gray-700'>
              <strong>Wins:</strong> {player.wins ? player.wins : 0}
            </p>
            <p className='text-gray-700'>
              <strong>Losses:</strong> {player.losses ? player.losses : 0}
            </p>
            <p className='text-gray-700'>
              <strong>Win Rate:</strong>{' '}
              {player.totalMatches
                ? `${((player.wins / player.totalMatches) * 100).toFixed(2)}%`
                : '0%'}
            </p>

            <p className='text-gray-700'>
              <strong>Current Win Streak:</strong> {currentWinStreak}
            </p>
            <p className='text-gray-700'>
              <strong>Max Win Streak:</strong> {maxWinStreak}
            </p>
          </>
        )}
      </div>

      <h2 className='text-2xl font-outfit font-bold mb-4'>Last Matches</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full bg-white shadow rounded-lg'>
          <thead>
            <tr>
              <th className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                Players
              </th>
              <th className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                Scores
              </th>
              <th className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                Winner
              </th>
              <th className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                Date
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {loadingMatches ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                    <div className='h-4 bg-gray-300 rounded w-3/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                </tr>
              ))
            ) : matches.length > 0 ? (
              matches.map((match, index) => (
                <tr key={index}>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.player1.name} vs {match.player2.name}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.player1.scores} - {match.player2.scores}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.winner}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.timestamp}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className='text-center py-4 text-sm text-gray-700'
                >
                  No matches found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Player;
