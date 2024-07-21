import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import AddPlayerForm from './AddPlayerForm';
import Modal from './Modal';

const PlayerList = ({handleOpenModal, handleCloseModal, showModal}) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const updatePlayerList = async () => {
    const querySnapshot = await getDocs(collection(db, 'players'));
    let playersData = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    playersData.sort((a, b) => b.rating - a.rating);
    setPlayers(playersData);
    setLoading(false);
  }

  useEffect(() => {
    updatePlayerList();
  }, []);

  return (
    <div className='flex flex-col'>
      {loading ? (
        <div className='flex justify-center items-center h-64'>
          <svg
            className='animate-spin h-10 w-10 text-white'
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
          >
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            ></circle>
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z'
            ></path>
          </svg>
        </div>
      ) : (
        <div className='-m-1.5 overflow-x-auto'>
          <div className='p-1.5 min-w-full inline-block align-middle'>
            <div className='overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead>
                  <tr>
                    <th
                      scope='col'
                      className='px-6 py-3 text-start text-xs font-medium text-white uppercase'
                    >
                      Name
                    </th>
                    <th
                      scope='col'
                      className='px-6 py-3 text-start text-xs font-medium text-white uppercase'
                    >
                      Rank
                    </th>
                    <th
                      scope='col'
                      className='px-6 py-3 text-end text-xs font-medium text-white uppercase'
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200'>
                  {players.map((player) => (
                    <tr key={player.id}>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-white'>
                        {player.name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-white'>
                        {player.rating}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-end text-sm font-medium'>
                        <button className='inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border bg-red-600 py-2 px-4 text-white hover:bg-red-800 disabled:opacity-50 disabled:pointer-events-none'>
                          <svg
                            xmlns='http://www.w3.org/2000/svg'
                            className='h-5 w-5'
                            viewBox='0 0 20 20'
                            fill='currentColor'
                          >
                            <path
                              fillRule='evenodd'
                              d='M6 2a1 1 0 00-.894.553L4 4H2a1 1 0 100 2h1.46l.52 9.25a2 2 0 001.995 1.75h8.05a2 2 0 001.995-1.75L16.54 6H18a1 1 0 100-2h-2l-1.106-1.447A1 1 0 0014 2H6zM6.2 4l.8 1h6l.8-1H6.2zM5.46 6h9.08l-.52 9.25a1 1 0 01-.998.75H6.978a1 1 0 01-.998-.75L5.46 6z'
                              clipRule='evenodd'
                            />
                          </svg>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <button
          onClick={handleOpenModal}
          className='bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:pointer-events-none'
          aria-label='Add Player'
        >
          Add Player
        </button>

        <Modal show={showModal} onClose={handleCloseModal}>
          <AddPlayerForm onClose={handleCloseModal} updatePlayerList={updatePlayerList}/>
        </Modal>
        </div>
      )}
    </div>
  );
};

export default PlayerList;
