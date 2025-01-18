import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

const RoomList = ({ rooms, loading, currentUserId }) => {

  const parseRoomCreated = (dateString) => {
    if (typeof dateString !== 'string') {
      console.warn(`Invalid date format: ${dateString}`);
      return new Date(0); 
    }

    try {
      const [day, month, year] = dateString.split('.').map(Number);
      return new Date(year, month - 1, day);
    } catch (error) {
      console.error("Error parsing date:", dateString, error);
      return new Date(0);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms
      .filter((room) =>
        room.members && room.members.some((member) => member.userId === currentUserId)
      )
      .map((room) => ({
        ...room,
        createdAt: parseRoomCreated(room.roomCreated),
      }))
      .sort((a, b) => b.createdAt - a.createdAt); 
  }, [rooms, currentUserId]);

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-outfit font-bold mb-4 text-white">Rooms</h2>
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="overflow-hidden shadow-md">
            <table className="min-w-full bg-white shadow rounded-lg">
              <thead>
                <tr>
                  <th className="py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Room Name
                  </th>
                  <th className="py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td className="py-4 px-6 text-sm text-gray-900 animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 animate-pulse">
                        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredRooms.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-center py-4 text-sm text-gray-700"
                    >
                      No rooms available.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => (
                    <tr key={room.id}>
                      <td className="py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap">
                        <Link
                          to={`/rooms/${room.id}`}
                          className="underline hover:text-gray-700"
                        >
                          {room.name}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 whitespace-nowrap">
                        {room.createdAt.getTime() !== new Date(0).getTime()
                          ? room.createdAt.toLocaleDateString('ru-RU')
                          : "N/A"}
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