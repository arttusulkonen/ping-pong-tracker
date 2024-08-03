import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { db } from '../firebase';

const UpdateMatches = () => {
  const [updating, setUpdating] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [error, setError] = useState(null);

  const updateMatches = async () => {
    setUpdating(true);
    setError(null);
    try {
      const matchesCollection = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesCollection);
      let count = 0;

      for (const matchDoc of matchesSnapshot.docs) {
        const matchData = matchDoc.data();
        // Check if matchData has the old structure
        if (matchData.match && matchData.match.player1 && matchData.match.player2) {
          // Create new structure
          const updatedMatchData = {
            player1Id: matchData.match.player1.id,
            player2Id: matchData.match.player2.id,
            players: [matchData.match.player1.id, matchData.match.player2.id],
            player1: {
              name: matchData.match.player1.name,
              scores: matchData.match.player1.scores,
            },
            player2: {
              name: matchData.match.player2.name,
              scores: matchData.match.player2.scores,
            },
            timestamp: matchData.match.timestamp,
            roomId: matchData.match.roomId,
            winner: matchData.match.winner,
          };
          const matchRef = doc(db, 'matches', matchDoc.id);
          // Overwrite the document with the new structure
          await setDoc(matchRef, updatedMatchData, { merge: false });
          count += 1;
        }
      }
      setUpdatedCount(count);
    } catch (err) {
      setError('Error updating matches');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h1>Update Matches</h1>
      <button onClick={updateMatches} disabled={updating}>
        {updating ? 'Updating...' : 'Update Matches'}
      </button>
      {updatedCount > 0 && <p>Updated {updatedCount} matches</p>}
      {error && <p>{error}</p>}
    </div>
  );
};

export default UpdateMatches;
