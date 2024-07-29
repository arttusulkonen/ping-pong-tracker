import React from 'react';
import { Link } from 'react-router-dom';

const RoomList = ({ rooms, loading }) => {
  return (
    <div className='flex flex-col'>
      <h2 className='text-2xl font-bold mb-4 text-gray-700'>Rooms</h2>
      <div className='-m-1.5 overflow-x-auto'>
        <div className='p-1.5 min-w-full inline-block align-middle'>
          <div className='overflow-hidden shadow-md'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-800'>
                <tr>
                  <th
                    scope='col'
                    className='py-3 px-6 text-left text-xs font-medium text-white uppercase tracking-wider'
                  >
                    Room Name
                  </th>
                </tr>
              </thead>
              <tbody className='bg-gray-800 divide-y divide-gray-700'>
                {loading ? (
                  <tr>
                    <td
                      colSpan={1}
                      className='text-center py-4 text-sm text-white'
                    >
                      Loading rooms...
                    </td>
                  </tr>
                ) : rooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={1}
                      className='text-center py-4 text-sm text-white'
                    >
                      No rooms available.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => (
                    <tr key={room.id}>
                      <td className='py-4 px-6 text-sm font-medium text-white whitespace-nowrap'>
                        <Link
                          to={`/rooms/${room.id}`}
                          className='underline hover:text-gray-200'
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
