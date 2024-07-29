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
        where('match.roomId', '==', roomId),
        orderBy('match.timestamp', 'desc')
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

  if (loading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='loader'></div>Loading...
      </div>
    );
  }

  return (
    <div className='max-h-96 overflow-y-auto py-4'>
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
          {matches.length > 0 ? (
            matches.map((match, index) => (
              <tr key={index}>
                <td className='py-4 px-6 text-sm font-medium text-white whitespace-nowrap'>
                  {match.match.player1.name} vs {match.match.player2.name}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.match.player1.scores} - {match.match.player2.scores}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.match.winner}
                </td>
                <td className='py-4 px-6 text-sm text-white whitespace-nowrap'>
                  {match.match.timestamp}
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
