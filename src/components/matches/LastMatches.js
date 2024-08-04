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
            {loading ? (
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
                  <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                    {match.player1.name} vs {match.player2.name}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                    {match.player1.scores} - {match.player2.scores}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                    {match.winner}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
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

export default LastMatches;
