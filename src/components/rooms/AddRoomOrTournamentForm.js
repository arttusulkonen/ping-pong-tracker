import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Store } from 'react-notifications-component';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { buildBracketSkeleton } from '../../utils/bracketUtils';

const VALID = [4, 6, 8, 12];
const nowISO = () => new Date().toLocaleDateString('fi-FI');
const toast = (title, message, type = 'warning') =>
  Store.addNotification({
    title,
    message,
    type,
    insert: 'top',
    container: 'top-right',
    dismiss: { duration: 3500 },
  });

export default function AddRoomOrTournamentForm({ currentUser, onClose }) {
  const [mode, setMode] = useState('room');
  const [roomName, setRoom] = useState('');
  const [name, setName] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const navigate = useNavigate();

  const loadUsers = useCallback(async () => {
    if (!currentUser) return;
    const meSnap = await getDoc(doc(db, 'users', currentUser.uid));
    const myRooms = meSnap.data()?.rooms || [];
    const snap = await getDocs(collection(db, 'users'));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => (u.rooms || []).some((r) => myRooms.includes(r)));
    setAllUsers(list);
  }, [currentUser]);

  useEffect(() => {
    if (mode === 'tournament') loadUsers();
  }, [mode, loadUsers]);

  useEffect(() => {
    if (mode === 'tournament' && currentUser?.uid) {
      setPicked((p) =>
        p.includes(currentUser.uid) ? p : [currentUser.uid, ...p]
      );
    }
  }, [mode, currentUser]);

  const createRoom = async () => {
    if (!roomName.trim()) return toast('Room Name', 'Enter a room name');
    if (!currentUser) return toast('Authentication', 'You must be logged in');

    const ref = await addDoc(collection(db, 'rooms'), {
      name: roomName,
      creator: currentUser.uid,
      roomCreated: nowISO(),
    });

    await updateDoc(doc(db, 'rooms', ref.id), {
      members: arrayUnion({ userId: currentUser.uid, role: 'admin' }),
    });
    await updateDoc(doc(db, 'users', currentUser.uid), {
      rooms: arrayUnion(ref.id),
    });

    toast('Success', 'Room created', 'success');
    onClose?.();
    navigate(`/rooms/${ref.id}`);
  };

  const createTournament = async () => {
    if (!name.trim())
      return toast('Tournament Name', 'Enter a tournament name');
    if (!currentUser) return toast('Authentication', 'You must be logged in');

    const players = allUsers
      .filter((u) => picked.includes(u.id))
      .map((u) => ({
        userId: u.id,
        name: u.name || u.email,
        email: u.email,
        rating: u.rating || 1000,
      }));

    if (!VALID.includes(players.length)) {
      return toast(
        'Invalid Group Size',
        `Select ${VALID.join(', ')} players (selected ${players.length})`
      );
    }

    const bracket = buildBracketSkeleton(players);
    const ref = await addDoc(collection(db, 'tournament-rooms'), {
      name,
      creator: currentUser.uid,
      createdAt: nowISO(),
      participants: players,
      bracket,
    });

    toast('Success', 'Tournament created', 'success');
    onClose?.();
    navigate(`/tournaments/${ref.id}`);
  };

  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const count = picked.length;
  const invalid = !VALID.includes(count);

  return (
    <div className='max-w-sm mx-auto bg-white shadow-lg p-6 text-gray-900'>
      <div className='flex justify-around mb-4'>
        {['room', 'tournament'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded ${
              mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {m === 'room' ? 'Room' : 'Tournament'}
          </button>
        ))}
      </div>

      {mode === 'room' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRoom();
          }}
        >
          <label className='block text-sm font-bold mb-2'>Room Name</label>
          <input
            value={roomName}
            onChange={(e) => setRoom(e.target.value)}
            className='border w-full px-2 py-1 mb-4 rounded'
          />
          <button className='w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded'>
            Create Room
          </button>
        </form>
      )}

      {mode === 'tournament' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTournament();
          }}
        >
          <label className='block text-sm font-bold mb-1'>
            Tournament Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='border w-full px-2 py-1 mb-4 rounded'
          />

          <p className='text-sm font-bold mb-1'>
            Select Players ({count}/{VALID.join(', ')})
          </p>
          <div className='max-h-48 overflow-y-auto border rounded p-2 mb-4'>
            {allUsers.map((u) => (
              <label
                key={u.id}
                className='flex items-center text-sm mb-1 gap-1'
              >
                <input
                  type='checkbox'
                  disabled={u.id === currentUser.uid}
                  checked={picked.includes(u.id)}
                  onChange={() => toggle(u.id)}
                />
                {u.name || u.email}
                {u.id === currentUser.uid && (
                  <span className='text-xs'>(you)</span>
                )}
              </label>
            ))}
          </div>

          {invalid && (
            <p className='text-red-600 text-sm mb-2'>
              Select exactly {VALID.join(', ')} players
            </p>
          )}

          <button
            disabled={invalid}
            className={`w-full py-2 rounded text-white ${
              invalid ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            Create Tournament
          </button>
        </form>
      )}
    </div>
  );
}
