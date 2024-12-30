import { collection, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
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
        matchesData.push({ ...data, matchId: doc.id });
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

  const handleDeleteLastMatch = async (match) => {
    try {
      const matchId = match.matchId;

      const { player1, player2, winner } = match;

      const player1Ref = doc(db, 'users', match.player1Id);
      const player2Ref = doc(db, 'users', match.player2Id);

      const player1Snap = await getDoc(player1Ref);
      const player2Snap = await getDoc(player2Ref);

      if (!player1Snap.exists() || !player2Snap.exists()) {
        console.error('One of the players does not exist in users collection.');
        return;
      }
      
      const player1Data = player1Snap.data();
      const player2Data = player2Snap.data();

      const oldP1Rating = match.player1.oleRating ?? match.player1.oldRating;
      const oldP2Rating = match.player2.oldRating ?? match.player2.oleRating;

      let { wins: p1Wins = 0, losses: p1Losses = 0 } = player1Data;
      let { wins: p2Wins = 0, losses: p2Losses = 0 } = player2Data;

      if (winner === player1.name) {
        p1Wins = Math.max(0, p1Wins - 1);
        p2Losses = Math.max(0, p2Losses - 1);
      } else {
        p2Wins = Math.max(0, p2Wins - 1);
        p1Losses = Math.max(0, p1Losses - 1);
      }

      await updateDoc(player1Ref, {
        rating: oldP1Rating,
        wins: p1Wins,
        losses: p1Losses,
      });

      await updateDoc(player2Ref, {
        rating: oldP2Rating,
        wins: p2Wins,
        losses: p2Losses,
        // maxRating: p2Max < oldP2Rating ? oldP2Rating : p2Max
      });

      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const updatedMembers = roomData.members.map((member) => {
          if (member.userId === match.player1Id) {
            const revertedRating = (member.rating ?? 1000) - (player1.addedPoints ?? 0);
            let newWins = member.wins ?? 0;
            let newLosses = member.losses ?? 0;
            if (winner === player1.name) {
              newWins = Math.max(0, newWins - 1);
            } else {
              newLosses = Math.max(0, newLosses - 1);
            }
            return {
              ...member,
              rating: revertedRating,
              wins: newWins,
              losses: newLosses,
            };
          } else if (member.userId === match.player2Id) {
            const revertedRating = (member.rating ?? 1000) - (player2.addedPoints ?? 0);
            let newWins = member.wins ?? 0;
            let newLosses = member.losses ?? 0;
            if (winner === player2.name) {
              newWins = Math.max(0, newWins - 1);
            } else {
              newLosses = Math.max(0, newLosses - 1);
            }
            return {
              ...member,
              rating: revertedRating,
              wins: newWins,
              losses: newLosses,
            };
          }
          return member;
        });

        await updateDoc(roomRef, { members: updatedMembers });
      }

      await deleteDoc(doc(db, 'matches', matchId));
      updateMatches?.();

    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

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
              <th className='py-3 px-6 text-left text-xs font-medium uppercase tracking-wider'>Actions</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200'>
            {loading ? (
              <tr><td>Loading...</td></tr>
            ) : matches.length > 0 ? (
              matches.map((match, index) => {
                const isLatest = index === 0;

                return (
                  <tr key={match.matchId} className={`hover:bg-gray-100 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                      {match.player1.name} - {match.player2.name}
                    </td>
                    <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                      {match.player1.scores} - {match.player2.scores}
                    </td>
                    <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                      {match.player1.addedPoints} | {match.player2.addedPoints}
                    </td>
                    <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                      {match.winner}
                    </td>
                    <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                      {match.timestamp}
                    </td>
                    <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                      {isLatest && (
                        <button
                          onClick={() => handleDeleteLastMatch(match)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className='text-center py-4 text-sm text-gray-700'>
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