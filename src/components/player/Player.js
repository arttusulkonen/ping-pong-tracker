import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { db } from '../../firebase';

const Player = () => {
  const { userId } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState(null);

  const getRank = (rating) => {
    if (rating < 1000) return 'Ping Pong Padawan';
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
        return '🍃'; // Leaf (symbolizes a beginner)
      case 'Table Tennis Trainee':
        return '🐣'; // Chick (symbolizes a trainee)
      case 'Racket Rookie':
        return '🌱'; // Seedling (symbolizes a rookie)
      case 'Paddle Prodigy':
        return '🔥'; // Fire (symbolizes a prodigy)
      case 'Spin Sensei':
        return '🌪️'; // Tornado (symbolizes spin mastery)
      case 'Smash Samurai':
        return '⚔️'; // Crossed Swords (symbolizes a warrior)
      case 'Ping Pong Paladin':
        return '🏅'; // Medal (symbolizes a champion)
      default:
        return '';
    }
  };

  const getAllRankExplanations = () => {
    return `
      <div class="tooltip-content p-2 text-base">
        <div><strong>Ping Pong Padawan:</strong> Less than 1000 points</div>
        <div><strong>Table Tennis Trainee:</strong> 1000-1199 points</div>
        <div><strong>Racket Rookie:</strong> 1200-1399 points</div>
        <div><strong>Paddle Prodigy:</strong> 1400-1599 points</div>
        <div><strong>Spin Sensei:</strong> 1600-1799 points</div>
        <div><strong>Smash Samurai:</strong> 1800-1999 points</div>
        <div><strong>Ping Pong Paladin:</strong> 2000+ points</div>
      </div>
    `;
  };

  useEffect(() => {
    const getPlayer = async () => {
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
    };

    const getMatches = async () => {
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
    };

    if (userId) {
      getPlayer();
      getMatches();
    }
  }, [userId]);

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  const rank = player ? getRank(player.rating) : '';
  const medal = player ? getMedal(rank) : '';
  const rankExplanations = getAllRankExplanations();

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6'>Player Profile</h1>
      <div className='bg-white shadow rounded-lg p-6 mb-8 relative'>
        <h2 className='text-2xl font-semibold mb-4 text-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center'>
          {loadingPlayer ? 'Loading...' : player?.name}
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
              <strong>Total Matches:</strong> {player.totalMatches}
            </p>
            <p className='text-gray-700'>
              <strong>Wins:</strong> {player.wins}
            </p>
            <p className='text-gray-700'>
              <strong>Losses:</strong> {player.losses}
            </p>
            <p className='text-gray-700'>
              <strong>Win Rate:</strong>{' '}
              {((player.wins / player.totalMatches) * 100).toFixed(2)}%
            </p>
          </>
        )}
      </div>

      <h2 className='text-2xl font-bold mb-4'>Last Matches</h2>
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
