import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { db } from '../../firebase';

/******************************************************
 * HELPERS
 ******************************************************/
function generateRoundRobinMatches(participants) {
  const matches = [];
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        matchId: crypto.randomUUID(),
        player1: participants[i],
        player2: participants[j],
        scorePlayer1: 0,
        scorePlayer2: 0,
        winner: null,
        matchStatus: 'notStarted',
      });
    }
  }
  return matches;
}

function computeRoundResults(matches) {
  const stats = {};
  matches.forEach((match) => {
    // initialize
    if (!stats[match.player1.userId]) {
      stats[match.player1.userId] = { userId: match.player1.userId, name: match.player1.name, wins: 0, losses: 0 };
    }
    if (!stats[match.player2.userId]) {
      stats[match.player2.userId] = { userId: match.player2.userId, name: match.player2.name, wins: 0, losses: 0 };
    }
    // tally
    if (match.winner === match.player1.userId) {
      stats[match.player1.userId].wins++;
      stats[match.player2.userId].losses++;
    } else if (match.winner === match.player2.userId) {
      stats[match.player2.userId].wins++;
      stats[match.player1.userId].losses++;
    }
  });
  return Object.values(stats).map((p) => ({
    ...p,
    totalMatches: p.wins + p.losses,
  }));
}

async function awardTournamentAchievements(finalResults, champion, tournamentDocId) {
  try {
    for (let i = 0; i < finalResults.length; i++) {
      const player = finalResults[i];
      const userRef = doc(db, 'users', player.userId);
      const snap = await getDoc(userRef);
      if (!snap.exists()) continue;

      const userData = snap.data();
      const achievements = Array.isArray(userData.achievements) ? userData.achievements : [];

      achievements.push({
        type: 'tournamentFinish',
        tournamentId: tournamentDocId,
        dateFinished: new Date().toLocaleString(),
        place: i + 1,
        wins: player.wins,
        losses: player.losses,
      });

      await updateDoc(userRef, { achievements });
    }
  } catch (err) {
    console.error('Error awarding achievements:', err);
  }
}

/******************************************************
 * KNOCKOUT (4-Person) Fill Next Round
 * Round "knockoutSemis" => 2 matches => fill "knockoutFinal" => final + 3rd
 ******************************************************/
function fillKnockoutFinalRound(bracket, fromRoundIndex) {
  const fromRound = bracket.rounds[fromRoundIndex]; // the semis
  const toRound = bracket.rounds[fromRoundIndex + 1]; // the final+3rd
  if (!fromRound || !toRound) return bracket;

  // Must have 2 matches finished
  if (fromRound.matches.some((m) => m.matchStatus !== 'finished')) return bracket;

  let [semi1, semi2] = fromRound.matches;
  let semi1Winner, semi1Loser;
  if (semi1.winner === semi1.player1?.userId) {
    semi1Winner = semi1.player1; semi1Loser = semi1.player2;
  } else {
    semi1Winner = semi1.player2; semi1Loser = semi1.player1;
  }

  let semi2Winner, semi2Loser;
  if (semi2.winner === semi2.player1?.userId) {
    semi2Winner = semi2.player1; semi2Loser = semi2.player2;
  } else {
    semi2Winner = semi2.player2; semi2Loser = semi2.player1;
  }

  // toRound => [0] = 3rd, [1] = final
  let match3rd = toRound.matches[0];
  let matchFinal = toRound.matches[1];

  match3rd.player1 = semi1Loser;
  match3rd.player2 = semi2Loser;
  match3rd.scorePlayer1 = 0;
  match3rd.scorePlayer2 = 0;
  match3rd.winner = null;
  match3rd.matchStatus = 'notStarted';

  matchFinal.player1 = semi1Winner;
  matchFinal.player2 = semi2Winner;
  matchFinal.scorePlayer1 = 0;
  matchFinal.scorePlayer2 = 0;
  matchFinal.winner = null;
  matchFinal.matchStatus = 'notStarted';

  toRound.status = 'ongoing';
  bracket.currentRound = fromRoundIndex + 1;
  return bracket;
}

