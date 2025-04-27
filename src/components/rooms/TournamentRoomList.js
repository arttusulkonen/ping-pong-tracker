// File: src/components/rooms/TournamentRoomList.js

import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';

const TournamentRoomList = ({ currentUserId }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Similar logic for date parsing
  const parseCreatedAt = (dateString) => {
    if (typeof dateString !== 'string') {
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

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'tournament-rooms'));
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setTournaments(data);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchTournaments();
    } else {
      setLoading(false);
    }
  }, [currentUserId]);

  // Filter to show only tournaments the user is in or created
  const filteredTournaments = useMemo(() => {
    if (!currentUserId) return [];

    return tournaments
      .filter((t) => {
        const isCreator = t.creator === currentUserId;
        const inParticipants = Array.isArray(t.participants)
          ? t.participants.some((p) => p.userId === currentUserId)
          : false;

        return isCreator || inParticipants;
      })
      .map((t) => ({
        ...t,
        createdDate: parseCreatedAt(t.createdAt),
      }))
      .sort((a, b) => b.createdDate - a.createdDate);
  }, [tournaments, currentUserId]);

  return (
    <div className="flex flex-col mt-6">
      <h2 className="text-2xl font-outfit font-bold mb-4 text-white">Tournaments</h2>
      <div className="-m-1.5 overflow-x-auto">
        <div className="p-1.5 min-w-full inline-block align-middle">
          <div className="overflow-hidden shadow-md">
            <table className="min-w-full bg-white shadow rounded-lg">
              <thead>
                <tr>
                  <th className="py-3 px-6 bg-gray-200 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Tournament Name
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
                ) : filteredTournaments.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-4 text-sm text-gray-700">
                      No tournaments available.
                    </td>
                  </tr>
                ) : (
                  filteredTournaments.map((t) => (
                    <tr key={t.id}>
                      <td className="py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap">
                        <Link
                          to={`/tournaments/${t.id}`}
                          className="underline hover:text-gray-700"
                        >
                          {t.name}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 whitespace-nowrap">
                        {t.createdDate.getTime() !== new Date(0).getTime()
                          ? t.createdDate.toLocaleDateString('en-GB')
                          : 'N/A'}
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

export default TournamentRoomList;