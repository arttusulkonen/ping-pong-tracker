import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
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
  const [room, setRoom] = useState({ name: 'Loading...' });
  const [user] = useAuthState(auth);
  const [updateMatches, setUpdateMatches] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const dropdownRef = useRef(null);

  // New state to check if the season is finished:
  const [seasonEnded, setSeasonEnded] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCollection = await getDocs(collection(db, 'users'));
      const allUsers = usersCollection.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filteredUsers = allUsers
        .filter((user) => !members.some((member) => member.userId === user.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      setUsersList(filteredUsers);
    };
    fetchUsers();
  }, [members]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      Store.addNotification({
        title: 'No User Selected',
        message: 'Please select at least one user to invite.',
        type: 'warning',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000, onScreen: true },
      });
      return;
    }

    const updatedMembers = [...room.members];

    for (const userId of selectedUsers) {
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const isAlreadyMember = updatedMembers.some(
          (member) => member.userId === userId
        );
        if (!isAlreadyMember) {
          updatedMembers.push({
            userId: userId,
            name: userData.name,
            email: userData.email,
            rating: 1000,
            role,
          });

          await updateDoc(doc(db, 'users', userId), {
            rooms: arrayUnion(roomId),
          });
        }
      }
    }

    await updateDoc(doc(db, 'rooms', roomId), { members: updatedMembers });
    setRoom({ ...room, members: updatedMembers });
    setMembers(updatedMembers);
    setSelectedUsers([]);
    setIsDropdownOpen(false);

    Store.addNotification({
      title: 'Users Invited',
      message: 'Selected users have been invited to the room.',
      type: 'success',
      insert: 'top',
      container: 'top-right',
      animationIn: ['animate__animated', 'animate__fadeIn'],
      animationOut: ['animate__animated', 'animate__fadeOut'],
      dismiss: { duration: 3000, onScreen: true },
    });
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  const updatePlayerList = async () => {
    const roomDoc = await getDoc(doc(db, 'rooms', roomId));
    if (roomDoc.exists()) {
      const roomData = roomDoc.data();
      const playerPromises = roomData.members.map(async (member) => {
        const userDocSnap = await getDoc(doc(db, 'users', member.userId));
        const userData = userDocSnap.data();
        return {
          userId: userDocSnap.id,
          ...userData,
          rating: member.rating,
          wins: member.wins,
          losses: member.losses,
          totalRating: userData.rating,
          maxRating: userData.maxRating || userData.rating,
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
      const roomDocSnap = await getDoc(doc(db, 'rooms', roomId));
      if (roomDocSnap.exists()) {
        const data = roomDocSnap.data();
        setRoom(data);
        setMembers(data.members || []);

        // Check if the season is finished (e.g., seasonHistory has entries)
        if (data.seasonHistory && data.seasonHistory.length > 0) {
          setSeasonEnded(true);
        } else {
          setSeasonEnded(false);
        }

        const currentUser = auth.currentUser;

        const usersCollection = await getDocs(collection(db, 'users'));
        const allUsers = usersCollection.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const membersWithTotalRating = data.members.map((member) => {
          const foundUser = allUsers.find((usr) => usr.id === member.userId);
          return {
            ...member,
            totalRating: foundUser ? foundUser.rating : 0,
            maxRating: foundUser ? foundUser.maxRating || foundUser.rating : 0,
          };
        });
        setMembers(membersWithTotalRating);

        if (currentUser) {
          if (data.creator === currentUser.uid) {
            setUserRole('admin');
          } else {
            const member = data.members.find(
              (m) => m.userId === currentUser.uid
            );
            if (member) {
              setUserRole(member.role);
            }
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
        dismiss: { duration: 3000, onScreen: true },
      });
      return;
    }

    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
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
    await updateDoc(userDocRef, { rooms: arrayUnion(roomId) });
    setMembers(updatedMembers);

    Store.addNotification({
      title: 'Joined Room',
      message: 'You have successfully joined the room.',
      type: 'success',
      insert: 'top',
      container: 'top-right',
      animationIn: ['animate__animated', 'animate__fadeIn'],
      animationOut: ['animate__animated', 'animate__fadeOut'],
      dismiss: { duration: 3000, onScreen: true },
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
      dismiss: { duration: 3000, onScreen: true },
    });
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <div className='flex flex-col'>
      <h2 className='text-2xl font-outfit font-bold mb-4'>{room.name}</h2>
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='md:col-span-2'>
          <PlayerList
            currentUserId={auth.currentUser ? auth.currentUser.uid : ''}
            players={members}
            loading={loading}
            userRole={userRole}
            roomId={roomId}
          />
        </div>
        <div className='space-y-4 relative'>
          {(userRole === 'admin' || userRole === 'editor') && (
            <>
              <button
                onClick={toggleDropdown}
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md flex justify-between items-center'
              >
                {isDropdownOpen ? 'Hide Users' : 'Select Users'}{' '}
                {isDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
              </button>

              {isDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className='space-y-2 mt-2 border rounded-md p-4 absolute bg-white z-20 w-full shadow-lg overflow-auto'
                >
                  {usersList.map((user) => (
                    <div
                      key={user.id}
                      className='flex items-center text-black py-2 border-b border-gray-200 last:border-0'
                    >
                      <input
                        type='checkbox'
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className='form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out mr-3'
                      />
                      <span className='text-sm font-medium'>{user.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
              >
                <option value='viewer'>Player</option>
                <option value='editor'>Editor</option>
              </select>

              <button
                onClick={handleInvite}
                className='w-full bg-blue-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-600 transition-colors duration-200 border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4'
              >
                Invite Selected Users
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
                className='w-full bg-blue-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-600 transition-colors duration-200 border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4'
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
                className='w-full bg-red-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-600 transition-colors duration-200 border-b-4 border-r-4 border-black active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4'
              >
                Leave Room
              </button>
            )}
        </div>
      </div>

      {/* Show MatchForm only if season is not ended */}
      {(userRole === 'admin' ||
        userRole === 'editor' ||
        userRole === 'viewer') &&
        !seasonEnded && (
          <MatchForm
            roomId={roomId}
            updatePlayerList={updatePlayerList}
            playersList={members}
            onMatchAdded={refreshMatches}
          />
        )}

      {/* Show this notice if the season is ended */}
      {seasonEnded && (
        <div className='bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mt-4'>
          <p className='font-bold mb-2'>Season Finished</p>
          <p>
            The season in this room is finished. If you want to start a new
            season, please create a new room. You can check the season's
            statistics in the Final Table above.
          </p>
        </div>
      )}

      {/* Show the last matches list regardless of season status */}
      {user && <LastMatches roomId={roomId} updateMatches={updateMatches} />}
    </div>
  );
};

export default Room;
