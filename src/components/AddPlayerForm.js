// Button and form to add a new player to the database

import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { db } from '../firebase';

const AddPlayerForm = ({ onClose }) => {
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name) {
      return;
    }

    try {
      await addDoc(collection(db, 'players'), {
        name: name,
        rating: 1000,
      });
      setName('');
      onClose();
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <div
  class="mx-auto block max-w-sm rounded-lg bg-surface-dark p-6 shadow-4">
    <form onSubmit={handleSubmit}>
        <input
          type='text'
          className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2'
          value={name}
          aria-describedby="Player name"
          placeholder="Player name"
          onChange={(e) => setName(e.target.value)}
        />
      <button
        type='submit'
        className='bg-blue-500 text-white px-4 py-2 rounded mt-4'
      >
        Add Player
      </button>
    </form>
    </div>
  );
};

export default AddPlayerForm;
