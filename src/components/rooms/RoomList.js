import React from 'react';
import { Link } from 'react-router-dom';

const RoomList = ({ rooms, loading }) => {
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
        <div>
      <h2 className="text-2xl font-bold mb-4">Rooms</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <Link to={`/rooms/${room.id}`} className="text-blue-500 hover:underline">
              {room.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
      )}
    </div>
  );
};

export default RoomList;
