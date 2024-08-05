import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { db } from '../firebase';

const PlayerList = ({ players, loading, userRole, roomId }) => {
  const [members, setMembers] = useState([]);

  const getHiddenRankExplanations = () => {
    return `
      <div class="tooltip-content p-2 text-base font-outfit">
        <p>Hidden if the player has played less than 5 matches.</p>
        <p>Your rating will be revealed when you have played more than 5 matches.</p>
      </div>
    `;
  };

  useEffect(() => {
    setMembers(players);
  }, [players]);

  const deletePlayer = async (userId) => {
    try {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) {
        const data = roomDoc.data();
        const updatedMembers = data.members.filter(
          (member) => member.userId !== userId
        );

        await updateDoc(doc(db, 'rooms', roomId), {
          members: updatedMembers,
        });

        setMembers(updatedMembers);
      }
    } catch (error) {
      console.error('Error removing document: ', error);
    }
  };

  const calculateWinPercentage = (wins, losses) => {
    const totalMatches = wins + losses;
    return totalMatches === 0 ? 0 : ((wins / totalMatches) * 100).toFixed(2);
  };

  const sortedPlayers = [...members]
    .map((player) => {
      const totalMatches = (player.wins || 0) + (player.losses || 0);
      return {
        ...player,
        totalMatches,
        ratingVisible: totalMatches >= 5,
      };
    })
    .sort((a, b) => {
      if (a.ratingVisible === b.ratingVisible) {
        return b.rating - a.rating;
      }
      return a.ratingVisible ? -1 : 1;
    });

  const rankExplanations = getHiddenRankExplanations();

  return (
    <div className='flex flex-col'>
      <div className='-m-1.5 overflow-x-auto'>
        <div className='p-1.5 min-w-full inline-block align-middle'>
          <div className='overflow-hidden shadow-md'>
            <table className='min-w-full bg-white shadow rounded-lg'>
              <thead>
                <tr>
                  <th
                    scope='col'
                    className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                  >
                    Name
                  </th>
                  <th
                    scope='col'
                    className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                  >
                    Points
                  </th>
                  <th
                    scope='col'
                    className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                  >
                    Matches Played
                  </th>
                  <th
                    scope='col'
                    className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                  >
                    Wins %
                  </th>
                  {(userRole === 'admin' || userRole === 'editor') && (
                    <th
                      scope='col'
                      className='py-3 px-6 bg-gray-200 text-right text-xs font-medium text-gray-700 uppercase tracking-wider'
                    >
                      Action
                    </th>
                  )}
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
                      {(userRole === 'admin' || userRole === 'editor') && (
                        <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                          <div className='h-4 bg-gray-300 rounded w-1/4'></div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : sortedPlayers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className='text-center py-4 text-sm text-gray-700'
                    >
                      No players in this room.
                    </td>
                  </tr>
                ) : (
                  sortedPlayers.map((player) => (
                    <tr key={player.userId}>
                      <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                        <Link
                          to={`/player/${player.userId}`}
                          className='underline hover:text-gray-700'
                        >
                          {player.name}
                        </Link>
                      </td>
                      <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                        {player.ratingVisible ? (
                          <span>{player.rating}</span>
                        ) : (
                          <span
                            data-tooltip-id='rank-tooltip'
                            data-tooltip-html={rankExplanations}
                          >
                            Hidden
                            <Tooltip id='rank-tooltip' />
                          </span>
                        )}
                      </td>
                      <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                        {player.totalMatches}
                      </td>
                      <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                        {player.ratingVisible ? (
                          <span>
                            {calculateWinPercentage(player.wins, player.losses)}
                            %
                          </span>
                        ) : (
                          'Hidden'
                        )}
                      </td>
                      {(userRole === 'admin' || userRole === 'editor') && (
                        <td className='py-4 px-6 flex justify-end text-sm font-medium whitespace-nowrap'>
                          <button
                            onClick={() => deletePlayer(player.userId)}
                            className='flex items-center justify-end bg-gray-100 text-gray-800 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-200 ease-in-out rounded px-2 py-1'
                          >
                            <svg
                              xmlns='http://www.w3.org/2000/svg'
                              className='h-5 w-5 mr-1'
                              viewBox='0 0 20 20'
                              fill='currentColor'
                            >
                              <path
                                fillRule='evenodd'
                                d='M6 2a1 1 0 00-.894.553L4 4H2a1 1 0 100 2h1.46l.52 9.25a2 2 0 001.995 1.75h8.05a2 2 0 001.995-1.75L16.54 6H18a1 1 0 100-2h-2l-1.106-1.447A1 1 0 0014 2H6zM6.2 4l.8 1h6l.8-1H6.2zM5.46 6h9.08l-.52 9.25a1 1 0 01-.998.75H6.978a1 1 0 01-.998-.75L5.46 6z'
                                clipRule='evenodd'
                              />
                            </svg>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerList;
