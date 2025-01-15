// PlayerList.js
// This component displays two tables: a "regular" table with current ratings
// and a "final" table with the last season summary (replacing the last entry in seasonHistory).
// It also recalculates a "fair score" upon finishing the season, and updates achievements in user docs.

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
import 'react-tooltip/dist/react-tooltip.css'; // for react-tooltip
import { db } from '../firebase';

const PlayerList = ({ players, loading, userRole, roomId }) => {
  // This array represents the initial "members" from props (roomData.members).
  const [members, setMembers] = useState([]);
  // This is the updated stats (wins, losses, rating) after fetching matches.
  const [updatedStats, setUpdatedStats] = useState({});
  // This controls whether we apply the "fair ranking" filter or not.
  const [isFiltered, setIsFiltered] = useState(false);

  // Controls which table to display: 'regular' or 'final'.
  const [viewMode, setViewMode] = useState('regular');

  // We store the current seasonHistory from the room doc, to display final results.
  const [seasonHistory, setSeasonHistory] = useState([]);

  // Sorting config for the regular table
  const [sortConfig, setSortConfig] = useState({
    key: 'rating',
    direction: 'descending',
  });

  // finishSeason recalculates stats, overwrites the last entry in seasonHistory, and updates achievements.
  const finishSeason = async () => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        console.error(`Room ${roomId} not found!`);
        return;
      }
      const roomData = roomSnap.data();

      // Fetch all matches for this room
      const matchesRef = collection(db, 'matches');
      const qMatches = query(matchesRef, where('roomId', '==', roomId));
      const matchesSnap = await getDocs(qMatches);
      const matches = matchesSnap.docs.map((docSnap) => docSnap.data());
      if (matches.length === 0) {
        console.warn('No matches found. Finishing season anyway...');
      }

      // We'll create a dictionary of userId -> stats
      const statsByUser = {};

      // Helper to compute the longest win streak by sorting matches by date
      function computeLongestWinStreak(userId, userMatches) {
        const sorted = [...userMatches].sort((a, b) => {
          const [dA, mA, yA, hA, minA, sA] = a.timestamp.split(/[\s.:]/);
          const [dB, mB, yB, hB, minB, sB] = b.timestamp.split(/[\s.:]/);
          const dateA = new Date(+yA, mA - 1, +dA, +hA, +minA, +sA);
          const dateB = new Date(+yB, mB - 1, +dB, +hB, +minB, +sB);
          return dateA - dateB;
        });
        let maxStreak = 0;
        let currentStreak = 0;
        for (const match of sorted) {
          const isWinner =
            match.winner ===
            (match.player1Id === userId
              ? match.player1.name
              : match.player2.name);
          if (isWinner) {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          } else {
            currentStreak = 0;
          }
        }
        return maxStreak;
      }

      // Build stats from all matches
      for (const match of matches) {
        const { player1, player2, winner } = match;
        const p1Id = match.player1Id;
        const p2Id = match.player2Id;

        if (!statsByUser[p1Id]) {
          statsByUser[p1Id] = {
            userId: p1Id,
            name: player1.name,
            wins: 0,
            losses: 0,
            totalAddedPoints: 0,
            matches: [],
          };
        }
        if (!statsByUser[p2Id]) {
          statsByUser[p2Id] = {
            userId: p2Id,
            name: player2.name,
            wins: 0,
            losses: 0,
            totalAddedPoints: 0,
            matches: [],
          };
        }

        if (winner === player1.name) {
          statsByUser[p1Id].wins++;
          statsByUser[p2Id].losses++;
        } else if (winner === player2.name) {
          statsByUser[p2Id].wins++;
          statsByUser[p1Id].losses++;
        }

        statsByUser[p1Id].totalAddedPoints += player1.addedPoints ?? 0;
        statsByUser[p2Id].totalAddedPoints += player2.addedPoints ?? 0;
        statsByUser[p1Id].matches.push(match);
        statsByUser[p2Id].matches.push(match);
      }

      // Convert dictionary to array
      let playersStats = Object.values(statsByUser).map((p) => {
        const matchesPlayed = p.wins + p.losses;
        return { ...p, matchesPlayed };
      });

      // Compute longestWinStreak
      for (const p of playersStats) {
        p.longestWinStreak = computeLongestWinStreak(p.userId, p.matches);
      }

      // Fair Ranking: baseScore = (wins*2) + totalAddedPoints + (longestWinStreak*2)
      // If matchesPlayed < average, we apply a 10% penalty
      const sumMatches = playersStats.reduce(
        (acc, p) => acc + p.matchesPlayed,
        0
      );
      const averageMatches =
        playersStats.length > 0 ? sumMatches / playersStats.length : 0;

      playersStats = playersStats.map((p) => {
        const baseScore =
          p.wins * 2 + p.totalAddedPoints + p.longestWinStreak * 2;
        let finalScore = baseScore;
        if (p.matchesPlayed < averageMatches) {
          finalScore *= 0.9;
        }
        return { ...p, finalScore };
      });

      // Sort descending by finalScore
      playersStats.sort((a, b) => b.finalScore - a.finalScore);

      // Assign place = i+1
      playersStats.forEach((p, i) => {
        p.place = i + 1;
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
        longestWinStreak: p.longestWinStreak,
        finalScore: p.finalScore,
      }));

      let seasonHistory = roomData.seasonHistory || [];
      if (!Array.isArray(seasonHistory)) {
        seasonHistory = [];
      }

      const newHistoryEntry = {
        dateFinished: now,
        summary: seasonResult,
      };

      // Overwrite the last entry in seasonHistory (or push if none)
      if (seasonHistory.length > 0) {
        seasonHistory[seasonHistory.length - 1] = newHistoryEntry;
      } else {
        seasonHistory.push(newHistoryEntry);
      }

      // Update room doc
      await updateDoc(roomRef, {
        seasonHistory,
      });

      // Update achievements in user docs
      for (const p of playersStats) {
        const userRef = doc(db, 'users', p.userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          console.warn(`User ${p.userId} not found!`);
          continue;
        }
        const userData = userSnap.data();
        const achievements = Array.isArray(userData.achievements)
          ? userData.achievements
          : [];

        const safeNumber = (val) => (typeof val === 'number' ? val : 0);

        // We'll use p.place here, which is already i+1 above
        const newAchievement = {
          type: 'seasonFinish',
          roomId,
          roomName: roomData.name || 'Unknown Room',
          dateFinished: now,
          place: safeNumber(p.place),
          matchesPlayed: safeNumber(p.matchesPlayed),
          wins: safeNumber(p.wins),
          losses: safeNumber(p.losses),
          totalAddedPoints: safeNumber(p.totalAddedPoints),
          longestWinStreak: safeNumber(p.longestWinStreak),
          finalScore: safeNumber(p.finalScore),
        };

        achievements.push(newAchievement);
        await updateDoc(userRef, { achievements });
      }

      alert('Season finished! Achievements granted.');
      setViewMode('final');
    } catch (err) {
      console.error('Error finishing season:', err);
      alert('Error finishing season. Check console for details.');
    }
  };

  // This fetches matches, updates stats, and also pulls the existing seasonHistory for final table
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

          const p1Member = members.find((m) => m.userId === match.player1Id);
          const p2Member = members.find((m) => m.userId === match.player2Id);
          if (!p1Member || !p2Member) {
            console.warn(
              'Member not found for',
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

        // Update updatedStats in state
        const updated = members.map((m) => {
          const s = playerStats[m.userId] || {
            wins: 0,
            losses: 0,
            rating: 1000,
          };
          return {
            ...m,
            wins: s.wins,
            losses: s.losses,
            rating: s.rating,
          };
        });
        setUpdatedStats(updated);

        // Also load seasonHistory from the room doc
        const roomSnap = await getDoc(doc(db, 'rooms', roomId));
        if (roomSnap.exists()) {
          const data = roomSnap.data();
          const history = data.seasonHistory || [];
          if (Array.isArray(history)) {
            setSeasonHistory(history);
          } else {
            setSeasonHistory([]);
          }

          // If there's already a last entry, we can decide to start in "final" mode
          // Example:
          // if (history.length > 0) setViewMode('final'); // If you want to default to final if there's already a record
        }
      } catch (error) {
        console.error('Error in calculateStatsForRoom:', error);
      }
    },
    [members]
  );

  // On mount or whenever players / roomId change, fetch stats
  useEffect(() => {
    setMembers(players);
    if (roomId) {
      calculateStatsForRoom(roomId);
    }
  }, [players, roomId, calculateStatsForRoom]);

  const getRankUrl = (maxRating) => {
    const rankUrls = [
      'https://bekindcult.fi/wp-content/uploads/2024/10/ping-pong-padawan.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/table-tennis-trainee.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/racket-rookie.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/paddle-prodigy.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/spin-sensei.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/smash-samurai.png',
      'https://bekindcult.fi/wp-content/uploads/2024/10/ping-pong-paladin.png',
    ];

    if (maxRating < 1001) {
      return rankUrls[0];
    } else if (maxRating < 1100) {
      return rankUrls[1];
    } else if (maxRating < 1200) {
      return rankUrls[2];
    } else if (maxRating < 1400) {
      return rankUrls[3];
    } else if (maxRating < 1800) {
      return rankUrls[4];
    } else if (maxRating < 2000) {
      return rankUrls[5];
    } else {
      return rankUrls[6];
    }
  };

  const getCachedImageUrl = (userId, maxRating) => {
    const cacheKey = `imageUrl-${userId}-${maxRating}`;
    const cachedUrl = localStorage.getItem(cacheKey);

    if (cachedUrl) {
      return cachedUrl;
    } else {
      const newUrl = getRankUrl(maxRating);
      localStorage.setItem(cacheKey, newUrl);
      return newUrl;
    }
  };

  // Explanation for "Hidden rank"
  const getHiddenRankExplanations = () => {
    return `
      <div class="tooltip-content p-2 text-base font-outfit">
        <p>Hidden if the player has played less than 5 matches.</p>
        <p>Your rating will be revealed when you have played more than 5 matches.</p>
      </div>
    `;
  };

  // This function updates the members in the room doc with the current stats
  const updateRoomMembers = async () => {
    try {
      const roomRef = doc(db, 'rooms', roomId);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        console.error(`Room with ID ${roomId} not found.`);
        return;
      }
      const roomData = snap.data();
      const updatedMembersList = updatedStats.map((player) => ({
        ...roomData.members.find((m) => m.userId === player.userId),
        wins: player.wins,
        losses: player.losses,
        rating: player.rating,
      }));
      await updateDoc(roomRef, { members: updatedMembersList });
      console.log('Room data updated successfully.');
    } catch (error) {
      console.error('Error updating room members:', error);
    }
  };

  // Deleting a player from the room
  const deletePlayerConfirmationModal = (userId) => {
    if (window.confirm('Are you sure you want to delete this player?')) {
      deletePlayer(userId);
    }
  };

  const deletePlayer = async (userId) => {
    try {
      const roomSnap = await getDoc(doc(db, 'rooms', roomId));
      if (!roomSnap.exists()) return;
      const data = roomSnap.data();
      const filtered = data.members.filter((m) => m.userId !== userId);
      await updateDoc(doc(db, 'rooms', roomId), { members: filtered });
      setMembers(filtered);
    } catch (error) {
      console.error('Error removing document: ', error);
    }
  };

  // Win percentage helper
  const calculateWinPercentage = (wins, losses) => {
    const totalMatches = wins + losses;
    return totalMatches === 0 ? 0 : ((wins / totalMatches) * 100).toFixed(2);
  };

  // Sorting handler for the "regular" table
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Build the "regular" table data
  const sortedPlayers = [...members]
    .map((player) => {
      const totalMatches = (player.wins || 0) + (player.losses || 0);
      return {
        ...player,
        totalMatches,
        ratingVisible: totalMatches >= 5,
        winPercentage:
          totalMatches === 0
            ? 0
            : ((player.wins / totalMatches) * 100).toFixed(2),
      };
    })
    .sort((a, b) => {
      if (a.ratingVisible === b.ratingVisible) {
        // Sort by key
        if (sortConfig.direction === 'ascending') {
          return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
        } else {
          return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
        }
      }
      // ratingVisible players first
      return a.ratingVisible ? -1 : 1;
    });

  // Final table from the last entry in seasonHistory
  const latestHistory = seasonHistory[seasonHistory.length - 1] || null;
  const finalTable = latestHistory
    ? [...latestHistory.summary].sort((a, b) => a.place - b.place)
    : [];

  // Toggle to apply or remove "fair ranking" filter in the regular table
  const toggleFilter = () => {
    setIsFiltered((prev) => !prev);
  };

  const averageMatches =
    sortedPlayers.reduce((acc, player) => acc + player.totalMatches, 0) /
    sortedPlayers.length;

  // If isFiltered, we reorder players with >= averageMatches first.
  const displayedPlayers = isFiltered
    ? sortedPlayers
        .filter((p) => p.totalMatches >= averageMatches)
        .concat(sortedPlayers.filter((p) => p.totalMatches < averageMatches))
    : sortedPlayers;

  return (
     <div className='flex flex-col'  style={{ zIndex: 999, position: 'relative' }}>
      {/* View mode toggle buttons */}
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

      {/* REGULAR TABLE */}
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
              <div className='overflow-hidden shadow-md'>
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
                      displayedPlayers.map((player) => {
                        const totalMatches =
                          (player.wins || 0) + (player.losses || 0);
                        return (
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
                                      player.maxRating
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
                            {(userRole === 'admin' ||
                              userRole === 'editor') && (
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
                        );
                      })
                    )}
                  </tbody>
                </table>

                {(userRole === 'admin' || userRole === 'editor') && (
                  <div className='flex justify-end mt-4'>
                    <>
                      <button
                        onClick={updateRoomMembers}
                        className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none mr-2'
                      >
                        Update Room Data
                      </button>

                      <button
                        onClick={finishSeason}
                        className='bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 focus:outline-none'
                        data-tooltip-id='finish-tooltip'
                        data-tooltip-html="<div class='tooltip-content p-2 text-base'>This will finalize the season and update achievements.</div>"
                      >
                        Finish Season
                        <Tooltip id='finish-tooltip' />
                      </button>
                    </>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* FINAL TABLE */}
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
                    data-tooltip-html="<div class='tooltip-content p-2 text-base'>Fair Score is wins*2 + totalAddedPoints + longestWinStreak*2, minus 10% if fewer matches than average.</div>"
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
                    <td className='py-3 px-6'>{p.longestWinStreak}</td>
                    <td className='py-3 px-6'>{p.totalAddedPoints.toFixed(2)}</td>
                    <td className='py-3 px-6'>{p.finalScore.toFixed(2)}</td>
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
