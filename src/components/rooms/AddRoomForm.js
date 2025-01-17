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
import { Store } from 'react-notifications-component';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';

const AddRoomForm = ({ currentUser, onClose }) => {
  const [roomName, setRoomName] = useState('');
  const navigate = useNavigate();

  // Function to format date as "dd.mm.yyyy"
  const getCurrentFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Store.addNotification({
        title: 'Room name required',
        message: 'Please enter a name for the room.',
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

    // Get current user. We need this to assign the room to the user as a creator
    const user = currentUser;

    if (!user) {
      Store.addNotification({
        title: 'Login required',
        message: 'You must be logged in to create a room.',
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

    if (user) {
      // Generate the current date in "dd.mm.yyyy" format
      const roomCreated = getCurrentFormattedDate();

      // Create room object with roomCreated
      const roomData = {
        name: roomName,
        creator: user.uid,
        players: [],
        matches: [],
        roomCreated, // Add the roomCreated field
      };

      try {
        // Add room to database
        const roomRef = await addDoc(collection(db, 'rooms'), roomData);

        // Get current user data
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

        // Adding current user to the list of members in the room
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

        Store.addNotification({
          title: 'Room created',
          message: 'Room has been created successfully.',
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
        navigate(`/rooms/${roomRef.id}`);
      } catch (error) {
        console.error('Error adding document: ', error);
        Store.addNotification({
          title: 'Error creating room',
          message: 'An error occurred while creating the room.',
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
    } else {
      Store.addNotification({
        title: 'Login required',
        message: 'You must be logged in to create a room.',
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
    }
  };

  return (
    <div className='mx-auto block max-w-sm bg-surface-dark p-6 shadow-4'>
      <form
        className='w-full max-w-sm mx-auto bg-white p-8'
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