import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';

const AddRoomForm = ({ currentUser, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!roomName) {
      alert('Room name is required');
      return;
    }

    // get current user. we need this to assign the room to the user as a creator
    const user = currentUser;

    if (!user) {
      alert('You must be logged in to create a room');
      return;
    }

    if (user) {
      // Create room object
      const roomData = {
        name: roomName,
        creator: user.uid,
        players: [],
        matches: [],
      };

      try {
        // Add room to database
        const roomRef = await addDoc(collection(db, 'rooms'), roomData);

        // get current user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;

        // Create member object
        const memberData = {
          userId: user.uid,
          email: userData.email,
          name: userData.name,
          role: 'admin',
          rating: 1000,
        };

        // adding current user to the list of players in the room
        await updateDoc(doc(db, 'rooms', roomRef.id), {
          members: arrayUnion(memberData),
        });

        // Update user data with new room
        if (userDoc.exists()) {
          await updateDoc(doc(db, 'users', user.uid), {
            rooms: arrayUnion(roomRef.id),
          });
        } else {
          await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            name: user.displayName,
            rooms: [roomRef.id],
            rating: 1000,
          });
        }

        alert('Room created successfully!');
        navigate(`/rooms/${roomRef.id}`);
      } catch (error) {
        console.error('Error adding document: ', error);
        alert('An error occurred while creating the room');
      }
    } else {
      alert('You must be logged in to create a room');
    }
  };

  return (
    <div className='mx-auto block max-w-sm rounded-lg bg-surface-dark p-6 shadow-4'>
      <form
        className='w-full max-w-sm mx-auto bg-white p-8 rounded-lg '
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateRoom();
        }}
      >
        <div className='mb-4'>
          <label
            className='block text-sm font-bold mb-2 text-gray-700'
            htmlFor='roomName'
          >
            Room name
          </label>
          <input
            className='shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline'
            id='roomName'
            type='text'
            placeholder='Enter room name'
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
        </div>

        <button
          type='submit'
          className='bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 mt-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none'
          aria-label='Create room'
        >
          Create room
        </button>
      </form>
    </div>
  );
};

export default AddRoomForm;
