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
  const { scorePlayer1, scorePlayer2, player1, player2 } = match;
  if (match.matchStatus === 'notStarted' && scorePlayer1 !== scorePlayer2) {
    match.winner =
      scorePlayer1 > scorePlayer2 ? player1.userId : player2.userId;
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

  return (
    <div className='space-y-6 text-gray-900'>
      {bracket.rounds.map((round) => (
        <Round
          key={round.roundIndex}
          round={round}
          isCurrent={round.roundIndex === current}
          bracket={bracket}
          tournament={tournament}
          onUpdate={onUpdate}
        />
      ))}

      {bracket.stage === 'completed' && <FinalTable bracket={bracket} />}
    </div>
  );
}

function Round({ round, isCurrent, bracket, tournament, onUpdate }) {
  const [matches, setMatches] = useState(round.matches);

  useEffect(() => {
    setMatches(round.matches);
  }, [round.matches]);

  const persist = (updatedBracket) =>
    updateDoc(doc(db, 'tournament-rooms', tournament.id), {
      bracket: updatedBracket,
    }).then(onUpdate);

  const handleScoreChange = (matchId, field, value) =>
    setMatches((prev) =>
      prev.map((m) =>
        m.matchId === matchId ? { ...m, [field]: Number(value) } : m
      )
    );

  const handleBlur = (match) => {
    const idx = round.roundIndex;
    const newRounds = [...bracket.rounds];
    newRounds[idx] = { ...round, matches };
    persist({ ...bracket, rounds: newRounds });
    recordMatch(tournament.id, idx, match);
  };

  const finishRound = async () => {
    const idx = round.roundIndex;
    const finishedMatches = matches.map((m) => {
      const copy = { ...m };
      autoFinish(copy);
      return copy;
    });

    const allFinished = finishedMatches.every(
      (m) => m.matchStatus === 'finished' && m.winner
    );
    if (!allFinished) {
      alert('Please complete all match results before finishing the round.');
      return;
    }

    const newRounds = bracket.rounds.map((r) =>
      r.roundIndex === idx
        ? { ...round, status: 'finished', matches: finishedMatches }
        : r
    );
    let updatedBracket = { ...bracket, rounds: newRounds };

    if (
      ['roundRobin', 'knockoutQuarters', 'knockoutSemis'].includes(round.type)
    ) {
      seedKnockoutRounds(updatedBracket, newRounds[idx]);
    } else if (round.type === 'knockoutFinal') {
      const bronzeMatch = finishedMatches.find((m) => m.name === '3rd Place');
      const finalMatch = finishedMatches.find((m) => m.name === 'Grand Final');

      const finalWinner =
        finalMatch.winner === finalMatch.player1.userId
          ? finalMatch.player1
          : finalMatch.player2;
      const finalLoser =
        finalMatch.winner === finalMatch.player1.userId
          ? finalMatch.player2
          : finalMatch.player1;

      const bronzeWinner =
        bronzeMatch.winner === bronzeMatch.player1.userId
          ? bronzeMatch.player1
          : bronzeMatch.player2;
      const bronzeLoser =
        bronzeMatch.winner === bronzeMatch.player1.userId
          ? bronzeMatch.player2
          : bronzeMatch.player1;

      const stats = {};
      computeTable(updatedBracket.rounds.flatMap((r) => r.matches)).forEach(
        (p) => (stats[p.userId] = p)
      );

      const top4 = [
        finalWinner.userId,
        finalLoser.userId,
        bronzeWinner.userId,
        bronzeLoser.userId,
      ];
      const others = updatedBracket.rounds[0].participants
        .map((p) => p.userId)
        .filter((id) => !top4.includes(id));

      const orderedIds = [...top4, ...others];
      const finalStats = orderedIds.map((uid, i) => ({
        place: i + 1,
        ...stats[uid],
      }));

      updatedBracket = {
        ...updatedBracket,
        stage: 'completed',
        champion: finalWinner,
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

    await persist(updatedBracket);
    setMatches(finishedMatches);
  };

  const scoresReady = matches.every(
    (m) =>
      Number.isFinite(m.scorePlayer1) &&
      Number.isFinite(m.scorePlayer2) &&
      (m.scorePlayer1 !== 0 || m.scorePlayer2 !== 0)
  );

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
          <span className='w-28 text-right text-gray-900'>
            {m.player1?.name || '—'}
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
          <span className='w-28 text-gray-900'>{m.player2?.name || '—'}</span>
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