function finalizeKnockoutFinalRound(bracket, finalRoundIndex) {
  const finalRound = bracket.rounds[finalRoundIndex];
  // [0] = 3rd, [1] = final
  const [thirdMatch, finalMatch] = finalRound.matches;
  if (!thirdMatch || !finalMatch) return bracket;
  // must both be finished
  if (thirdMatch.matchStatus !== 'finished' || finalMatch.matchStatus !== 'finished') {
    return bracket;
  }
  bracket.stage = 'completed';
  // champion from finalMatch
  if (finalMatch.winner === finalMatch.player1?.userId) {
    bracket.champion = finalMatch.player1;
  } else {
    bracket.champion = finalMatch.player2;
  }
  return bracket;
}

/******************************************************
 * If after iterative approach => 4 remain => create 2 new knockout rounds
 ******************************************************/
function createKnockoutRoundsForLast4(bracket, roundIndex, participants) {
  // Round #roundIndex => semis
  const semis = {
    roundIndex,
    type: 'knockoutSemis',
    status: 'ongoing',
    participants,
    matches: [
      {
        matchId: crypto.randomUUID(),
        name: 'Semifinal #1',
        player1: participants[0],
        player2: participants[1],
        scorePlayer1: 0,
        scorePlayer2: 0,
        winner: null,
        matchStatus: 'notStarted',
      },
      {
        matchId: crypto.randomUUID(),
        name: 'Semifinal #2',
        player1: participants[2],
        player2: participants[3],
        scorePlayer1: 0,
        scorePlayer2: 0,
        winner: null,
        matchStatus: 'notStarted',
      },
    ],
  };
  // Round #roundIndex+1 => final & 3rd
  const finalRound = {
    roundIndex: roundIndex + 1,
    type: 'knockoutFinal',
    status: 'waiting',
    participants: [],
    matches: [
      {
        matchId: crypto.randomUUID(),
        name: '3rd Place',
        player1: null,
        player2: null,
        scorePlayer1: 0,
        scorePlayer2: 0,
        winner: null,
        matchStatus: 'notStarted',
      },
      {
        matchId: crypto.randomUUID(),
        name: 'Grand Final',
        player1: null,
        player2: null,
        scorePlayer1: 0,
        scorePlayer2: 0,
        winner: null,
        matchStatus: 'notStarted',
      },
    ],
  };
  bracket.rounds.push(semis, finalRound);
  bracket.currentRound = roundIndex; // start at semis
  return bracket;
}

/******************************************************
 * MAIN COMPONENT
 ******************************************************/
