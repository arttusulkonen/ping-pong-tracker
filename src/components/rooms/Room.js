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
import { useAuthState } from 'react-firebase-hooks/auth';
import { Store } from 'react-notifications-component';
import { useParams } from 'react-router-dom';
import { auth, db } from '../../firebase';
import MatchForm from '../MatchForm';
import PlayerList from '../PlayerList';
import LastMatches from '../matches/LastMatches';

const Room = () => {
  const { roomId } = useParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [role, setRole] = useState('viewer');
  const [memberEmail, setMemberEmail] = useState('');
  const [room, setRoom] = useState({ name: 'Loading...' });
  const [user] = useAuthState(auth);
  const [updateMatches, setUpdateMatches] = useState(false);

  const handleInvite = async () => {
    const usersCollection = collection(db, 'users');

    const userSnapshot = await getDocs(
      query(usersCollection, where('email', '==', memberEmail))
    );
    const user = userSnapshot.docs[0];

    if (user) {
      const userData = user.data();

      const isAlreadyMember = room.members.some(
        (member) => member.userId === user.id
      );

      if (isAlreadyMember) {
        Store.addNotification({
          title: 'User is already a member',
          message: 'User is already a member of this room.',
          type: 'warning',
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
      Store.addNotification({
        title: 'User Invited',
        message: 'User has been invited to the room.',
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
    } else {
      Store.addNotification({
        title: 'User Not Found',
        message: 'User with this email does not exist.',
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
  };

  const updatePlayerList = async () => {
    const roomDoc = await getDoc(doc(db, 'rooms', roomId));

    if (roomDoc.exists()) {
      const roomData = roomDoc.data();
      const playerPromises = roomData.members.map(async (member) => {
        const userDoc = await getDoc(doc(db, 'users', member.userId));

        return {
          userId: userDoc.id,
          ...userDoc.data(),
          rating: member.rating,
          wins: member.wins,
          losses: member.losses,
        };
      });
      const playerList = await Promise.all(playerPromises);
      setMembers(playerList);
    }
  };

  const refreshMatches = () => {
    setUpdateMatches((prev) => !prev);
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

  const handleJoinRoom = async () => {
    if (!auth.currentUser) {
      Store.addNotification({
        title: 'Not Logged In',
        message: 'You need to be logged in to join the room.',
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

    const userDoc = doc(db, 'users', auth.currentUser.uid);
    const userDocSnap = await getDoc(userDoc);
    const userData = userDocSnap.data();
    const updatedMembers = [
      ...members,
      {
        userId: auth.currentUser.uid,
        name: userData.name,
        email: userData.email,
        rating: 1000,
        role: 'viewer',
      },
    ];
    await updateDoc(doc(db, 'rooms', roomId), { members: updatedMembers });
    await updateDoc(userDoc, { rooms: arrayUnion(roomId) });
    setMembers(updatedMembers);
    Store.addNotification({
      title: 'Joined Room',
      message: 'You have successfully joined the room.',
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
  };

  const handleLeaveRoom = async () => {
    const updatedMembers = members.filter(
      (member) => member.userId !== auth.currentUser.uid
    );
    await updateDoc(doc(db, 'rooms', roomId), { members: updatedMembers });
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      rooms: arrayUnion(roomId),
    });
    setMembers(updatedMembers);
    Store.addNotification({
      title: 'Left Room',
      message: 'You have successfully left the room.',
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
  };

  return (
    <div className='flex flex-col'>
      <h2 className='text-2xl font-outfit font-bold mb-4'>{room.name}</h2>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='md:col-span-2'>
          <PlayerList
            players={members}
            loading={loading}
            userRole={userRole}
            roomId={roomId}
          />
        </div>
        <div className='space-y-4'>
          {(userRole === 'admin' || userRole === 'editor') && (
            <>
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
            </>
          )}
          {!loading &&
            auth.currentUser &&
            !members.some(
              (member) => member.userId === auth.currentUser.uid
            ) && (
              <button
                onClick={handleJoinRoom}
                className='w-full font-sports uppercase bg-blue-500 text-white border-t-1 border-l-1 border-b-4 border-r-4 border-black px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
              >
                Join Room
              </button>
            )}
          {!loading &&
            auth.currentUser &&
            members.some(
              (member) => member.userId === auth.currentUser.uid
            ) && (
              <button
                onClick={handleLeaveRoom}
                className='w-full font-sports uppercase bg-red-500 text-white border-t-1 border-l-1 border-b-4 border-r-4 border-black px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
              >
                Leave Room
              </button>
            )}
        </div>
      </div>

      {user && (
        <MatchForm
          roomId={roomId}
          updatePlayerList={updatePlayerList}
          playersList={members}
          onMatchAdded={refreshMatches}
        />
      )}

      {user && <LastMatches roomId={roomId} updateMatches={updateMatches} />}
    </div>
  );
};

export default Room;
