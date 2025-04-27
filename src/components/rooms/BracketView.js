import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { computeTable, seedKnockoutRounds } from '../../utils/bracketUtils';

const recordMatch = (tournamentId, roundIndex, match) =>
  addDoc(collection(db, 'tournament-rooms', tournamentId, 'matches'), {
    ...match,
    roundIndex,
    recordedAt: new Date().toISOString(),
  });

const autoFinish = (match) => {
  const { scorePlayer1: s1, scorePlayer2: s2, player1, player2 } = match;
  if (match.matchStatus === 'notStarted' && s1 !== s2) {
    match.winner = s1 > s2 ? player1.userId : player2.userId;
    match.matchStatus = 'finished';
  }
};

const pushResultToUser = async ({
  userId,
  place,
  wins,
  losses,
  pf,
  pa,
  tournamentId,
  tournamentName,
}) => {
  const entry = {
    type: 'tournamentFinish',
    dateFinished: new Date().toLocaleString('en-GB'),
    tournamentId,
    tournamentName,
    place,
    wins,
    losses,
    pointsFor: pf,
    pointsAgainst: pa,
  };
  await updateDoc(doc(db, 'users', userId), {
    achievements: arrayUnion(entry),
    tournamentRooms: arrayUnion(tournamentId),
  }).catch(() => {});
};

export default function BracketView({ tournament, onUpdate }) {
  if (!tournament?.bracket) {
    return <p className='text-red-600 p-4'>Bracket not found</p>;
  }

  const { bracket } = tournament;
  const current = bracket.currentRound ?? 0;

  const rrRounds = bracket.rounds.filter((r) => r.type === 'roundRobin');
  const rrCount = rrRounds.length;
  const lastRR = rrRounds[rrCount - 1];
  const rrSeeds = {};
  if (lastRR) {
    computeTable(lastRR.matches).forEach((p, i) => {
      rrSeeds[p.userId] = i + 1;
    });
  }

  return (
    <div className='space-y-6 text-gray-900'>
      {bracket.rounds.map((r) => (
        <Round
          key={r.roundIndex}
          round={r}
          isCurrent={r.roundIndex === current}
          bracket={bracket}
          tournament={tournament}
          onUpdate={onUpdate}
          rrCount={rrCount}
          rrSeeds={rrSeeds}
        />
      ))}

      {bracket.stage === 'completed' && <FinalTable bracket={bracket} />}
      <div className='bg-gray-100 shadow-md rounded-lg p-4'>
        <h3 className='text-lg font-semibold text-gray-700 mb-2'>
          Tournament Bracket Overview
        </h3>
        <p className='text-sm text-gray-700 mb-2'>
          This tournament uses a hybrid Round-Robin and Knockout format.
        </p>
        <ul className='list-disc list-inside text-sm text-gray-700 mb-4'>
          <li>
            <strong>Round-Robin Phase:</strong> All players face each other once
            to establish initial standings.
          </li>
          <li>
            <strong>Seeding:</strong> After Round-Robin, players are ranked by
            wins and points, then paired highest vs lowest for the next phase.
          </li>
          <li>
            <strong>Knockout Phase:</strong> Top players advance to
            Quarter-finals (if ≥6 players), then Semi-finals, and Finals.
            Semi-final losers meet in a separate 3rd place match.
          </li>
          <li>
            <strong>Progression:</strong> Winners advance to the Grand Final;
            the champion is crowned after the final match.
          </li>
        </ul>
        <p className='text-sm text-gray-700'>
          The bracket ensures fair matchups based on performance and guarantees
          a third-place playoff.
        </p>
      </div>
    </div>
  );
}

