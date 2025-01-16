// src/components/PlayersTable.js

import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { db } from '../firebase';

const PlayersTable = () => {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', '30', '7'
  const [sortConfig, setSortConfig] = useState({
    key: 'rank',
    direction: 'ascending',
  });

  // Fetch all players from Firestore
  const fetchPlayers = useCallback(async () => {
    try {
      const playersRef = collection(db, 'users');
      const playersSnap = await getDocs(playersRef);
      const playersData = playersSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  }, []);

  // Fetch all matches from Firestore and parse timestamps
  const fetchMatches = useCallback(async () => {
    try {
      const matchesRef = collection(db, 'matches');
      const matchesSnap = await getDocs(matchesRef);
      const matchesData = matchesSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        const timestampStr = data.timestamp; // e.g., "01.10.2024 16.16.56" or "8.8.2024 16.57.28"

        // Split into date and time
        const [datePart, timePart] = timestampStr.split(' ');

        // Function to pad single-digit numbers with a leading zero
        const pad = (num) => (num.length === 1 ? `0${num}` : num);

        const [day, month, year] = datePart.split('.').map((part) => pad(part));
        const [hour, minute, second] = timePart
          .split('.')
          .map((part) => pad(part));

        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10) - 1; // Months are zero-based in JavaScript
        const yearNum = parseInt(year, 10);
        const hourNum = parseInt(hour, 10);
        const minuteNum = parseInt(minute, 10);
        const secondNum = parseInt(second, 10);

        // Create Date object
        const timestamp = new Date(
          yearNum,
          monthNum,
          dayNum,
          hourNum,
          minuteNum,
          secondNum
        );

        // Check if the date is valid
        if (isNaN(timestamp.getTime())) {
          console.error(
            `Invalid Date object for match ID ${docSnap.id}: ${timestampStr}`
          );
          return {
            id: docSnap.id,
            ...data,
            timestamp: new Date(0), // Assign Epoch if invalid
          };
        }

        return {
          id: docSnap.id,
          ...data,
          timestamp,
        };
      });
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  }, []);

  // Calculate statistics based on the selected time frame
  const calculateStatistics = useCallback(
    (timeFrame) => {
      let filteredMatches = [];
      const now = new Date();

      if (timeFrame === '30') {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30);
        filteredMatches = matches.filter(
          (match) => match.timestamp >= pastDate && match.timestamp <= now
        );
      } else if (timeFrame === '7') {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);
        filteredMatches = matches.filter(
          (match) => match.timestamp >= pastDate && match.timestamp <= now
        );
      } else {
        // All time
        filteredMatches = matches;
      }

      // Initialize statistics for each player
      const statsByUser = {};

      players.forEach((player) => {
        statsByUser[player.id] = {
          id: player.id,
          name: player.name,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          totalAddedPoints: 0,
          longestWinStreak: 0,
          matches: [], // For calculating win streak
          finalScore: 0, // Final score
        };
      });

      // Populate statistics based on matches
      filteredMatches.forEach((match) => {
        const { player1, player2, winner } = match;
        const p1Id = match.player1Id;
        const p2Id = match.player2Id;

        // Player 1
        if (statsByUser[p1Id]) {
          statsByUser[p1Id].matchesPlayed += 1;
          if (winner === player1.name) {
            statsByUser[p1Id].wins += 1;
          } else {
            statsByUser[p1Id].losses += 1;
          }
          statsByUser[p1Id].totalAddedPoints += player1.addedPoints ?? 0;
          statsByUser[p1Id].matches.push(match);
        }

        // Player 2
        if (statsByUser[p2Id]) {
          statsByUser[p2Id].matchesPlayed += 1;
          if (winner === player2.name) {
            statsByUser[p2Id].wins += 1;
          } else {
            statsByUser[p2Id].losses += 1;
          }
          statsByUser[p2Id].totalAddedPoints += player2.addedPoints ?? 0;
          statsByUser[p2Id].matches.push(match);
        }
      });

      // Function to compute the longest win streak
      const computeLongestWinStreak = (userMatches, userId, winnerName) => {
        const sortedMatches = [...userMatches].sort(
          (a, b) => a.timestamp - b.timestamp
        );
        let maxStreak = 0;
        let currentStreak = 0;

        sortedMatches.forEach((match) => {
          const isWinner =
            (match.player1Id === userId &&
              match.winner === match.player1.name) ||
            (match.player2Id === userId && match.winner === match.player2.name);
          if (isWinner) {
            currentStreak += 1;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
            }
          } else {
            currentStreak = 0;
          }
        });

        return maxStreak;
      };

      // Calculate win streaks and final scores
      const playersStats = Object.values(statsByUser).map((playerStat) => {
        const longestWinStreak = computeLongestWinStreak(
          playerStat.matches,
          playerStat.id,
          playerStat.name
        );

        // Base score: (wins * 2) + totalAddedPoints + (longestWinStreak * 2)
        const baseScore =
          playerStat.wins * 2 +
          playerStat.totalAddedPoints +
          longestWinStreak * 2;

        return {
          ...playerStat,
          longestWinStreak,
          finalScore: baseScore,
        };
      });

      // Calculate average number of matches played
      const totalMatches = playersStats.reduce(
        (acc, p) => acc + p.matchesPlayed,
        0
      );
      const averageMatches =
        playersStats.length > 0 ? totalMatches / playersStats.length : 0;

      // Apply a 10% penalty if matchesPlayed < averageMatches
      const finalPlayersStats = playersStats.map((p) => {
        let finalScore = p.finalScore;
        if (p.matchesPlayed < averageMatches) {
          finalScore *= 0.9; // Apply 10% penalty
        }
        return { ...p, finalScore };
      });

      return finalPlayersStats;
    },
    [players, matches]
  );

  // Assign achievements to top 3 players on the last day of the month
  const assignMonthlyAchievements = useCallback(async (currentStats) => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (today.getDate() !== lastDay.getDate()) {
      return; // Not the last day of the month
    }

    // Get top 3 players with at least one match
    const topPlayers = currentStats
      .filter((player) => player.matchesPlayed > 0)
      .slice(0, 3);

    for (const player of topPlayers) {
      const achievement = {
        type: 'monthlyFinish',
        dateFinished: today.toLocaleDateString('en-US'),
        place: player.rank,
        roomId: 'N/A', // Customize if needed
        roomName: 'Monthly Competition',
        description: `Finished the month in ${
          player.rank === 1 ? 'first' : player.rank === 2 ? 'second' : 'third'
        } place.`,
      };

      try {
        const userRef = doc(db, 'users', player.id);
        // Fetch existing achievements to prevent overwriting
        const userSnap = await getDocs(userRef);
        const existingAchievements = userSnap.exists()
          ? userSnap.data().achievements || []
          : [];

        await updateDoc(userRef, {
          achievements: [...existingAchievements, achievement],
        });
        console.log(
          `Achievement assigned to ${player.name} for finishing ${player.rank} place this month.`
        );
      } catch (error) {
        console.error(`Error assigning achievement to ${player.name}:`, error);
      }
    }
  }, []);

  // Initialize data on component mount
  useEffect(() => {
    const initialize = async () => {
      await fetchPlayers();
      await fetchMatches();
      setLoading(false);
    };
    initialize();
  }, [fetchPlayers, fetchMatches]);

  // Recalculate statistics and assign achievements when loading is complete or tab changes
  useEffect(() => {
    if (!loading) {
      const stats = calculateStatistics(selectedTab);

      // Sort players by finalScore descending to assign ranks
      const sortedByScore = [...stats].sort(
        (a, b) => b.finalScore - a.finalScore
      );

      // Assign ranks based on sorted order
      sortedByScore.forEach((player, index) => {
        player.rank = index + 1;
      });

      // Assign monthly achievements
      assignMonthlyAchievements(sortedByScore);
    }
  }, [loading, selectedTab, calculateStatistics, assignMonthlyAchievements]);

  // Handle sorting when a column header is clicked
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Memoize sorted stats based on sortConfig
  const sortedStats = useMemo(() => {
    const sortableItems = [...calculateStatistics(selectedTab)];

    if (sortConfig.key === 'rank') {
      // Custom sort to ensure players with matches are above those with zero matches
      sortableItems.sort((a, b) => {
        if (a.matchesPlayed > 0 && b.matchesPlayed === 0)
          return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a.matchesPlayed === 0 && b.matchesPlayed > 0)
          return sortConfig.direction === 'ascending' ? 1 : -1;

        if (sortConfig.direction === 'ascending') {
          if (a.finalScore > b.finalScore) return -1;
          if (a.finalScore < b.finalScore) return 1;
        } else {
          if (a.finalScore < b.finalScore) return -1;
          if (a.finalScore > b.finalScore) return 1;
        }

        return a.name.localeCompare(b.name);
      });
    } else {
      // Sort based on sortConfig.key and direction
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    // Assign rank based on sorted order
    sortableItems.forEach((player, index) => {
      player.rank = index + 1;
    });

    return sortableItems;
  }, [calculateStatistics, selectedTab, sortConfig]);

  // Function to render the table
  const renderTable = (stats) => {
    return (
      <table className='min-w-full bg-white shadow-md rounded-lg'>
        <thead>
          <tr>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('rank')}
              data-tooltip-id='rank-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Rank is determined by final score, which accounts for wins, total added points, longest win streak, and penalties for fewer matches.</div>"
            >
              Rank{' '}
              {sortConfig.key === 'rank'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='rank-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('name')}
              data-tooltip-id='name-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Player's name.</div>"
            >
              Name{' '}
              {sortConfig.key === 'name'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='name-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('matchesPlayed')}
              data-tooltip-id='matches-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Total number of matches played.</div>"
            >
              Matches Played{' '}
              {sortConfig.key === 'matchesPlayed'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='matches-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('wins')}
              data-tooltip-id='wins-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Number of matches won.</div>"
            >
              Wins{' '}
              {sortConfig.key === 'wins'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='wins-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('losses')}
              data-tooltip-id='losses-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Number of matches lost.</div>"
            >
              Losses{' '}
              {sortConfig.key === 'losses'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='losses-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('winRate')}
              data-tooltip-id='winrate-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Percentage of matches won.</div>"
            >
              Win Rate{' '}
              {sortConfig.key === 'winRate'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='winrate-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('totalAddedPoints')}
              data-tooltip-id='addedpoints-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Total added points from matches.</div>"
            >
              Total Added Points{' '}
              {sortConfig.key === 'totalAddedPoints'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='addedpoints-tooltip' />
            </th>
            <th
              className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer'
              onClick={() => handleSort('longestWinStreak')}
              data-tooltip-id='streak-tooltip'
              data-tooltip-html="<div class='tooltip-content p-2 text-base'>Longest consecutive wins streak.</div>"
            >
              Longest Win Streak{' '}
              {sortConfig.key === 'longestWinStreak'
                ? sortConfig.direction === 'ascending'
                  ? '↑'
                  : '↓'
                : '↕'}
              <Tooltip id='streak-tooltip' />
            </th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-200'>
          {stats.map((player) => {
            const winRate =
              player.matchesPlayed === 0
                ? '0.00%'
                : `${((player.wins / player.matchesPlayed) * 100).toFixed(2)}%`;
            return (
              <tr key={player.id} className='hover:bg-gray-100'>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.rank}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.name}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.matchesPlayed}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.wins}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.losses}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>{winRate}</td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.totalAddedPoints}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.longestWinStreak}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <h2 className='text-2xl font-bold mb-4'>Players Statistics</h2>
      {/* Tabs for selecting time frame with tooltips */}
      <div className='flex space-x-4 mb-6'>
        <button
          onClick={() => setSelectedTab('all')}
          className={`px-4 py-2 rounded ${
            selectedTab === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
          data-tooltip-id='all-tooltip'
          data-tooltip-html="<div class='tooltip-content p-2 text-base'>Includes all matches ever played by the player.</div>"
        >
          All Time
          <Tooltip id='all-tooltip' />
        </button>
        <button
          onClick={() => setSelectedTab('30')}
          className={`px-4 py-2 rounded ${
            selectedTab === '30'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
          data-tooltip-id='last30-tooltip'
          data-tooltip-html="<div class='tooltip-content p-2 text-base'>Includes matches played in the last 30 days.</div>"
        >
          Last 30 Days
          <Tooltip id='last30-tooltip' />
        </button>
        <button
          onClick={() => setSelectedTab('7')}
          className={`px-4 py-2 rounded ${
            selectedTab === '7'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
          data-tooltip-id='last7-tooltip'
          data-tooltip-html="<div class='tooltip-content p-2 text-base'>Includes matches played in the last 7 days.</div>"
        >
          Last 7 Days
          <Tooltip id='last7-tooltip' />
        </button>
      </div>
      {/* Tooltip component */}
      <Tooltip />
      {/* Render the table */}
      <div className='overflow-x-auto'>{renderTable(sortedStats)}</div>
    </div>
  );
};

export default PlayersTable;
