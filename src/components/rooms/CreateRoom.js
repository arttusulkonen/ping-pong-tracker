import React from 'react';

import Modal from '../Modal';
import AddRoomForm from './AddRoomForm';

const CreateRoom = ({ currentUser, handleOpenModal, handleCloseModal, showModal }) => {
  return (
    <div>
      <div className='col-start-1 col-span-full font-medium tracking-wider text-lg md:text-2xl flex justify-center mt-8'>
        <button
          onClick={handleOpenModal}
          className='font-sports uppercase bg-white text-black border-t-1 border-l-1 border-b-4 border-r-4 border-black mx-4 px-4 py-2 active:border-b-0 active:border-r-0 active:border-t-4 active:border-l-4 selectable'
          aria-label='Add Player'
        >
          Create Room for your team
        </button>
      </div>
      <Modal show={showModal} onClose={handleCloseModal}>
        <AddRoomForm currentUser={currentUser} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default CreateRoom;
