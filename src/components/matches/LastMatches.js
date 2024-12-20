import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';

const LastMatches = ({ roomId, updateMatches }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const matchesCollection = collection(db, 'matches');
      const q = query(matchesCollection, where('roomId', '==', roomId));
      const matchesSnapshot = await getDocs(q);

      const matchesData = [];
      matchesSnapshot.forEach((doc) => {
        const data = doc.data();
        matchesData.push(data);
      });

      const sortedMatches = matchesData.sort((a, b) => {
        const [dayA, monthA, yearA, hourA, minuteA, secondA] = a.timestamp.split(/[\s.:]/);
        const [dayB, monthB, yearB, hourB, minuteB, secondB] = b.timestamp.split(/[\s.:]/);

        const dateA = new Date(yearA, monthA - 1, dayA, hourA, minuteA, secondA);
        const dateB = new Date(yearB, monthB - 1, dayB, hourB, minuteB, secondB);

        return dateB - dateA;
      });

      setMatches(sortedMatches);
      setLoading(false);
    };

    fetchMatches();
  }, [roomId, updateMatches]);

  return (
    <div className='py-4'>
      <h2 className='text-xl font-outfit font-bold mb-4 text-center'>Last Matches</h2>
      <div className='overflow-x-auto'>
        <table className='min-w-full bg-white shadow-lg rounded-lg'>
          <thead>
            <tr className='bg-gray-300 text-gray-700'>
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Players</th>
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Scores</th>
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Points</th>
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Winner</th>
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Date</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className='animate-pulse'>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    <div className='h-4 bg-gray-300 rounded w-3/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                  </td>
                </tr>
              ))
            ) : matches.length > 0 ? (
              matches.map((match, index) => (
                <tr key={index} className={`hover:bg-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                    {match.player1.name} - {match.player2.name}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                    {match.player1.scores} - {match.player2.scores}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                    {match.player1.addedPoints} earned : {match.player2.addedPoints} earned
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
                <td colSpan={5} className='text-center py-4 text-sm text-gray-700'>
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

