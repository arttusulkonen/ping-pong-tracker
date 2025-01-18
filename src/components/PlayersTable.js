import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { auth, db } from '../firebase';

const PlayersTable = () => {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all'); 
  const [sortConfig, setSortConfig] = useState({
    key: 'rank',
    direction: 'ascending',
  });

  const timeFrames = [
    {
      label: 'All Time',
      value: 'all',
      tooltip: 'Includes all matches ever played by the player.',
    },
    {
      label: 'Last 365 Days',
      value: '365',
      tooltip: 'Includes matches played in the last 365 days.',
    },
    {
      label: 'Last 180 Days',
      value: '180',
      tooltip: 'Includes matches played in the last 180 days.',
    },
    {
      label: 'Last 90 Days',
      value: '90',
      tooltip: 'Includes matches played in the last 90 days.',
    },
    {
      label: 'Last 30 Days',
      value: '30',
      tooltip: 'Includes matches played in the last 30 days.',
    },
    {
      label: 'Last 7 Days',
      value: '7',
      tooltip: 'Includes matches played in the last 7 days.',
    },
  ];

  const fetchPlayers = useCallback(async () => {
    try {
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      if (!currentUserSnap.exists()) {
        console.error('Current user does not exist in Firestore');
        setPlayers([]);
        return;
      }
  
      const currentUserRooms = currentUserSnap.data().rooms || [];
      if (currentUserRooms.length === 0) {
        console.log('Current user is not in any rooms.');
        setPlayers([]);
        return;
      }
  
      const playersRef = collection(db, 'users');
      const playersSnap = await getDocs(playersRef);
      const allPlayers = playersSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
  
      const filteredPlayers = allPlayers.filter((player) => {
        const playerRooms = player.rooms || [];
        return playerRooms.some((room) => currentUserRooms.includes(room));
      });
  
      setPlayers(filteredPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    }
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      const matchesRef = collection(db, 'matches');
      const matchesSnap = await getDocs(matchesRef);
      const matchesData = matchesSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        const timestampStr = data.timestamp; 

        const [datePart, timePart] = timestampStr.split(' ');

        const pad = (num) => (num.length === 1 ? `0${num}` : num);

        const [day, month, year] = datePart.split('.').map((part) => pad(part));
        const [hour, minute, second] = timePart
          .split('.')
          .map((part) => pad(part));

        const dayNum = parseInt(day, 10);
        const monthNum = parseInt(month, 10) - 1; 
        const yearNum = parseInt(year, 10);
        const hourNum = parseInt(hour, 10);
        const minuteNum = parseInt(minute, 10);
        const secondNum = parseInt(second, 10);

        const timestamp = new Date(
          yearNum,
          monthNum,
          dayNum,
          hourNum,
          minuteNum,
          secondNum
        );

        if (isNaN(timestamp.getTime())) {
          console.error(
            `Invalid Date object for match ID ${docSnap.id}: ${timestampStr}`
          );
          return {
            id: docSnap.id,
            ...data,
            timestamp: new Date(0),
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

  const calculateStatistics = useCallback(
    (timeFrame) => {
      let filteredMatches = [];
      const now = new Date();

      if (timeFrame !== 'all') {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - parseInt(timeFrame, 10));
        filteredMatches = matches.filter(
          (match) => match.timestamp >= pastDate && match.timestamp <= now
        );
      } else {
        filteredMatches = matches;
      }

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
          matches: [], 
          finalScore: 0, 
          winRate: 0, 
        };
      });

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

      const playersStats = Object.values(statsByUser).map((playerStat) => {
        const longestWinStreak = computeLongestWinStreak(
          playerStat.matches,
          playerStat.id,
          playerStat.name
        );

        const baseScore =
          playerStat.wins * 2 +
          playerStat.totalAddedPoints +
          longestWinStreak * 2;

        const winRate =
          playerStat.matchesPlayed === 0
            ? 0
            : (playerStat.wins / playerStat.matchesPlayed) * 100;

        return {
          ...playerStat,
          longestWinStreak,
          finalScore: baseScore,
          winRate, 
        };
      });

      const totalMatches = playersStats.reduce(
        (acc, p) => acc + p.matchesPlayed,
        0
      );
      const averageMatches =
        playersStats.length > 0 ? totalMatches / playersStats.length : 0;

      const finalPlayersStats = playersStats.map((p) => {
        let finalScore = p.finalScore;
        if (p.matchesPlayed < averageMatches) {
          finalScore *= 0.9; 
        }
        return { ...p, finalScore };
      });

      return finalPlayersStats;
    },
    [players, matches]
  );

  const assignMonthlyAchievements = useCallback(async (currentStats) => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    if (today.getDate() !== lastDay.getDate()) {
      return; 
    }

    const topPlayers = currentStats
      .filter((player) => player.matchesPlayed > 0)
      .slice(0, 3);

    for (const player of topPlayers) {
      const achievement = {
        type: 'monthlyFinish',
        dateFinished: today.toLocaleDateString('en-US'),
        place: player.rank,
        roomId: 'N/A', 
        roomName: 'Monthly Competition',
        description: `Finished the month in ${
          player.rank === 1 ? 'first' : player.rank === 2 ? 'second' : 'third'
        } place.`,
      };

      try {
        const userRef = doc(db, 'users', player.id);
        const userSnap = await getDoc(userRef);
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

  useEffect(() => {
    const initialize = async () => {
      await fetchPlayers();
      await fetchMatches();
      setLoading(false);
    };
    initialize();
  }, [fetchPlayers, fetchMatches]);

  useEffect(() => {
    if (!loading) {
      const stats = calculateStatistics(selectedTab);

      const sortedByScore = [...stats].sort(
        (a, b) => b.finalScore - a.finalScore
      );

      sortedByScore.forEach((player, index) => {
        player.rank = index + 1;
      });

      assignMonthlyAchievements(sortedByScore);
    }
  }, [loading, selectedTab, calculateStatistics, assignMonthlyAchievements]);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedStats = useMemo(() => {
    const sortableItems = [...calculateStatistics(selectedTab)];

    if (sortConfig.key === 'rank') {
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
    } else if (sortConfig.key === 'winRate') {
      sortableItems.sort((a, b) => {
        if (a.winRate < b.winRate)
          return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a.winRate > b.winRate)
          return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    } else {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    sortableItems.forEach((player, index) => {
      player.rank = index + 1;
    });

    return sortableItems;
  }, [calculateStatistics, selectedTab, sortConfig]);

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
                : `${player.winRate.toFixed(2)}%`;
            return (
              <tr key={player.id} className='hover:bg-gray-100'>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  {player.rank}
                </td>
                <td className='py-4 px-6 text-sm text-gray-700'>
                  <Link
                    to={`/player/${player.id}`}
                    className='text-blue-600 hover:underline'
                  >
                    {player.name}
                  </Link>
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
      <div className='flex space-x-4 mb-6 flex-wrap'>
        {timeFrames.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedTab(tab.value)}
            className={`px-4 py-2 rounded ${
              selectedTab === tab.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
            data-tooltip-id={`${tab.value}-tooltip`}
            data-tooltip-html={tab.tooltip}
          >
            {tab.label}
            <Tooltip id={`${tab.value}-tooltip`} />
          </button>
        ))}
      </div>
      <Tooltip />
      <div className='overflow-x-auto'>{renderTable(sortedStats)}</div>
    </div>
  );
};

export default PlayersTable;
