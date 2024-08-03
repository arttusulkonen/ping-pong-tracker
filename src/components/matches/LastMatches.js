import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';

const LastMatches = ({ roomId, updateMatches }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const matchesCollection = collection(db, 'matches');
      const q = query(
        matchesCollection,
        where('roomId', '==', roomId),
        orderBy('timestamp', 'desc')
      );
      const matchesSnapshot = await getDocs(q);

      const matchesData = [];
      matchesSnapshot.forEach((doc) => {
        const data = doc.data();
        matchesData.push(data);
      });

      setMatches(matchesData);
      setLoading(false);
    };

    fetchMatches();
  }, [roomId, updateMatches]);

  return (
    <div className='py-4'>
      <h2 className='text-xl font-bold mb-4'>Last Matches</h2>
      <table className='min-w-full divide-y divide-gray-200'>
        <thead className='bg-gray-800'>
          <tr>
            <th
              scope='col'
              className='py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider'
            >
              Players
            </th>
            <th
              scope='col'
              className='py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider'
            >
              Scores
            </th>
            <th
              scope='col'
              className='py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider'
            >
              Winner
            </th>
            <th
              scope='col'
              className='py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider'
            >
              Date
            </th>
          </tr>
        </thead>
        <tbody className='bg-gray-800 divide-y divide-gray-700'>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td className='py-4 px-6 text-sm text-white animate-pulse'>
                  <div className='h-4 bg-gray-600 rounded w-3/4'></div>
                </td>
                <td className='py-4 px-6 text-sm text-white animate-pulse'>
                  <div className='h-4 bg-gray-600 rounded w-1/4'></div>
                </td>
                <td className='py-4 px-6 text-sm text-white animate-pulse'>
                  <div className='h-4 bg-gray-600 rounded w-1/4'></div>
                </td>
                <td className='py-4 px-6 text-sm text-white animate-pulse'>
                  <div className='h-4 bg-gray-600 rounded w-1/4'></div>
                </td>
              </tr>
            ))
          ) : matches.length > 0 ? (
            matches.map((match, index) => (
              <tr key={index}>
                <td className='py-4 px-6 text-sm font-medium text-white whitespace-nowrap'>
                  {match.player1.name} vs {match.player2.name}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.player1.scores} - {match.player2.scores}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.winner}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.timestamp}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className='text-center py-4 text-sm text-white'>
                No matches found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LastMatches;
