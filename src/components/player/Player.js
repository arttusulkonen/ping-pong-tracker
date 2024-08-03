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
import { db } from '../../firebase';

const Player = () => {
  const { userId } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getPlayer = async () => {
      try {
        const playerRef = doc(db, 'users', userId);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
          setPlayer({
            ...playerSnap.data(),
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

  return (
    <div className='container mx-auto py-8'>
      <h1 className='text-3xl font-bold mb-6'>Player Profile</h1>
      <div className='bg-white shadow rounded-lg p-6 mb-8'>
        <h2 className='text-2xl font-semibold mb-4 text-gray-700'>
          {loadingPlayer ? 'Loading...' : player?.name}
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
              <strong>Wins:</strong> {player.wins}
            </p>
            <p className='text-gray-700'>
              <strong>Losses:</strong> {player.losses}
            </p>
          </>
        )}
      </div>
      <h2 className='text-2xl font-bold mb-4'>Last Matches</h2>
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
  );
};

export default Player;
