import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { auth, db } from '../../firebase';
import MatchForm from '../MatchForm';
import PlayerList from '../PlayerList';

const Room = () => {
  const { roomId } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [role, setRole] = useState('viewer');
  const [memberEmail, setMemberEmail] = useState('');
  const [room, setRoom] = useState({ name: 'Loading...' }); // Default room name

  const handleInvite = async () => {
    const usersCollection = collection(db, 'users');

    const userSnapshot = await getDocs(
      query(usersCollection, where('email', '==', memberEmail))
    );
    const user = userSnapshot.docs[0];

    if (user) {
      const userData = user.data();
      const updatedMembers = [
        ...room.members,
        {
          userId: user.id,
          name: userData.name,
          email: userData.email,
          rating: 1000, 
          role,
        },
      ];
      await updateDoc(doc(db, 'rooms', roomId), { members: updatedMembers });
      await updateDoc(doc(db, 'users', user.id), { rooms: arrayUnion(roomId) });
      setRoom({ ...room, members: updatedMembers });
      setMembers(updatedMembers); 
      alert('User invited successfully!');
    } else {
      alert('User not found.');
    }
  };

  const updatePlayerList = async () => {
    const roomDoc = await getDoc(doc(db, 'rooms', roomId));
    console.log('updatePlayerList -> roomDoc', roomDoc);
    if (roomDoc.exists()) {
      const roomData = roomDoc.data();
      const playerPromises = roomData.members.map(async (member) => {
        const userDoc = await getDoc(doc(db, 'users', member.userId));
        return { userId: userDoc.id, ...userDoc.data(), rating: member.rating };
      });
      const playerList = await Promise.all(playerPromises);
      setMembers(playerList);
    }
  };

  useEffect(() => {
    const fetchRoomData = async () => {
      const roomDoc = await getDoc(doc(db, 'rooms', roomId));
      if (roomDoc.exists()) {
        const data = roomDoc.data();
        setRoom(data);
        setMembers(data.members || []);
        const currentUser = auth.currentUser;
        if (currentUser) {
          if (data.creator === currentUser.uid) {
            setUserRole('admin');
          }
        }
        setLoading(false);
      } else {
        console.error('No such room!');
      }
    };

    fetchRoomData();
  }, [roomId]);

  return (
    <div className='flex flex-col'>
      <h2 className='text-2xl font-bold mb-4'>{room.name}</h2>
      <div className='flex flex-col md:flex-row md:space-x-4'>
        <div
          className={`md:w-${
            userRole === 'admin' || userRole === 'editor' ? '3/5' : 'full'
          } w-full`}
        >
          <PlayerList
            players={members}
            loading={loading}
            userRole={userRole}
            roomId={roomId}
          />
        </div>
        {(userRole === 'admin' || userRole === 'editor') && (
          <div className='md:w-2/5 w-full mt-4 md:mt-0'>
            <div className='space-y-4'>
              <input
                type='email'
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder='User Email'
                className='w-full font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black px-4 py-2 selectable'
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className='w-full font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black px-4 py-2 selectable'
              >
                <option value='viewer'>Player</option>
                <option value='editor'>Editor</option>
              </select>
              <button
                onClick={handleInvite}
                className='w-full font-sports uppercase bg-blue-500 text-white border-t-1 border-l-1 border-b-4 border-r-4 border-black px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
              >
                Invite User
              </button>
            </div>
          </div>
        )}
      </div>
      {(userRole === 'admin' || userRole === 'editor') && (
        <MatchForm
          roomId={roomId}
          updatePlayerList={updatePlayerList}
          playersList={members}
        />
      )}
    </div>
  );
};

export default Room;
