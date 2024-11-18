import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Store } from 'react-notifications-component';
import { useParams } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { auth, db } from '../../firebase';

import {
  CategoryScale,
  Chart as ChartJS,
  Tooltip as ChartTooltip,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend
);

ChartJS.register(zoomPlugin);

const Player = ({ onNameUpdate }) => {
  const { userId } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [maxWinStreak, setMaxWinStreak] = useState(0);
  const [currentWinStreak, setCurrentWinStreak] = useState(0);
  const [error, setError] = useState(null);
  const [displayInput, setDisplayInput] = useState(false);
  const [user] = useAuthState(auth);

  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [opponentsList, setOpponentsList] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [opponentStats, setOpponentStats] = useState(null);

  const getRank = (rating) => {
    if (rating < 1001) return 'Ping Pong Padawan';
    if (rating < 1100) return 'Table Tennis Trainee';
    if (rating < 1200) return 'Racket Rookie';
    if (rating < 1400) return 'Paddle Prodigy';
    if (rating < 1800) return 'Spin Sensei';
    if (rating < 2000) return 'Smash Samurai';
    return 'Ping Pong Paladin';
  };

  const getMedal = (rank) => {
    switch (rank) {
      case 'Ping Pong Padawan':
        return '<img class="w-[180px]" src="/img/ping-pong-padawan.png" alt="Ping Pong Padawan" />';
      case 'Table Tennis Trainee':
        return '<img class="w-[180px]" src="/img/table-tennis-trainee.png" alt="Table Tennis Trainee" />';
      case 'Racket Rookie':
        return '<img class="w-[180px]" src="/img/racket-rookie.png" alt="Racket Rookie" />';
      case 'Paddle Prodigy':
        return '<img class="w-[180px]" src="/img/paddle-prodigy.png" alt="Paddle Prodigy" />';
      case 'Spin Sensei':
        return '<img class="w-[180px]" src="/img/spin-sensei.png" alt="Spin Sensei" />';
      case 'Smash Samurai':
        return '<img class="w-[180px]" src="/img/smash-samurai.png" alt="Smash Samurai" />';
      case 'Ping Pong Paladin':
        return '<img class="w-[180px]" src="/img/ping-pong-paladin.png" alt="Ping Pong Paladin" />';
      default:
        return '';
    }
  };

  const getAllRankExplanations = () => {
    return `
      <div class="tooltip-content font-outfit p-2 text-base">
        <div><strong>Ping Pong Padawan:</strong> Less than 1001 points</div>
        <div><strong>Table Tennis Trainee:</strong> 1001-1099 points</div>
        <div><strong>Racket Rookie:</strong> 1100-1199 points</div>
        <div><strong>Paddle Prodigy:</strong> 1200-1399 points</div>
        <div><strong>Spin Sensei:</strong> 1400-1799 points</div>
        <div><strong>Smash Samurai:</strong> 1800-1999 points</div>
        <div><strong>Ping Pong Paladin:</strong> 2000+ points</div>
      </div>
    `;
  };

  const handleEditClick = () => {
    setDisplayInput(!displayInput);
  };

  const handleSaveName = async (e) => {
    e.preventDefault();

    if (!player.name.trim()) {
      Store.addNotification({
        title: 'Update failed',
        message: 'Name cannot be empty or just spaces.',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: {
          duration: 3000,
          onScreen: true,
        },
      });
      return;
    }

    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      let isNicknameTaken = false;

      usersSnapshot.forEach((doc) => {
        if (
          doc.data().name.toLowerCase() === player.name.toLowerCase() &&
          doc.id !== userId
        ) {
          isNicknameTaken = true;
        }
      });

      if (isNicknameTaken) {
        throw new Error('4');
      }

      await setDoc(doc(db, 'users', userId), {
        ...player,
        name: player.name,
      });

      const roomsCollection = collection(db, 'rooms');
      const roomsSnapshot = await getDocs(roomsCollection);
      for (const roomDoc of roomsSnapshot.docs) {
        const roomData = roomDoc.data();
        const updatedMembers = roomData.members.map((member) =>
          member.userId === userId ? { ...member, name: player.name } : member
        );

        await setDoc(doc(db, 'rooms', roomDoc.id), {
          ...roomData,
          members: updatedMembers,
        });
      }

      const matchesCollection = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesCollection);
      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        let updatedMatch = { ...matchData };

        if (matchData.player1Id === userId) {
          updatedMatch = {
            ...matchData,
            player1: { ...matchData.player1, name: player.name },
          };
        }

        if (matchData.player2Id === userId) {
          updatedMatch = {
            ...updatedMatch,
            player2: { ...matchData.player2, name: player.name },
          };
        }

        await setDoc(doc(db, 'matches', matchDoc.id), updatedMatch);
      }

      onNameUpdate(player.name);

      Store.addNotification({
        title: 'Success',
        message: 'Name updated successfully in all collections.',
        type: 'success',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: {
          duration: 3000,
          onScreen: true,
        },
      });
    } catch (error) {
      if (error.message === '4') {
        Store.addNotification({
          title: 'Update failed',
          message: 'Nickname is already taken. Please choose another one.',
          type: 'danger',
          insert: 'top',
          container: 'top-right',
          animationIn: ['animate__animated', 'animate__fadeIn'],
          animationOut: ['animate__animated', 'animate__fadeOut'],
          dismiss: {
            duration: 3000,
            onScreen: true,
          },
        });
      }
    } finally {
      setDisplayInput(false);
      await fetchMatches(); // Refresh matches
    }
  };

  const fetchPlayer = useCallback(async () => {
    try {
      const playerRef = doc(db, 'users', userId);
      const playerSnap = await getDoc(playerRef);

      if (playerSnap.exists()) {
        const playerData = playerSnap.data();
        setPlayer({
          ...playerData,
          totalMatches: (playerData.wins || 0) + (playerData.losses || 0),
          id: userId,
        });
      } else {
        setError('Player not found');
      }
    } catch (err) {
      setError('Error fetching player data');
    } finally {
      setLoadingPlayer(false);
    }
  }, [userId]);

  const fetchMatches = useCallback(async () => {
    try {
      const matchesCollection = collection(db, 'matches');
      const q = query(
        matchesCollection,
        where('players', 'array-contains', userId)
      );
      const matchesSnapshot = await getDocs(q);
      const matchesData = matchesSnapshot.docs.map((doc) => doc.data());

      const sortedMatches = matchesData.sort((a, b) => {
        const [dayA, monthA, yearA, hourA, minuteA, secondA] =
          a.timestamp.split(/[\s.:]/);
        const [dayB, monthB, yearB, hourB, minuteB, secondB] =
          b.timestamp.split(/[\s.:]/);

        const dateA = new Date(
          yearA,
          monthA - 1,
          dayA,
          hourA,
          minuteA,
          secondA
        );
        const dateB = new Date(
          yearB,
          monthB - 1,
          dayB,
          hourB,
          minuteB,
          secondB
        );

        return dateB - dateA;
      });

      // Extract unique opponents
      const opponentsSet = new Set();
      matchesData.forEach((match) => {
        const opponentId =
          match.player1Id === userId ? match.player2Id : match.player1Id;
        const opponentName =
          match.player1Id === userId ? match.player2.name : match.player1.name;
        opponentsSet.add(
          JSON.stringify({ id: opponentId, name: opponentName })
        );
      });

      const opponentsList = Array.from(opponentsSet).map((item) =>
        JSON.parse(item)
      );

      setOpponentsList(opponentsList);
      setMatches(sortedMatches);
      setFilteredMatches(sortedMatches); // Initially show all matches
    } catch (err) {
      setError('Error fetching matches');
    } finally {
      setLoadingMatches(false);
    }
  }, [userId]);

  const handleOpponentChange = (e) => {
    const opponentId = e.target.value;
    setSelectedOpponent(opponentId);

    if (opponentId === '') {
      // If no opponent is selected, show all matches
      setFilteredMatches(matches);
    } else {
      // Filter matches by selected opponent
      const filtered = matches.filter((match) => {
        return match.player1Id === opponentId || match.player2Id === opponentId;
      });
      setFilteredMatches(filtered);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPlayer();
      fetchMatches();
    }
  }, [userId, fetchPlayer, fetchMatches]);

  useEffect(() => {
    // Calculate overall win streaks
    const calculateWinStreaks = () => {
      let maxWinStreak = 0;
      let currentWinStreak = 0;
      let tempCurrentWinStreak = 0;

      const sortedMatches = [...matches].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      for (let match of sortedMatches) {
        const isWinner =
          (match.player1Id === userId && match.winner === match.player1.name) ||
          (match.player2Id === userId && match.winner === match.player2.name);

        if (isWinner) {
          tempCurrentWinStreak++;
        } else {
          break;
        }
      }

      currentWinStreak = tempCurrentWinStreak;

      let tempMaxWinStreak = 0;
      for (let match of sortedMatches) {
        const isWinner =
          (match.player1Id === userId && match.winner === match.player1.name) ||
          (match.player2Id === userId && match.winner === match.player2.name);

        if (isWinner) {
          tempMaxWinStreak++;
          if (tempMaxWinStreak > maxWinStreak) {
            maxWinStreak = tempMaxWinStreak;
          }
        } else {
          tempMaxWinStreak = 0;
        }
      }

      setMaxWinStreak(maxWinStreak);
      setCurrentWinStreak(currentWinStreak);
    };

    calculateWinStreaks();
  }, [matches, userId]);

  useEffect(() => {
    if (selectedOpponent === '' || filteredMatches.length === 0) {
      setOpponentStats(null);
      return;
    }

    let wins = 0;
    let losses = 0;
    let maxWinMargin = null;
    let maxLossMargin = null;
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLossStreak = 0;
    let maxLossStreak = 0;

    // Sort matches by date
    const sortedMatches = [...filteredMatches].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedMatches.forEach((match) => {
      const isWinner =
        (match.player1Id === userId && match.winner === match.player1.name) ||
        (match.player2Id === userId && match.winner === match.player2.name);

      const opponentScore =
        match.player1Id === selectedOpponent
          ? match.player1.scores
          : match.player2.scores;
      const playerScore =
        match.player1Id === userId
          ? match.player1.scores
          : match.player2.scores;

      const scoreMargin = playerScore - opponentScore;

      if (isWinner) {
        wins++;
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;

        // Biggest win
        if (maxWinMargin === null || scoreMargin > maxWinMargin) {
          maxWinMargin = scoreMargin;
        }
      } else {
        losses++;
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak)
          maxLossStreak = currentLossStreak;

        // Biggest loss
        if (maxLossMargin === null || scoreMargin < maxLossMargin) {
          maxLossMargin = scoreMargin;
        }
      }
    });

    setOpponentStats({
      totalMatches: wins + losses,
      wins,
      losses,
      maxWinMargin,
      maxLossMargin,
      maxWinStreak,
      maxLossStreak,
      gainedScores: sortedMatches.reduce((acc, match) => {
        if (match.player1Id === userId) {
          return acc + match.player1.scores;
        } else {
          return acc + match.player2.scores;
        }
      }, 0),
      lostScores: sortedMatches.reduce((acc, match) => {
        if (match.player1Id === userId) {
          return acc + match.player2.scores;
        } else {
          return acc + match.player1.scores;
        }
      }, 0),
    });
  }, [selectedOpponent, filteredMatches, userId]);

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  const rank = player ? getRank(player.maxRating || player.rating) : '';
  const rankExplanations = getAllRankExplanations();

  const getChartData = () => {
    if (!filteredMatches || filteredMatches.length === 0) return null;
  
    const dates = [];
    const results = [];
  
    filteredMatches
      .slice() 
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) 
      .forEach((match) => {
        const isWinner =
          (match.player1Id === userId && match.winner === match.player1.name) ||
          (match.player2Id === userId && match.winner === match.player2.name);
  
        dates.push(match.timestamp.split(' ')[0]);
        results.push(isWinner ? 1 : -1);
      });
  
    return {
      labels: dates, 
      datasets: [
        {
          label: 'Match Results',
          data: results,
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };
  

  const getScoreDifferenceData = () => {
    if (!filteredMatches || filteredMatches.length === 0) return null;
  
    const dates = [];
    const differences = [];
  
    filteredMatches
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) 
      .forEach((match) => {
        const playerScore =
          match.player1Id === userId
            ? match.player1.scores
            : match.player2.scores;
        const opponentScore =
          match.player1Id === userId
            ? match.player2.scores
            : match.player1.scores;
  
        dates.push(match.timestamp.split(' ')[0]);
        differences.push(playerScore - opponentScore);
      });
  
    return {
      labels: dates,
      datasets: [
        {
          label: 'Score Difference',
          data: differences,
          borderColor: 'rgba(255,99,132,1)',
          backgroundColor: 'rgba(255,99,132,0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };
  

  const getRatingData = () => {
    if (!filteredMatches || filteredMatches.length === 0) return null;
  
    const dates = [];
    const ratings = [];
  
    filteredMatches
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach((match) => {
        const rating =
          match.player1Id === userId
            ? match.player1.newRating
            : match.player2.newRating;
  
        dates.push(match.timestamp.split(' ')[0]);
        ratings.push(rating);
      });
  
    return {
      labels: dates,
      datasets: [
        {
          label: 'Rating Over Time',
          data: ratings,
          borderColor: 'rgba(54,162,235,1)',
          backgroundColor: 'rgba(54,162,235,0.2)',
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };
  

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-outfit font-bold mb-6'>Player Profile</h1>
      <div className='bg-white shadow rounded-lg p-6 mb-8 relative'>
        <div className='flex flex-col sm:flex-row justify-between items-start'>
          <div className='w-full sm:w-1/2'>
            <div className='text-2xl font-outfit font-bold mb-4 text-gray-700'>
              <span>{player ? player.name : 'Player Name'}</span>
              {userId && user?.uid === userId && (
                <>
                  <button
                    onClick={handleEditClick}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginLeft: '8px',
                    }}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  {displayInput && (
                    <>
                      <input
                        type='text'
                        className='border border-gray-300 rounded px-2 py-1 ml-2'
                        value={player ? player.name : ''}
                        onChange={(e) =>
                          setPlayer({ ...player, name: e.target.value })
                        }
                      />
                      <button
                        onClick={handleSaveName}
                        className='bg-blue-500 text-white rounded px-2 py-1 ml-2'
                      >
                        Save
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            {loadingPlayer ? (
              <div className='animate-pulse'>
                <div className='h-4 bg-gray-300 rounded w-3/4 mb-4'></div>
                <div className='h-4 bg-gray-300 rounded w-1/2 mb-4'></div>
                <div className='h-4 bg-gray-300 rounded w-1/4 mb-4'></div>
              </div>
            ) : (
              <>
                <p className='text-gray-700'>
                  <strong>Rating:</strong> {player.rating}
                </p>
                <p className='text-gray-700'>
                  <strong>Max Rating:</strong>{' '}
                  {player.maxRating || player.rating}
                </p>
                <p className='text-gray-700'>
                  <strong>Total Matches:</strong>{' '}
                  {player.totalMatches ? player.totalMatches : 0}
                </p>
                <p className='text-gray-700'>
                  <strong>Wins:</strong> {player.wins ? player.wins : 0}
                </p>
                <p className='text-gray-700'>
                  <strong>Losses:</strong> {player.losses ? player.losses : 0}
                </p>
                <p className='text-gray-700'>
                  <strong>Win Rate:</strong>{' '}
                  {player.totalMatches
                    ? `${((player.wins / player.totalMatches) * 100).toFixed(
                        2
                      )}%`
                    : '0%'}
                </p>
                <p className='text-gray-700'>
                  <strong>Current Win Streak:</strong> {currentWinStreak}
                </p>
                <p className='text-gray-700'>
                  <strong>Max Win Streak:</strong> {maxWinStreak}
                </p>
              </>
            )}
          </div>

          <div className='w-full sm:w-1/2 flex justify-center sm:justify-end mt-6 sm:mt-0'>
            {rank && (
              <div
                className='text-center'
                data-tooltip-id='rank-tooltip'
                data-tooltip-html={rankExplanations}
              >
                <span className='text-lg font-bold mr-2 text-gray-700'>
                  {rank}
                </span>
                <span className='text-4xl'>
                  <span dangerouslySetInnerHTML={{ __html: getMedal(rank) }} />
                </span>
                <Tooltip id='rank-tooltip' />
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className='text-2xl font-outfit font-bold mb-4'>
        Filter by Opponent
      </h2>
      <select
        className='w-full md:w-1/2 bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md mb-4'
        value={selectedOpponent}
        onChange={handleOpponentChange}
      >
        <option value=''>All Opponents</option>
        {opponentsList.map((opponent) => (
          <option key={opponent.id} value={opponent.id}>
            {opponent.name}
          </option>
        ))}
      </select>

      {opponentStats && (
        <div className='bg-white shadow rounded-lg p-6 mb-8'>
          <h3 className='text-xl font-outfit font-bold mb-4 text-gray-700'>
            Statistics against{' '}
            {opponentsList.find((o) => o.id === selectedOpponent)?.name}
          </h3>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='total-matches-tooltip'
              data-tooltip-content='Total number of matches played against this opponent.'
            >
              Matches Played:
            </strong>{' '}
            {opponentStats.totalMatches}
            <Tooltip id='total-matches-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='wins-tooltip'
              data-tooltip-content='Total number of matches you won against this opponent.'
            >
              Matches Won:
            </strong>{' '}
            {opponentStats.wins}
            <Tooltip id='wins-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='losses-tooltip'
              data-tooltip-content='Total number of matches you lost against this opponent.'
            >
              Matches Lost:
            </strong>{' '}
            {opponentStats.losses}
            <Tooltip id='losses-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='win-rate-tooltip'
              data-tooltip-content='Percentage of matches won against this opponent.'
            >
              Win Percentage:
            </strong>{' '}
            {opponentStats.totalMatches
              ? `${(
                  (opponentStats.wins / opponentStats.totalMatches) *
                  100
                ).toFixed(2)}%`
              : '0%'}
            <Tooltip id='win-rate-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='biggest-win-tooltip'
              data-tooltip-content='The largest score difference in a match you won. For example, a match ending 11-2 results in a margin of 9.'
            >
              Best Win Margin:
            </strong>{' '}
            {opponentStats.maxWinMargin}
            <Tooltip id='biggest-win-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='biggest-loss-tooltip'
              data-tooltip-content='The largest score difference in a match you lost. For example, a match ending 2-11 results in a margin of 9.'
            >
              Worst Loss Margin:
            </strong>{' '}
            {Math.abs(opponentStats.maxLossMargin)}
            <Tooltip id='biggest-loss-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='gained-scores-tooltip'
              data-tooltip-content='The total number of points you scored against this opponent in all matches.'
            >
              Points Scored:
            </strong>{' '}
            {opponentStats.gainedScores}
            <Tooltip id='gained-scores-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='lost-scores-tooltip'
              data-tooltip-content='The total number of points scored by your opponent in all matches.'
            >
              Points Conceded:
            </strong>{' '}
            {opponentStats.lostScores}
            <Tooltip id='lost-scores-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='score-difference-tooltip'
              data-tooltip-content='The difference between points you scored and points conceded. A positive value indicates you scored more points than you conceded.'
            >
              Points Difference:
            </strong>{' '}
            {opponentStats.gainedScores - opponentStats.lostScores}
            <Tooltip id='score-difference-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='longest-win-streak-tooltip'
              data-tooltip-content='The longest consecutive streak of wins against this opponent.'
            >
              Longest Winning Streak:
            </strong>{' '}
            {opponentStats.maxWinStreak}
            <Tooltip id='longest-win-streak-tooltip' />
          </p>

          <p className='text-gray-700'>
            <strong
              data-tooltip-id='longest-loss-streak-tooltip'
              data-tooltip-content='The longest consecutive streak of losses against this opponent.'
            >
              Longest Losing Streak:
            </strong>{' '}
            {opponentStats.maxLossStreak}
            <Tooltip id='longest-loss-streak-tooltip' />
          </p>

          {filteredMatches.length > 0 && (
            <div className='bg-white shadow rounded-lg p-6 mb-8'>
              <h3 className='text-xl font-outfit font-bold mb-4 text-gray-700'>
                Match Performance Over Time
              </h3>
              <Line
                data={getChartData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const matchIndex = tooltipItem.dataIndex;
                          const match = filteredMatches[matchIndex];
                          const winner = match.winner;
                          const playerScore =
                            match.player1Id === userId
                              ? match.player1.scores
                              : match.player2.scores;
                          const opponentScore =
                            match.player1Id === userId
                              ? match.player2.scores
                              : match.player1.scores;
                          const ratingAfterMatch =
                            match.player1Id === userId
                              ? match.player1.newRating
                              : match.player2.newRating;

                          return [
                            `Winner: ${winner}`,
                            `Score: ${playerScore} - ${opponentScore}`,
                            `Rating After Match: ${ratingAfterMatch}`,
                            `Date: ${match.timestamp}`,
                          ].join('\n');
                        },
                      },
                    },
                    zoom: {
                      pan: { enabled: true, mode: 'x' },
                      zoom: {
                        pinch: { enabled: true },
                        wheel: { enabled: true },
                        mode: 'x',
                      },
                    },
                  },
                  scales: {
                    x: {
                      type: 'category',
                      title: {
                        display: true,
                        text: 'Timeline',
                      },
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Values',
                      },
                    },
                  },                  
                }}
              />
            </div>
          )}

          {filteredMatches.length > 0 && (
            <div className='bg-white shadow rounded-lg p-6 mb-8'>
              <h3 className='text-xl font-outfit font-bold mb-4 text-gray-700'>
                Score Difference Over Time
              </h3>
              <Line
                data={getScoreDifferenceData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const matchIndex = tooltipItem.dataIndex;
                          const match = filteredMatches[matchIndex];
                          const playerScore =
                            match.player1Id === userId
                              ? match.player1.scores
                              : match.player2.scores;
                          const opponentScore =
                            match.player1Id === userId
                              ? match.player2.scores
                              : match.player1.scores;
                          const scoreDifference = playerScore - opponentScore;
                          const winner = match.winner;

                          return [
                            `Winner: ${winner}`,
                            `Player Score: ${playerScore}`,
                            `Opponent Score: ${opponentScore}`,
                            `Score Difference: ${scoreDifference}`,
                            `Date: ${match.timestamp}`,
                          ].join('\n');
                        },
                      },
                    },
                    zoom: {
                      pan: { enabled: true, mode: 'x' },
                      zoom: {
                        pinch: { enabled: true },
                        wheel: { enabled: true },
                        mode: 'x',
                      },
                    },
                  },
                  scales: {
                    x: {
                      type: 'category',
                      title: {
                        display: true,
                        text: 'Timeline',
                      },
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Values',
                      },
                    },
                  },                  
                }}
              />
            </div>
          )}

          {filteredMatches.length > 0 && (
            <div className='bg-white shadow rounded-lg p-6 mb-8'>
              <h3 className='text-xl font-outfit font-bold mb-4 text-gray-700'>
                Rating Over Time
              </h3>
              <Line
                data={getRatingData()}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                      callbacks: {
                        label: (tooltipItem) => {
                          const matchIndex = tooltipItem.dataIndex;
                          const match = filteredMatches[matchIndex];
                          const oldRating =
                            match.player1Id === userId
                              ? match.player1.oldRating
                              : match.player2.oldRating;
                          const newRating =
                            match.player1Id === userId
                              ? match.player1.newRating
                              : match.player2.newRating;
                          const ratingChange = newRating - oldRating;

                          return [
                            `Old Rating: ${oldRating}`,
                            `New Rating: ${newRating}`,
                            `Change: ${
                              ratingChange > 0
                                ? `+${ratingChange}`
                                : ratingChange
                            }`,
                            `Date: ${match.timestamp}`,
                          ].join('\n');
                        },
                      },
                    },
                    zoom: {
                      pan: { enabled: true, mode: 'x' },
                      zoom: {
                        pinch: { enabled: true },
                        wheel: { enabled: true },
                        mode: 'x',
                      },
                    },
                  },
                  scales: {
                    x: {
                      type: 'category',
                      title: {
                        display: true,
                        text: 'Timeline',
                      },
                      ticks: {
                        autoSkip: true,
                        maxTicksLimit: 10,
                      },
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Values',
                      },
                    },
                  },                  
                }}
              />
            </div>
          )}
        </div>
      )}

      <h2 className='text-2xl font-outfit font-bold mb-4'>Last Matches</h2>
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
            {loadingMatches ? (
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
            ) : filteredMatches.length > 0 ? (
              filteredMatches.map((match, index) => (
                <tr key={index}>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.player1.name} vs {match.player2.name}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.player1.scores} - {match.player2.scores}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
                    {match.winner}
                  </td>
                  <td className='py-4 px-6 text-sm text-gray-900'>
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

export default Player;