function Round({
  round,
  isCurrent,
  bracket,
  tournament,
  onUpdate,
  rrCount,
  rrSeeds,
}) {
  const [matches, setMatches] = useState(round.matches);
  useEffect(() => setMatches(round.matches), [round.matches]);

  const persist = (b) =>
    updateDoc(doc(db, 'tournament-rooms', tournament.id), { bracket: b }).then(
      onUpdate
    );

  const handleScoreChange = (id, field, v) =>
    setMatches((prev) =>
      prev.map((m) => (m.matchId === id ? { ...m, [field]: Number(v) } : m))
    );

  const handleBlur = (m) => {
    const idx = round.roundIndex;
    const newRounds = [...bracket.rounds];
    newRounds[idx] = { ...round, matches };
    persist({ ...bracket, rounds: newRounds });
    recordMatch(tournament.id, idx, m);
  };

  const finishRound = async () => {
    const idx = round.roundIndex;
    const finished = matches.map((m) => {
      const copy = { ...m };
      autoFinish(copy);
      return copy;
    });
    const allDone = finished.every(
      (m) => m.matchStatus === 'finished' && m.winner
    );
    if (!allDone) {
      alert('Please complete all match results before finishing the round.');
      return;
    }

    const newRounds = bracket.rounds.map((r) =>
      r.roundIndex === idx
        ? { ...round, status: 'finished', matches: finished }
        : r
    );
    let b = { ...bracket, rounds: newRounds };

    if (
      ['roundRobin', 'knockoutQuarters', 'knockoutSemis'].includes(round.type)
    ) {
      seedKnockoutRounds(b, newRounds[idx]);
    } else if (round.type === 'knockoutFinal') {
      const bronze = finished.find((m) => m.name === '3rd Place');
      const gf = finished.find((m) => m.name === 'Grand Final');
      const winnerGF =
        gf.winner === gf.player1.userId ? gf.player1 : gf.player2;
      const loserGF = gf.winner === gf.player1.userId ? gf.player2 : gf.player1;
      const winnerBr =
        bronze.winner === bronze.player1.userId
          ? bronze.player1
          : bronze.player2;
      const loserBr =
        bronze.winner === bronze.player1.userId
          ? bronze.player2
          : bronze.player1;

      const statsMap = {};
      computeTable(b.rounds.flatMap((r) => r.matches)).forEach(
        (p) => (statsMap[p.userId] = p)
      );

      const top4 = [
        winnerGF.userId,
        loserGF.userId,
        winnerBr.userId,
        loserBr.userId,
      ];
      const others = b.rounds[0].participants
        .map((p) => p.userId)
        .filter((id) => !top4.includes(id));
      const orderedIds = [...top4, ...others];
      const finalStats = orderedIds.map((uid, i) => ({
        place: i + 1,
        ...statsMap[uid],
      }));

      b = {
        ...b,
        stage: 'completed',
        champion: winnerGF,
        finalStats,
      };

      await Promise.all(
        finalStats.map((row) =>
          pushResultToUser({
            ...row,
            tournamentId: tournament.id,
            tournamentName: tournament.name,
          })
        )
      );
    }

    await persist(b);
    setMatches(finished);
  };

  const scoresReady = matches.every(
    (m) =>
      Number.isFinite(m.scorePlayer1) &&
      Number.isFinite(m.scorePlayer2) &&
      (m.scorePlayer1 !== 0 || m.scorePlayer2 !== 0)
  );

  const renderName = (player) => {
    if (!player) return '—';
    const seed = rrSeeds[player.userId];
    return (
      <>
        {player.name}
        {round.roundIndex >= rrCount && seed && (
          <small className='ml-1 text-gray-500'>#{seed}</small>
        )}
      </>
    );
  };

  return (
    <div
      className={`border-l-4 ${
        round.status === 'finished'
          ? 'border-gray-400 bg-gray-100'
          : 'border-blue-400 bg-white'
      } p-4 rounded`}
    >
      <h2 className='font-bold text-xl mb-2 text-gray-900'>
        {round.label} — Round #{round.roundIndex + 1} ({round.status})
      </h2>

      {matches.map((m) => (
        <div key={m.matchId} className='flex items-center mb-2 text-sm gap-2'>
          <span
            className={`${
              round.roundIndex >= rrCount ? 'w-36' : 'w-28'
            } text-right text-gray-900`}
          >
            {renderName(m.player1)}
          </span>
          <input
            type='number'
            value={m.scorePlayer1}
            onChange={(e) =>
              handleScoreChange(m.matchId, 'scorePlayer1', e.target.value)
            }
            onBlur={() => handleBlur(m)}
            className='w-14 border text-center text-gray-900'
          />
          <span>–</span>
          <input
            type='number'
            value={m.scorePlayer2}
            onChange={(e) =>
              handleScoreChange(m.matchId, 'scorePlayer2', e.target.value)
            }
            onBlur={() => handleBlur(m)}
            className='w-14 border text-center text-gray-900'
          />
          <span
            className={`${
              round.roundIndex >= rrCount ? 'w-36' : 'w-28'
            } text-gray-900`}
          >
            {renderName(m.player2)}
          </span>
        </div>
      ))}

      {isCurrent && round.status !== 'finished' && (
        <button
          onClick={finishRound}
          disabled={!scoresReady}
          className={`mt-2 px-4 py-1 rounded text-white ${
            scoresReady
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Finish round
        </button>
      )}
    </div>
  );
}

const FinalTable = ({ bracket }) => (
  <div className='border p-4 bg-green-50 rounded'>
    <h2 className='text-2xl font-bold mb-4'>
      🏆 Champion:&nbsp;{bracket.champion?.name}
    </h2>
    <table className='w-full text-sm'>
      <thead>
        <tr className='font-semibold border-b'>
          <th className='text-left'>Place</th>
          <th className='text-left'>Player</th>
          <th>W</th>
          <th>L</th>
          <th>PF</th>
          <th>PA</th>
        </tr>
      </thead>
      <tbody>
        {bracket.finalStats?.map((p) => (
          <tr key={p.userId} className='border-b'>
            <td>{p.place}</td>
            <td>
              <a
                href={`/player/${p.userId}`}
                target='_blank'
                rel='noreferrer'
                className='underline'
              >
                {p.name}
              </a>
            </td>
            <td className='text-center'>{p.wins}</td>
            <td className='text-center'>{p.losses}</td>
            <td className='text-center'>{p.pf}</td>
            <td className='text-center'>{p.pa}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
