import React from 'react';
import { Link } from 'react-router-dom';

const RoomList = ({ rooms, loading, currentUserId }) => {
  const filteredRooms = rooms.filter((room) => {
    if (room.id === 'lgNAJ8AaEUytVyLxx0Wv') {
      const isMember = room.members.some(
        (member) => member.userId === currentUserId
      );
      return isMember;
    }

    return true;
  });

  return (
    <div className='flex flex-col'>
      <h2 className='text-2xl font-outfit font-bold mb-4 text-white'>Rooms</h2>
      <div className='-m-1.5 overflow-x-auto'>
        <div className='p-1.5 min-w-full inline-block align-middle'>
          <div className='overflow-hidden shadow-md'>
            <table className='min-w-full bg-white shadow rounded-lg'>
              <thead>
                <tr>
                  <th className='py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider'>
                    Room Name
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className='py-4 px-6 text-sm text-gray-900 animate-pulse'>
                        <div className='h-4 bg-gray-300 rounded w-3/4'></div>
                      </td>
                    </tr>
                  ))
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1}
                      className='text-center py-4 text-sm text-gray-700'
                    >
                      No rooms available.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id}>
                      <td className='py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap'>
                        <Link
                          to={`/rooms/${room.id}`}
                          className='underline hover:text-gray-700'
                        >
                          {room.name}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomList;
