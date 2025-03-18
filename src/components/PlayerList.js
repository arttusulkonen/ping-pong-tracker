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
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { db } from '../firebase';

const PlayerList = ({ currentUserId, players, loading, userRole, roomId }) => {
  const [members, setMembers] = useState([]);
  const [updatedStats, setUpdatedStats] = useState({});
  const [isFiltered, setIsFiltered] = useState(false);
  const [viewMode, setViewMode] = useState('regular');
  const [seasonHistory, setSeasonHistory] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'rating',
    direction: 'descending',
  });

  // State to handle a small delay on rendering admin controls
  const [isReadyForOwnerTools, setIsReadyForOwnerTools] = useState(false);

  useEffect(() => {
    // We do a small timeout after the component mounts or updates,
    // so that we can confirm we have the currentUserId loaded
    const timer = setTimeout(() => {
      setIsReadyForOwnerTools(true);
    }, 500);

    // Clear the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, [currentUserId]);

  const parseTimestamp = (tsStr) => {
    const [datePart, timePart] = tsStr.split(' ');
    if (!datePart || !timePart) return null;
    const [DD, MM, YYYY] = datePart.split('.');
    const [HH, min, sec] = timePart.split('.');
    return new Date(
      Number(YYYY),
      Number(MM) - 1,
      Number(DD),
      Number(HH),
      Number(min),
      Number(sec)
    );
  };

  const finishSeason = async () => {
    try {
      if (!roomId) return;
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) return;
      const roomData = roomSnap.data();

      const matchesRef = collection(db, 'matches');
      const qMatches = query(matchesRef, where('roomId', '==', roomId));
      const matchesSnap = await getDocs(qMatches);
      const matches = matchesSnap.docs.map((docSnap) => docSnap.data());
      if (matches.length === 0) return;

      const statsByUser = {};
      for (const match of matches) {
        const { player1, player2, winner, timestamp } = match;
        const p1Id = match.player1Id;
        const p2Id = match.player2Id;

        if (!statsByUser[p1Id]) {
          statsByUser[p1Id] = {
            userId: p1Id,
            name: player1.name || 'Unknown',
            wins: 0,
            losses: 0,
            totalAddedPoints: 0,
            matches: [],
            rating: player1.rating || 1000,
          };
        }
        if (!statsByUser[p2Id]) {
          statsByUser[p2Id] = {
            userId: p2Id,
            name: player2.name || 'Unknown',
            wins: 0,
            losses: 0,
            totalAddedPoints: 0,
            matches: [],
            rating: player2.rating || 1000,
          };
        }
        if (winner === player1.name) {
          statsByUser[p1Id].wins++;
          statsByUser[p2Id].losses++;
        } else if (winner === player2.name) {
          statsByUser[p2Id].wins++;
          statsByUser[p1Id].losses++;
        }
        statsByUser[p1Id].totalAddedPoints += player1.addedPoints || 0;
        statsByUser[p2Id].totalAddedPoints += player2.addedPoints || 0;

        statsByUser[p1Id].matches.push({
          timestamp: timestamp,
          isWinner: winner === player1.name,
        });
        statsByUser[p2Id].matches.push({
          timestamp: timestamp,
          isWinner: winner === player2.name,
        });
      }

      let playersStats = Object.values(statsByUser).map((obj) => {
        const matchesPlayed = obj.wins + obj.losses;
        return { ...obj, matchesPlayed };
      });

      for (const p of playersStats) {
        p.matches.sort((a, b) => {
          const dA = parseTimestamp(a.timestamp);
          const dB = parseTimestamp(b.timestamp);
          if (!dA || !dB) return 0;
          return dA - dB;
        });
        let currentStreak = 0;
        let maxStreak = 0;
        for (const m of p.matches) {
          if (m.isWinner) {
            currentStreak++;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
            }
          } else {
            currentStreak = 0;
          }
        }
        p.longestWinStreak = maxStreak;
      }

      const totalMatches = playersStats.reduce(
        (acc, p) => acc + p.matchesPlayed,
        0
      );
      const averageMatches =
        playersStats.length > 0 ? totalMatches / playersStats.length : 0;

      playersStats = playersStats.map((p) => {
        const baseScore = p.wins * 2 + p.rating * 0.1;
        let normalizedAddedPoints = p.totalAddedPoints;
        if (p.matchesPlayed > averageMatches && averageMatches !== 0) {
          const excessRatio = p.matchesPlayed / averageMatches;
          normalizedAddedPoints /= excessRatio;
        }
        let finalScore = baseScore + normalizedAddedPoints;
        if (p.matchesPlayed < averageMatches) {
          finalScore *= 0.9;
        }
        return { ...p, finalScore };
      });

      playersStats.sort((a, b) => b.finalScore - a.finalScore);
      playersStats.forEach((p, idx) => {
        p.place = idx + 1;
      });

      const now = new Date().toLocaleString('fi-FI');
      const seasonResult = playersStats.map((p) => ({
        userId: p.userId,
        name: p.name,
        place: p.place,
        matchesPlayed: p.matchesPlayed,
        wins: p.wins,
        losses: p.losses,
        totalAddedPoints: p.totalAddedPoints,
        finalScore: p.finalScore,
        longestWinStreak: p.longestWinStreak,
      }));

      const newHistoryEntry = {
        dateFinished: now,
        summary: seasonResult,
      };

      let currentSeasonHistory = roomData.seasonHistory || [];
      if (!Array.isArray(currentSeasonHistory)) {
        currentSeasonHistory = [];
      }
      currentSeasonHistory.push(newHistoryEntry);
      await updateDoc(roomRef, { seasonHistory: currentSeasonHistory });

      // Optionally achievements
      for (const p of playersStats) {
        const userRef = doc(db, 'users', p.userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) continue;
        const userData = userSnap.data();
        const achievements = Array.isArray(userData.achievements)
          ? userData.achievements
          : [];
        const newAchievement = {
          type: 'seasonFinish',
          roomId,
          roomName: roomData.name || 'Unknown Room',
          dateFinished: now,
          place: p.place,
          matchesPlayed: p.matchesPlayed,
          wins: p.wins,
          losses: p.losses,
          totalAddedPoints: p.totalAddedPoints,
          finalScore: p.finalScore,
          longestWinStreak: p.longestWinStreak,
        };
        achievements.push(newAchievement);
        await updateDoc(userRef, { achievements });
      }
    } catch (error) {
      console.error('Error finalizing the season:', error);
    }
  };

  const calculateStatsForRoom = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const qMatches = query(
          collection(db, 'matches'),
          where('roomId', '==', id)
        );
        const matchesSnapshot = await getDocs(qMatches);
        const playerStats = {};
        matchesSnapshot.forEach((docSnap) => {
          const match = docSnap.data();
          const { player1, player2, winner } = match;
          const p1 = members.find((m) => m.userId === match.player1Id);
          const p2 = members.find((m) => m.userId === match.player2Id);
          if (!p1 || !p2) return;
          if (!playerStats[match.player1Id]) {
            playerStats[match.player1Id] = {
              name: player1.name || 'Unknown',
              wins: 0,
              losses: 0,
              rating: 1000,
            };
          }
          if (!playerStats[match.player2Id]) {
            playerStats[match.player2Id] = {
              name: player2.name || 'Unknown',
              wins: 0,
              losses: 0,
              rating: 1000,
            };
          }
          playerStats[match.player1Id].rating += player1.addedPoints ?? 0;
          if (winner === player1.name) {
            playerStats[match.player1Id].wins++;
          } else {
            playerStats[match.player1Id].losses++;
          }
          playerStats[match.player2Id].rating += player2.addedPoints ?? 0;
          if (winner === player2.name) {
            playerStats[match.player2Id].wins++;
          } else {
            playerStats[match.player2Id].losses++;
          }
        });
        const updated = members.map((m) => {
          const s = playerStats[m.userId] || {
            wins: 0,
            losses: 0,
            rating: 1000,
          };
          return { ...m, wins: s.wins, losses: s.losses, rating: s.rating };
        });
        setUpdatedStats(updated);
        const roomSnap = await getDoc(doc(db, 'rooms', id));
        if (roomSnap.exists()) {
          const data = roomSnap.data();
          const history = data.seasonHistory || [];
          if (Array.isArray(history)) {
            setSeasonHistory(history);
          } else {
            setSeasonHistory([]);
          }
        }
      } catch (error) {
        console.error('Error in calculateStatsForRoom:', error);
      }
    },
    [members]
  );

  useEffect(() => {
    setMembers(players || []);
  }, [players]);

  useEffect(() => {
    if (roomId && members.length > 0) {
      calculateStatsForRoom(roomId);
    }
  }, [roomId, members, calculateStatsForRoom]);

  useEffect(() => {
    if (seasonHistory.length > 0) {
      setViewMode('final');
    }
  }, [seasonHistory]);

  const getHiddenRankExplanations = () => {
    return `
      <div class="tooltip-content p-2 text-base font-outfit">
        <p>Hidden if the player has played less than 5 matches.</p>
        <p>Your rating will be revealed when you have played more than 5 matches.</p>
      </div>
    `;
  };

  const updateRoomMembers = async () => {
    try {
      if (!roomId) return;
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) return;
      const roomData = snap.data();
      const updatedMembersList = Object.values(updatedStats).map((p) => {
        const found =
          (roomData.members || []).find((m) => m.userId === p.userId) || {};
        return {
          ...found,
          wins: p.wins || 0,
          losses: p.losses || 0,
          rating: p.rating || 1000,
        };
      });
      await updateDoc(roomRef, { members: updatedMembersList });
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
      if (!roomId) return;
      const roomSnap = await getDoc(doc(db, 'rooms', roomId));
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      const filtered = (data.members || []).filter((m) => m.userId !== userId);
      await updateDoc(doc(db, 'rooms', roomId), { members: filtered });
      setMembers(filtered);
    } catch (error) {
      console.error('Error removing document:', error);
    }
  };

  const calculateWinPercentage = (wins, losses) => {
    const total = (wins || 0) + (losses || 0);
    return total === 0 ? 0 : ((wins / total) * 100).toFixed(2);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedPlayers = [...members]
    .map((p) => {
      const totalMatches = (p.wins || 0) + (p.losses || 0);
      return {
        ...p,
        totalMatches,
        ratingVisible: totalMatches >= 5,
        winPercentage:
          totalMatches === 0 ? 0 : ((p.wins / totalMatches) * 100).toFixed(2),
      };
    })
    .sort((a, b) => {
      if (a.ratingVisible === b.ratingVisible) {
        if (sortConfig.direction === 'ascending') {
          return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
        }
        return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
      }
      return a.ratingVisible ? -1 : 1;
    });

  const latestHistory = seasonHistory[seasonHistory.length - 1] || null;
  const finalTable = latestHistory
    ? [...(latestHistory.summary || [])].sort(
        (a, b) => (a.place || 0) - (b.place || 0)
      )
    : [];

  const toggleFilter = () => {
    setIsFiltered((prev) => !prev);
  };

  const avgMatches =
    sortedPlayers.length > 0
      ? sortedPlayers.reduce((acc, p) => acc + p.totalMatches, 0) /
        sortedPlayers.length
      : 0;

  const displayedPlayers = isFiltered
    ? [
        ...sortedPlayers.filter((p) => p.totalMatches >= avgMatches),
        ...sortedPlayers.filter((p) => p.totalMatches < avgMatches),
      ]
    : sortedPlayers;

  return (
    <div
      className='flex flex-col'
      style={{ zIndex: 999, position: 'relative' }}
    >
      <div className='mb-4 flex space-x-2'>
        <button
          onClick={() => setViewMode('regular')}
          className={`px-4 py-2 rounded ${
            viewMode === 'regular'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-black'
          }`}
        >
          Regular Table
        </button>
        <button
          onClick={() => setViewMode('final')}
          className={`px-4 py-2 rounded ${
            viewMode === 'final'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-black'
          }`}
        >
          Final Table
        </button>
      </div>
      {viewMode === 'regular' && (
        <>
          <div className='mb-4'>
            <p className='text-white text-sm mb-2'>
              This filter applies a "Fair Ranking" system, prioritizing players
              who have played more matches. Players with matches above the
              average are ranked higher, followed by others based on their
              points.
            </p>
            <button
              onClick={toggleFilter}
              className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none'
            >
              {isFiltered ? 'Remove Fair Ranking' : 'Apply Fair Ranking'}
            </button>
          </div>
          <div className='-m-1.5 overflow-x-auto'>
            <div className='p-1.5 min-w-full inline-block align-middle'>
              <div className='overflow-hidden'>
                <table className='min-w-full bg-white shadow text-black'>
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort('name')}
                        className='cursor-pointer px-6 py-3 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                      >
                        Name{' '}
                        {sortConfig.key === 'name'
                          ? sortConfig.direction === 'ascending'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </th>
                      <th
                        onClick={() => handleSort('rating')}
                        className='cursor-pointer px-6 py-3 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                        data-tooltip-id='rating-col-tooltip'
                        data-tooltip-html="<div class='tooltip-content p-2 text-base'>This is the player's current rating, summing up all addedPoints from matches.</div>"
                      >
                        Points{' '}
                        {sortConfig.key === 'rating'
                          ? sortConfig.direction === 'ascending'
                            ? '↑'
                            : '↓'
                          : '↕'}
                        <Tooltip id='rating-col-tooltip' />
                      </th>
                      <th
                        onClick={() => handleSort('totalMatches')}
                        className='cursor-pointer px-6 py-3 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                      >
                        Matches Played{' '}
                        {sortConfig.key === 'totalMatches'
                          ? sortConfig.direction === 'ascending'
                            ? '↑'
                            : '↓'
                          : '↕'}
                      </th>
                      <th
                        onClick={() => handleSort('winPercentage')}
                        className='cursor-pointer px-6 py-3 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'
                      >
                        Wins %{' '}
                        {sortConfig.key === 'winPercentage'
                          ? sortConfig.direction === 'ascending'
                            ? '↑'
                            : '↓'
                          : '↕'}
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
                    ) : displayedPlayers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className='text-center py-4 text-sm text-gray-700'
                        >
                          No players in this room.
                        </td>
                      </tr>
                    ) : (
                      displayedPlayers.map((p) => {
                        const totalMatches = (p.wins || 0) + (p.losses || 0);
                        return (
                          <tr
                            key={p.userId}
                            className='hover:bg-gray-50 transition duration-200 ease-in-out'
                          >
                            <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                              <div className='flex items-center space-x-3'>
                                <Link
                                  to={`/player/${p.userId}`}
                                  className='text-lg font-semibold hover:text-blue-600 transition duration-200'
                                >
                                  {p.name}
                                </Link>
                              </div>
                            </td>
                            <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                              {p.ratingVisible ? (
                                <span>{p.rating}</span>
                              ) : (
                                <span
                                  data-tooltip-id='rank-tooltip'
                                  data-tooltip-html={getHiddenRankExplanations()}
                                >
                                  Hidden
                                  <Tooltip id='rank-tooltip' />
                                </span>
                              )}
                            </td>
                            <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                              {totalMatches}
                            </td>
                            <td className='py-4 px-6 text-sm text-gray-900 whitespace-nowrap'>
                              {p.ratingVisible ? (
                                <span>
                                  {calculateWinPercentage(p.wins, p.losses)}%
                                </span>
                              ) : (
                                'Hidden'
                              )}
                            </td>
                            {(userRole === 'admin' ||
                              userRole === 'editor') && (
                              <td className='py-4 px-6 flex justify-end text-sm font-medium whitespace-nowrap'>
                                <button
                                  onClick={() =>
                                    deletePlayerConfirmationModal(p.userId)
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
                        );
                      })
                    )}
                  </tbody>
                </table>

                {(userRole === 'admin' || userRole === 'editor') && (
                  <div className='flex justify-end mt-4'>
                    {/* Add the delay check here */}
                    {isReadyForOwnerTools &&
                      currentUserId === 'NoYtP49TLoUHOiNEcknW63cw2mw2' && (
                        <button
                          onClick={updateRoomMembers}
                          className='bg-blue-500 tex-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none mr-2'
                        >
                          Update Room Data
                        </button>
                      )}

                    {finalTable.length === 0 && (
                      <button
                        onClick={finishSeason}
                        className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 focus:outline-none'
                        data-tooltip-id='finish-tooltip'
                        data-tooltip-html="<div class='tooltip-content p-2 text-base'>This will finalize the season and update achievements.</div>"
                      >
                        Finish Season
                        <Tooltip id='finish-tooltip' />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      {viewMode === 'final' && (
        <div className='bg-white shadow rounded p-4 text-black'>
          <h2 className='text-xl font-bold mb-4'>Final Season Results</h2>
          {finalTable.length === 0 ? (
            <p>No final results yet.</p>
          ) : (
            <table className='min-w-full bg-white shadow text-black'>
              <thead>
                <tr className='bg-gray-200 text-gray-700 text-xs uppercase tracking-wider'>
                  <th
                    className='py-3 px-6 text-left'
                    data-tooltip-id='col-tooltip-total'
                    data-tooltip-html="<div class='tooltip-content p-2 text-base'>Total Added = sum of all addedPoints from matches for this season.</div>"
                  >
                    Place
                    <Tooltip id='col-tooltip-total' />
                  </th>
                  <th className='py-3 px-6 text-left'>Name</th>
                  <th className='py-3 px-6 text-left'>Matches</th>
                  <th className='py-3 px-6 text-left'>Wins</th>
                  <th className='py-3 px-6 text-left'>Losses</th>
                  <th className='py-3 px-6 text-left'>Longest WS</th>
                  <th
                    className='py-3 px-6 text-left'
                    data-tooltip-id='col-tooltip-added'
                    data-tooltip-html="<div class='tooltip-content p-2 text-base'>Total Added is the total of 'addedPoints' across all matches for the player.</div>"
                  >
                    Total Added
                    <Tooltip id='col-tooltip-added' />
                  </th>
                  <th
                    className='py-3 px-6 text-left'
                    data-tooltip-id='col-tooltip-fair'
                    data-tooltip-html="<div class='tooltip-content p-2 text-base'>Fair Score is wins*2 + totalAddedPoints (normalized for excess matches) + 10% of the player's rating, minus 10% if fewer matches than average.</div>"
                  >
                    Fair Score
                    <Tooltip id='col-tooltip-fair' />
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {finalTable.map((p) => (
                  <tr key={p.userId}>
                    <td className='py-3 px-6'>{p.place}</td>
                    <td className='py-3 px-6'>{p.name}</td>
                    <td className='py-3 px-6'>{p.matchesPlayed}</td>
                    <td className='py-3 px-6'>{p.wins}</td>
                    <td className='py-3 px-6'>{p.losses}</td>
                    <td className='py-3 px-6'>{p.longestWinStreak || '-'}</td>
                    <td className='py-3 px-6'>
                      {p.totalAddedPoints != null
                        ? p.totalAddedPoints.toFixed(2)
                        : '-'}
                    </td>
                    <td className='py-3 px-6'>
                      {p.finalScore != null ? p.finalScore.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerList;
