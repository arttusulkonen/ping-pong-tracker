// Button and form to add a new player to the database

import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { db } from '../firebase';

const AddPlayerForm = ({ onClose, updatePlayerList }) => {
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
      updatePlayerList();
    } catch (error) {
      console.error('Error adding document: ', error);
    }
  };

  return (
    <div className='mx-auto block max-w-sm bg-surface-dark p-6 shadow-4'>
      <form onSubmit={handleSubmit}>
        <input
          type='text'
          className='w-full bg-surface-light text-black px-4 py-2 rounded border-black border-2'
          value={name}
          aria-describedby='Player name'
          placeholder='Player name'
          onChange={(e) => setName(e.target.value)}
        />
        <div className='col-start-1 col-span-full font-medium tracking-wider text-lg md:text-2xl flex justify-center mt-8'>
          <button
            type='submit'
            className='font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black mx-4 px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
            aria-label='Add Player'
          >
            Add Player
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPlayerForm;