export default function MultiRoundRoundRobinView({ tournament, onTournamentUpdate }) {
  const bracket = tournament?.bracket;
  if (!bracket || !bracket.rounds) {
    return <div className="p-4 text-red-600 font-semibold">No bracket data available.</div>;
  }

  const currentRoundIndex = bracket.currentRound || 0;

  return (
    <div className="max-w-4xl mx-auto mt-6 space-y-6">
      {bracket.rounds.map((round, idx) => (
        <RoundView
          key={idx}
          bracket={bracket}
          tournamentId={tournament.id}
          roundData={round}
          roundIndex={idx}
          isCurrent={idx === currentRoundIndex}
          onTournamentUpdate={onTournamentUpdate}
        />
      ))}

      {bracket.stage === 'completed' && bracket.champion && (
        <div className="p-4 mt-4 border-2 border-green-500 rounded shadow-md bg-green-50">
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            Tournament Completed!
          </h2>
          <p className="text-lg font-semibold mb-2">
            Champion: <span className="text-green-800">{bracket.champion.name}</span>
          </p>
          {bracket.finalStats && (
            <div className="mt-4">
              <h3 className="font-bold text-lg text-gray-700 mb-2">
                Final Standings
              </h3>
              <ol className="list-decimal ml-6 space-y-1">
                {bracket.finalStats.map((p, i) => (
                  <li key={p.userId} className="text-gray-800">
                    <span className="font-medium">{p.name}</span>
                    {' '}— {p.wins}W / {p.losses}L
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/******************************************************
 * RoundView
 ******************************************************/
function RoundView({
  bracket,
  tournamentId,
  roundData,
  roundIndex,
  isCurrent,
  onTournamentUpdate,
}) {
  const [localMatches, setLocalMatches] = useState(() => [...roundData.matches]);
  const { participants, matches, status, type } = roundData;
  const isFinished = (status === 'finished');
  const roundNumber = roundIndex + 1;

  // Score input changes
  const handleScoreChange = (matchId, field, value) => {
    setLocalMatches((prev) =>
      prev.map((m) =>
        m.matchId === matchId
          ? { ...m, [field]: Number(value) || 0, matchStatus: 'inProgress' }
          : m
      )
    );
  };

  // On blur, just save the scores
  const handleScoreBlur = async (matchId) => {
    const localMatch = localMatches.find((m) => m.matchId === matchId);
    if (!localMatch) return;
    const updatedMatches = matches.map((orig) =>
      orig.matchId === matchId
        ? {
            ...orig,
            scorePlayer1: localMatch.scorePlayer1,
            scorePlayer2: localMatch.scorePlayer2,
            matchStatus: localMatch.matchStatus,
          }
        : orig
    );
    const newRound = { ...roundData, matches: updatedMatches };
    const newRounds = bracket.rounds.map((r, rIdx) => (rIdx === roundIndex ? newRound : r));
    const newBracket = { ...bracket, rounds: newRounds };

    await updateDoc(doc(db, 'tournament-rooms', tournamentId), {
      bracket: newBracket,
    });
    onTournamentUpdate();
  };

  // Finish round => finalize winners => move forward
  const handleFinishRound = async () => {
    // 1) finalize winners
    const finalMatches = localMatches.map((m) => {
      let winner = null;
      let matchStatus = 'finished';
      if (m.scorePlayer1 > m.scorePlayer2) {
        winner = m.player1?.userId;
      } else if (m.scorePlayer2 > m.scorePlayer1) {
        winner = m.player2?.userId;
      } else {
        matchStatus = 'draw'; 
      }
      return { ...m, winner, matchStatus };
    });

    const newRound = { ...roundData, matches: finalMatches, status: 'finished' };
    let newRounds = [...bracket.rounds];
    newRounds[roundIndex] = newRound;
    let newBracket = { ...bracket, rounds: newRounds };

    // 2) If it is an iterative round:
    if (type === 'iterative') {
      // compute results => remove last
      const results = computeRoundResults(finalMatches).sort((a, b) => b.wins - a.wins);
      const summary = {
        eliminated: null,
        standings: results.map((r, i) => ({ ...r, rank: i + 1 })),
      };

      if (results.length > 4) {
        // Remove last place => new iterative round
        summary.eliminated = results[results.length - 1].name;
        const newParticipants = results.slice(0, results.length - 1).map((p) => ({
          userId: p.userId,
          name: p.name,
        }));
        const nextRoundIndex = roundIndex + 1;
        // create next iterative round
        newRounds[nextRoundIndex] = {
          roundIndex: nextRoundIndex,
          type: 'iterative',
          status: 'ongoing',
          participants: newParticipants,
          matches: generateRoundRobinMatches(newParticipants),
        };
        newBracket = {
          ...newBracket,
          currentRound: nextRoundIndex,
          rounds: newRounds,
        };

        // Save summary
        await updateDoc(doc(db, 'tournament-rooms', tournamentId), {
          bracket: newBracket,
          [`roundSummary_${roundIndex}`]: summary,
        });
        onTournamentUpdate();
        return;
      }
      else if (results.length === 4) {
        // we now create semis + final
        summary.eliminated = results[results.length - 1].name;
        const final4 = results.map((p) => ({
          userId: p.userId,
          name: p.name,
        }));
        const nextRoundIndex = roundIndex + 1;
        // create 2 knockout rounds for these 4
        newBracket.rounds = newRounds.slice(0, roundIndex + 1); 
        // discard any leftover
        newBracket = createKnockoutRoundsForLast4(newBracket, nextRoundIndex, final4);

        await updateDoc(doc(db, 'tournament-rooms', tournamentId), {
          bracket: newBracket,
          [`roundSummary_${roundIndex}`]: summary,
        });
        onTournamentUpdate();
        return;
      }
      else {
        // if <= 3 left => we do the same approach as if it's final
        // but let's keep it simple => we crown champion
        const champion = results[0];
        newBracket.stage = 'completed';
        newBracket.champion = champion;
        newBracket.finalStats = results;
        summary.eliminated = results.length > 1 ? results[results.length - 1].name : null;

        await updateDoc(doc(db, 'tournament-rooms', tournamentId), {
          bracket: newBracket,
          [`roundSummary_${roundIndex}`]: summary,
        });
        // award achievements
        await awardTournamentAchievements(results, champion, tournamentId);
        onTournamentUpdate();
        return;
      }
    }
    else if (type === 'knockoutSemis') {
      // fill next round => final + 3rd
      newBracket = fillKnockoutFinalRound(newBracket, roundIndex);
    }
    else if (type === 'knockoutFinal') {
      // finalize
      newBracket = finalizeKnockoutFinalRound(newBracket, roundIndex);
    }

    // 3) Write newBracket
    await updateDoc(doc(db, 'tournament-rooms', tournamentId), {
      bracket: newBracket,
    });

    // If bracket is completed => achievements
    if (newBracket.stage === 'completed' && newBracket.champion) {
      const results = computeRoundResults(finalMatches).sort((a, b) => b.wins - a.wins);
      await awardTournamentAchievements(results, newBracket.champion, tournamentId);
    }

    onTournamentUpdate();
  };

  return (
    <div
      className={`border-l-4 ${
        isFinished ? 'border-gray-400 bg-gray-100' : 'border-blue-400 bg-white'
      } rounded-lg shadow-md p-4 mb-6`}
    >
      <h2 className="text-2xl font-bold mb-2 text-gray-800">
        {type === 'iterative' ? `Round Robin #${roundNumber}` : `Round ${roundNumber}`} 
        {' '}
        <span className="text-sm text-gray-600">({status})</span>
      </h2>
      <div className="text-sm text-gray-600 mb-2">
        <strong>Participants:</strong>{' '}
        {(participants || []).map((p) => p.name).join(', ')}
      </div>

      {isFinished ? (
        <p className="italic text-sm text-gray-500">
          This round is finished. See next round or final results.
        </p>
      ) : (
        <div className="space-y-3 mt-3">
          {localMatches.map((match) => (
            <div
              key={match.matchId}
              className="flex items-center gap-3 bg-gray-50 border border-gray-300 p-2 rounded"
            >
              <span className="w-24 text-right font-semibold text-gray-600">
                {match.player1?.name || '—'}
              </span>
              <input
                type="number"
                className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700"
                value={match.scorePlayer1}
                onChange={(e) =>
                  handleScoreChange(match.matchId, 'scorePlayer1', e.target.value)
                }
                onBlur={() => handleScoreBlur(match.matchId)}
              />
              <span className="font-bold">-</span>
              <input
                type="number"
                className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-gray-700"
                value={match.scorePlayer2}
                onChange={(e) =>
                  handleScoreChange(match.matchId, 'scorePlayer2', e.target.value)
                }
                onBlur={() => handleScoreBlur(match.matchId)}
              />
              <span className="w-24 text-left font-semibold text-gray-600">
                {match.player2?.name || '—'}
              </span>
            </div>
          ))}
          {isCurrent && status !== 'finished' && (
            <button
              onClick={handleFinishRound}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded focus:outline-none"
            >
              Finish Round {roundNumber}
            </button>
          )}
        </div>
      )}
    </div>
  );
}