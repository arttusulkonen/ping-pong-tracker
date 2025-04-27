
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import BracketView from './BracketView';

export default function TournamentRoom() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTournament = React.useCallback(async () => {
    const snap = await getDoc(doc(db, 'tournament-rooms', tournamentId));
    if (snap.exists()) setTournament({ id: snap.id, ...snap.data() });
    setLoading(false);
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  if (loading) return <p className='p-4'>Loading…</p>;
  if (!tournament) return <p className='p-4 text-red-600'>not found</p>;

  return (
    <div className='max-w-5xl mx-auto p-4'>
      <h1 className='text-3xl font-bold mb-4'>{tournament.name}</h1>
      <BracketView tournament={tournament} onUpdate={fetchTournament} />{' '}
    </div>
  );
}
