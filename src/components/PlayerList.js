import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { db } from '../firebase';

const PlayerList = ({ players, loading, userRole, roomId }) => {
  const [members, setMembers] = useState([]);
  const [updatedStats, setUpdatedStats] = useState({});

  const getHiddenRankExplanations = () => {
    return `
      <div class="tooltip-content p-2 text-base font-outfit">
        <p>Hidden if the player has played less than 5 matches.</p>
        <p>Your rating will be revealed when you have played more than 5 matches.</p>
      </div>
    `;
  };

  const calculateStatsForRoom = useCallback(
    async (roomId) => {
      try {
        const q = query(
          collection(db, 'matches'),
          where('roomId', '==', roomId)
        );
        const matchesSnapshot = await getDocs(q);

        const playerStats = {};

        matchesSnapshot.forEach((doc) => {
          const match = doc.data();
          const { player1, player2, winner } = match;

          const player1Member = members.find(
            (member) => member.userId === match.player1Id
          );
          const player2Member = members.find(
            (member) => member.userId === match.player2Id
          );

          if (!player1Member || !player2Member) {
            console.warn(
              'Игрок не найден в members:',
              match.player1Id,
              match.player2Id
            );
            return;
          }

          if (!playerStats[match.player1Id]) {
            playerStats[match.player1Id] = {
              name: player1.name,
              wins: 0,
              losses: 0,
              rating: 1000,
            };
          }
          if (!playerStats[match.player2Id]) {
            playerStats[match.player2Id] = {
              name: player2.name,
              wins: 0,
              losses: 0,
              rating: 1000,
            };
          }

          playerStats[match.player1Id].rating += player1.addedPoints;
          if (winner === player1.name) {
            playerStats[match.player1Id].wins += 1;
          } else {
            playerStats[match.player1Id].losses += 1;
          }

          playerStats[match.player2Id].rating += player2.addedPoints;
          if (winner === player2.name) {
            playerStats[match.player2Id].wins += 1;
          } else {
            playerStats[match.player2Id].losses += 1;
          }
        });

        const updatedMembers = members.map((member) => {
          const stats = playerStats[member.userId] || {
            wins: 0,
            losses: 0,
            rating: 1000,
          };
          return {
            ...member,
            wins: stats.wins,
            losses: stats.losses,
            rating: stats.rating,
          };
        });

        setUpdatedStats(updatedMembers);
      } catch (error) {
        console.error('Error fetching matches: ', error);
      }
    },
    [members]
  );

  useEffect(() => {
    setMembers(players);
    if (roomId) {
      calculateStatsForRoom(roomId);
    }
  }, [players, roomId, calculateStatsForRoom]);

  const getRankUrl = (totalRating) => {
    const rankUrls = [
      'https://bekindcult.fi/wp-content/uploads/2024/10/ping-pong-padawan.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/table-tennis-trainee.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/racket-rookie.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/paddle-prodigy.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/spin-sensei.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/smash-samurai.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/ping-pong-paladin.png',
    ];

    if (totalRating < 1001) {
      return rankUrls[0];
    } else if (totalRating < 1100) {
      return rankUrls[1];
    } else if (totalRating < 1200) {
      return rankUrls[2];
    } else if (totalRating < 1400) {
      return rankUrls[3];
    } else if (totalRating < 1800) {
      return rankUrls[4];
    } else if (totalRating < 2000) {
      return rankUrls[5];
    } else {
      return rankUrls[6];
    }
  };

  const getCachedImageUrl = (userId, rating) => {
    const cacheKey = `imageUrl-${userId}-${rating}`;
    const cachedUrl = localStorage.getItem(cacheKey);

    if (cachedUrl) {
      return cachedUrl;
    } else {
      const newUrl = getRankUrl(rating);
      localStorage.setItem(cacheKey, newUrl);
      return newUrl;
    }
  };

  const updateRoomMembers = async () => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        console.error(`Room with ID ${roomId} not found.`);
        return;
      }

      const roomData = roomDoc.data();
      const updatedMembers = updatedStats.map((player) => ({
        ...roomData.members.find((m) => m.userId === player.userId),
        wins: player.wins,
        losses: player.losses,
        rating: player.rating,
      }));

      await updateDoc(roomRef, {
        members: updatedMembers,
      });

      console.log('Room data updated successfully.');
    } catch (error) {
      console.error('Error updating room members:', error);
    }
  };

  const deletePlayerConfirmationModal = (userId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      deletePlayer(userId);
    }
  };

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
            <table className='min-w-full bg-white shadow'>
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
                  sortedPlayers.map(
                    (player) => (
                      console.log(
                        'player',
                        player.userId,
                        player.totalRating
                      ),
                      (
                        <tr
                          key={player.userId}
                          className='hover:bg-gray-50 transition duration-200 ease-in-out'
                        >
                          <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                            <div className='flex items-center space-x-3'>
                              {player.ratingVisible ? (
                                <LazyLoadImage
                                  src={getCachedImageUrl(
                                    player.userId,
                                    player.totalRating
                                  )}
                                  alt={player.name}
                                  className='h-8 w-8 mr-2'
                                  effect='opacity'
                                  placeholderSrc='https://bekindcult.fi/wp-content/uploads/2024/10/unknown-1.webp'
                                />
                              ) : (
                                <LazyLoadImage
                                  src='https://bekindcult.fi/wp-content/uploads/2024/10/unknown-1.webp'
                                  alt={player.name}
                                  className='h-8 w-8 mr-2'
                                  effect='opacity'
                                />
                              )}
                              <Link
                                to={`/player/${player.userId}`}
                                className='text-lg font-semibold hover:text-blue-600 transition duration-200'
                              >
                                {player.name}
                              </Link>
                            </div>
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
                                {calculateWinPercentage(
                                  player.wins,
                                  player.losses
                                )}
                                %
                              </span>
                            ) : (
                              'Hidden'
                            )}
                          </td>
                          {(userRole === 'admin' || userRole === 'editor') && (
                            <td className='py-4 px-6 flex justify-end text-sm font-medium whitespace-nowrap'>
                              <button
                                onClick={() =>
                                  deletePlayerConfirmationModal(player.userId)
                                }
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
                      )
                    )
                  )
                )}
              </tbody>
            </table>

            {(userRole === 'admin' || userRole === 'editor') && (
              <div className='flex justify-end mt-4 hidden'>
                <button
                  onClick={updateRoomMembers}
                  className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none'
                >
                  Update Room Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerList;
