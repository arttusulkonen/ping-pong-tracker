import { v4 as uuid } from 'uuid';

const newMatch = (name = '', p1 = null, p2 = null) => ({
  matchId: uuid(),
  name,
  matchStatus: 'notStarted',
  player1: p1,
  player2: p2,
  scorePlayer1: 0,
  scorePlayer2: 0,
  winner: null,
});

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const generateRoundRobinMatches = (players) => {
  const matches = [];
  for (let i = 0; i < players.length - 1; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push(
        newMatch(
          `${players[i].name} vs ${players[j].name}`,
          { userId: players[i].userId, name: players[i].name },
          { userId: players[j].userId, name: players[j].name }
        )
      );
    }
  }
  return shuffle(matches);
};

export const computeTable = (matches) => {
  const table = {};
  matches.forEach((m) => {
    const p1 = m.player1;
    const p2 = m.player2;
    table[p1.userId] = table[p1.userId] || {
      userId: p1.userId,
      name: p1.name,
      wins: 0,
      losses: 0,
      pf: 0,
      pa: 0,
    };
    table[p2.userId] = table[p2.userId] || {
      userId: p2.userId,
      name: p2.name,
      wins: 0,
      losses: 0,
      pf: 0,
      pa: 0,
    };
    table[p1.userId].pf += m.scorePlayer1;
    table[p1.userId].pa += m.scorePlayer2;
    table[p2.userId].pf += m.scorePlayer2;
    table[p2.userId].pa += m.scorePlayer1;
    if (m.winner === p1.userId) {
      table[p1.userId].wins++;
      table[p2.userId].losses++;
    } else if (m.winner === p2.userId) {
      table[p2.userId].wins++;
      table[p1.userId].losses++;
    }
  });
  return Object.values(table).sort((a, b) => b.wins - a.wins || b.pf - a.pf);
};

const makeRound = (label, type, count, index) => ({
  label,
  type,
  roundIndex: index,
  status: 'waiting',
  matches: Array.from({ length: count }, () => newMatch()),
  participants: [],
});

const attachPlayer = (matchObj, slot, player) => {
  matchObj[slot] = { userId: player.userId, name: player.name };
};

export const buildBracketSkeleton = (players) => {
  const n = players.length;
  if (![4, 6, 8].includes(n)) throw new Error('Supported sizes: 4, 6, 8');
  const rounds = [
    {
      label: 'Round-Robin',
      type: 'roundRobin',
      roundIndex: 0,
      status: 'ongoing',
      matches: generateRoundRobinMatches(players),
      participants: players.map((p) => ({ userId: p.userId, name: p.name })),
    },
  ];
  let idx = 1;
  const needQuarters = n >= 6;
  const quarters = needQuarters
    ? makeRound('Quarter-finals', 'knockoutQuarters', n === 6 ? 3 : 4, idx++)
    : null;
  const semis = makeRound('Semi-finals', 'knockoutSemis', 2, idx++);
  const finals = makeRound('Finals', 'knockoutFinal', 2, idx++);
  finals.matches[0].name = '3rd Place';
  finals.matches[1].name = 'Grand Final';
  if (quarters) rounds.push(quarters);
  rounds.push(semis, finals);
  return {
    stage: 'roundRobinThenKO',
    currentRound: 0,
    champion: null,
    finalStats: null,
    rounds,
  };
};

export const seedKnockoutRounds = (bracket, finishedRound) => {
  const { rounds } = bracket;
  if (finishedRound.type === 'roundRobin') {
    const standings = computeTable(finishedRound.matches);
    const quarters = rounds.find((r) => r.type === 'knockoutQuarters');
    const semis = rounds.find((r) => r.type === 'knockoutSemis');
    if (quarters) {
      const pairs =
        standings.length === 6
          ? [
              [0, 5],
              [1, 4],
              [2, 3],
            ]
          : [
              [0, 7],
              [1, 6],
              [2, 5],
              [3, 4],
            ];
      pairs.forEach(([a, b], i) => {
        attachPlayer(quarters.matches[i], 'player1', standings[a]);
        attachPlayer(quarters.matches[i], 'player2', standings[b]);
      });
      quarters.participants = standings;
      quarters.status = 'ongoing';
      bracket.currentRound = quarters.roundIndex;
    } else {
      attachPlayer(semis.matches[0], 'player1', standings[0]);
      attachPlayer(semis.matches[0], 'player2', standings[3]);
      attachPlayer(semis.matches[1], 'player1', standings[1]);
      attachPlayer(semis.matches[1], 'player2', standings[2]);
      semis.participants = standings;
      semis.status = 'ongoing';
      bracket.currentRound = semis.roundIndex;
    }
    return;
  }
  if (finishedRound.type === 'knockoutQuarters') {
    const winners = [];
    const losers = [];
    finishedRound.matches.forEach((m) => {
      const w = m.winner === m.player1.userId ? m.player1 : m.player2;
      const l = m.winner === m.player1.userId ? m.player2 : m.player1;
      winners.push(w);
      losers.push(l);
    });
    if (winners.length === 3) {
      const seeds = bracket.rounds[0].participants.map((p) => p.userId);
      losers.sort((a, b) => seeds.indexOf(a.userId) - seeds.indexOf(b.userId));
      winners.push(losers[0]);
    }
    const semis = rounds.find((r) => r.type === 'knockoutSemis');
    attachPlayer(semis.matches[0], 'player1', winners[0]);
    attachPlayer(semis.matches[0], 'player2', winners[3]);
    attachPlayer(semis.matches[1], 'player1', winners[1]);
    attachPlayer(semis.matches[1], 'player2', winners[2]);
    semis.participants = winners;
    semis.status = 'ongoing';
    bracket.currentRound = semis.roundIndex;
    return;
  }
  if (finishedRound.type === 'knockoutSemis') {
    const finals = rounds.find((r) => r.type === 'knockoutFinal');
    finals.matches[0].name = '3rd Place';
    finals.matches[1].name = 'Grand Final';
    const winners = [];
    const losers = [];
    finishedRound.matches.forEach((m) => {
      const w = m.winner === m.player1.userId ? m.player1 : m.player2;
      const l = m.winner === m.player1.userId ? m.player2 : m.player1;
      winners.push(w);
      losers.push(l);
    });
    attachPlayer(finals.matches[0], 'player1', losers[0]);
    attachPlayer(finals.matches[0], 'player2', losers[1]);
    attachPlayer(finals.matches[1], 'player1', winners[0]);
    attachPlayer(finals.matches[1], 'player2', winners[1]);
    finals.participants = [...winners, ...losers];
    finals.status = 'ongoing';
    bracket.currentRound = finals.roundIndex;
  }
};
