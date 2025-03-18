import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FaSpinner, FaTrash } from 'react-icons/fa';
import { Store } from 'react-notifications-component';
import { db } from '../firebase';

const MatchForm = ({ updatePlayerList, roomId, playersList, onMatchAdded }) => {
  const [players, setPlayers] = useState([]);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  // В каждом элементе массива matches 4 поля: score1, score2, side1, side2
  const [matches, setMatches] = useState([
    { score1: '', score2: '', side1: '', side2: '' },
  ]);
  const [loading, setLoading] = useState(false);

  // Полная валидация: оба игрока выбраны, каждое поле score заполнено,
  // а также оба поля side1/side2 не пустые
  const isFormValid =
    Boolean(player1 && player2) &&
    matches.every(
      (m) => m.score1 && m.score2 && m.side1 !== '' && m.side2 !== ''
    );

  useEffect(() => {
    setPlayers(playersList);
  }, [playersList]);

  // Форматирование даты под финский вариант
  const getFinnishFormattedDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}.${minutes}.${seconds}`;
  };

  // Функция вычисления ELO
  const calculateElo = (playerRating, opponentRating, score) => {
    const kFactor = 32;
    const expectedScore =
      1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
    const newRating = playerRating + kFactor * (score - expectedScore);
    return Math.round(newRating);
  };

  // Получаем ранг (звание) в зависимости от рейтинга
  const getRank = (maxRating) => {
    if (maxRating < 1001) return 'Ping Pong Padawan';
    if (maxRating < 1100) return 'Table Tennis Trainee';
    if (maxRating < 1200) return 'Racket Rookie';
    if (maxRating < 1400) return 'Paddle Prodigy';
    if (maxRating < 1800) return 'Spin Sensei';
    if (maxRating < 2000) return 'Smash Samurai';
    return 'Ping Pong Paladin';
  };

  // Обновляем статистику игрока в коллекции users
  const updatePlayerStats = async (playerId, newRating, wins, losses) => {
    if (!playerId) return;
    const playerRef = doc(db, 'users', playerId);
    try {
      const playerSnapshot = await getDoc(playerRef);
      if (!playerSnapshot.exists()) return;
      const playerData = playerSnapshot.data();
      const adjustedRating = Math.round(newRating);
      const newMaxRating = Math.max(
        playerData.maxRating || adjustedRating,
        adjustedRating
      );

      await updateDoc(playerRef, {
        rating: adjustedRating,
        maxRating: newMaxRating,
        wins: wins,
        losses: losses,
        totalMatches: wins + losses,
        rank: getRank(newMaxRating),
      });
    } catch (error) {
      console.error(`Error updating player ${playerId}:`, error);
    }
  };

  // Обновляем статистику игрока в конкретной комнате (room)
  const updateRoomMemberStats = async (
    roomId,
    userId,
    newRoomRating,
    newWins,
    newLosses
  ) => {
    if (!userId) return;
    const roomRef = doc(db, 'rooms', roomId);
    try {
      const roomDoc = await getDoc(roomRef);
      if (!roomDoc.exists()) return;
      const roomData = roomDoc.data();
      const timestamp = getFinnishFormattedDate();

      const updatedMembers = (roomData.members || []).map((member) => {
        if (member.userId === userId) {
          return {
            ...member,
            date: timestamp,
            rating: newRoomRating,
            wins: newWins,
            losses: newLosses,
          };
        }
        return member;
      });

      await updateDoc(roomRef, { members: updatedMembers });
    } catch (error) {
      console.error(`Error updating room member ${userId}:`, error);
    }
  };

  // Подтягиваем список игроков из Firestore
  const fetchPlayers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const playerList = [];
    querySnapshot.forEach((docSnap) => {
      playerList.push({ id: docSnap.id, ...docSnap.data() });
    });
    setPlayers(playerList);
  };

  // Сабмит формы: добавление матчей
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!isFormValid) {
      Store.addNotification({
        title: 'Error',
        message:
          'Please fill all required fields (scores and side selections) before submitting.',
        type: 'danger',
        insert: 'top',
        container: 'top-right',
        animationIn: ['animate__animated', 'animate__fadeIn'],
        animationOut: ['animate__animated', 'animate__fadeOut'],
        dismiss: { duration: 3000, onScreen: true },
      });
      setLoading(false);
      return;
    }

    try {
      for (const match of matches) {
        const { score1, score2, side1, side2 } = match;
        const score1Value = parseInt(score1);
        const score2Value = parseInt(score2);
        const timestamp = getFinnishFormattedDate();

        // Определяем победителя
        const winner = score1Value > score2Value ? player1 : player2;

        // Проверяем документы в playersList
        const player1Doc = players.find((p) => p.name === player1);
        const player2Doc = players.find((p) => p.name === player2);

        if (!player1Doc || !player2Doc) {
          Store.addNotification({
            title: 'Error',
            message: 'Please select valid players',
            type: 'danger',
            insert: 'top',
            container: 'top-right',
            animationIn: ['animate__animated', 'animate__fadeIn'],
            animationOut: ['animate__animated', 'animate__fadeOut'],
            dismiss: { duration: 3000, onScreen: true },
          });
          return;
        }

        // Достаем данные игроков
        const player1Ref = doc(db, 'users', player1Doc.userId);
        const player2Ref = doc(db, 'users', player2Doc.userId);
        const [player1Snapshot, player2Snapshot] = await Promise.all([
          getDoc(player1Ref),
          getDoc(player2Ref),
        ]);

        const player1Data = player1Snapshot.data() || {};
        const player2Data = player2Snapshot.data() || {};

        // Текущий общий рейтинг
        const player1OverallRating = player1Data.rating || 1000;
        const player2OverallRating = player2Data.rating || 1000;

        // Текущее число побед/поражений
        const player1OverallWins = player1Data.wins || 0;
        const player1OverallLosses = player1Data.losses || 0;
        const player2OverallWins = player2Data.wins || 0;
        const player2OverallLosses = player2Data.losses || 0;

        // Вычисляем ELO
        const player1Score = winner === player1 ? 1 : 0;
        const player2Score = winner === player2 ? 1 : 0;

        const newPlayer1Rating = calculateElo(
          player1OverallRating,
          player2OverallRating,
          player1Score
        );
        const newPlayer2Rating = calculateElo(
          player2OverallRating,
          player1OverallRating,
          player2Score
        );

        const player1EarnedPoints = newPlayer1Rating - player1OverallRating;
        const player2EarnedPoints = newPlayer2Rating - player2OverallRating;

        const newPlayer1OverallWins =
          winner === player1 ? player1OverallWins + 1 : player1OverallWins;
        const newPlayer1OverallLosses =
          winner === player1 ? player1OverallLosses : player1OverallLosses + 1;

        const newPlayer2OverallWins =
          winner === player2 ? player2OverallWins + 1 : player2OverallWins;
        const newPlayer2OverallLosses =
          winner === player2 ? player2OverallLosses : player2OverallLosses + 1;

        // Рейтинг в рамках конкретной комнаты
        const roomSnap = await getDoc(doc(db, 'rooms', roomId));
        if (!roomSnap.exists()) {
          console.error(`Room ${roomId} not found!`);
          return;
        }
        const roomData = roomSnap.data() || {};

        // Старые рейтинги в комнате
        const player1RoomData =
          (roomData.members || []).find(
            (m) => m.userId === player1Doc.userId
          ) || {};
        const player2RoomData =
          (roomData.members || []).find(
            (m) => m.userId === player2Doc.userId
          ) || {};

        const player1RoomOldRating = player1RoomData.rating ?? 1000;
        const player2RoomOldRating = player2RoomData.rating ?? 1000;

        const newRoomPlayer1Rating = player1RoomOldRating + player1EarnedPoints;
        const newRoomPlayer2Rating = player2RoomOldRating + player2EarnedPoints;

        const p1RoomAddedPoints = newRoomPlayer1Rating - player1RoomOldRating;
        const p2RoomAddedPoints = newRoomPlayer2Rating - player2RoomOldRating;

        const newPlayer1RoomWins =
          winner === player1
            ? (player1RoomData.wins || 0) + 1
            : player1RoomData.wins || 0;
        const newPlayer1RoomLosses =
          winner === player1
            ? player1RoomData.losses || 0
            : (player1RoomData.losses || 0) + 1;

        const newPlayer2RoomWins =
          winner === player2
            ? (player2RoomData.wins || 0) + 1
            : player2RoomData.wins || 0;
        const newPlayer2RoomLosses =
          winner === player2
            ? player2RoomData.losses || 0
            : (player2RoomData.losses || 0) + 1;

        // Готовим объект match для записи
        const matchData = {
          player1Id: player1Doc.userId,
          player2Id: player2Doc.userId,
          players: [player1Doc.userId, player2Doc.userId],
          player1: {
            name: player1Doc.name,
            scores: score1Value,
            oldRating: player1OverallRating,
            newRating: newPlayer1Rating,
            addedPoints: player1EarnedPoints,
            roomOldRating: player1RoomOldRating,
            roomNewRating: newRoomPlayer1Rating,
            roomAddedPoints: p1RoomAddedPoints,
            side: side1,
          },
          player2: {
            name: player2Doc.name,
            scores: score2Value,
            oldRating: player2OverallRating,
            newRating: newPlayer2Rating,
            addedPoints: player2EarnedPoints,
            roomOldRating: player2RoomOldRating,
            roomNewRating: newRoomPlayer2Rating,
            roomAddedPoints: p2RoomAddedPoints,
            side: side2,
          },
          timestamp,
          roomId,
          winner,
        };

        // Добавляем матч в Firestore
        await addDoc(collection(db, 'matches'), matchData);

        // Обновляем общую статистику
        await updatePlayerStats(
          player1Doc.userId,
          newPlayer1Rating,
          newPlayer1OverallWins,
          newPlayer1OverallLosses
        );
        await updatePlayerStats(
          player2Doc.userId,
          newPlayer2Rating,
          newPlayer2OverallWins,
          newPlayer2OverallLosses
        );

        // Обновляем статистику игроков в комнате
        await updateRoomMemberStats(
          roomId,
          player1Doc.userId,
          newRoomPlayer1Rating,
          newPlayer1RoomWins,
          newPlayer1RoomLosses
        );
        await updateRoomMemberStats(
          roomId,
          player2Doc.userId,
          newRoomPlayer2Rating,
          newPlayer2RoomWins,
          newPlayer2RoomLosses
        );
      }

      // Сброс формы
      setPlayer1('');
      setPlayer2('');
      setMatches([{ score1: '', score2: '', side1: '', side2: '' }]);

      // Обновляем список игроков и вызываем колбэк
      await fetchPlayers();
      updatePlayerList();
      onMatchAdded();
    } catch (error) {
      console.error('Error adding document:', error);
    } finally {
      setLoading(false);
    }
  };

  // Добавление очередного «под-матча» (если за раз сыграли несколько)
  const addMatch = () => {
    setMatches((prev) => [
      ...prev,
      { score1: '', score2: '', side1: '', side2: '' },
    ]);
  };

  // Удаление одного матча (если несколько)
  const removeMatch = (index) => {
    const updatedMatches = matches.filter((_, i) => i !== index);
    setMatches(updatedMatches);
  };

  // Изменение стороны (side1). Если side1 = 'left', то side2 = 'right', и наоборот
  const handleSide1Change = (e, index) => {
    const side1Value = e.target.value;
    let side2Value = matches[index].side2; // берем текущее значение
    if (side1Value === 'left') {
      side2Value = 'right';
    } else if (side1Value === 'right') {
      side2Value = 'left';
    } else {
      // Если очистили поле (выбрали ''), тогда тоже сбрасываем side2
      side2Value = '';
    }
    setMatches(
      matches.map((item, i) =>
        i === index ? { ...item, side1: side1Value, side2: side2Value } : item
      )
    );
  };

  // Аналогично, если меняют side2
  const handleSide2Change = (e, index) => {
    const side2Value = e.target.value;
    let side1Value = matches[index].side1;
    if (side2Value === 'left') {
      side1Value = 'right';
    } else if (side2Value === 'right') {
      side1Value = 'left';
    } else {
      side1Value = '';
    }
    setMatches(
      matches.map((item, i) =>
        i === index ? { ...item, side1: side1Value, side2: side2Value } : item
      )
    );
  };

  return (
    <div className='block bg-surface-dark rounded-lg'>
      <h2 className='text-2xl font-bold font-outfit text-center mb-6 mt-6'>
        Add Match
      </h2>

      <div className='bg-gray-100 shadow-md rounded-lg mt-6 p-4'>
        <h3 className='text-lg font-semibold text-gray-700 mb-2'>Info:</h3>
        <p className='text-sm text-gray-700 mb-2'>
          Please note: <strong>Left side</strong> is the side facing the office
          (not the exit). This field is mandatory and used for analytics of how
          many matches are won or lost from each side.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6 mt-4'>
        {/* Выбор игроков */}
        <div className='grid grid-cols-2 gap-4 mb-4'>
          <div>
            <label
              className='block text-sm font-semibold mb-2'
              htmlFor='player1'
            >
              Player 1
            </label>
            <select
              id='player1'
              className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
            >
              <option value=''>Select Player 1</option>
              {players
                .filter((p) => p.name !== player2)
                .map((p) => (
                  <option key={p.userId} value={p.name}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label
              className='block text-sm font-semibold mb-2'
              htmlFor='player2'
            >
              Player 2
            </label>
            <select
              id='player2'
              className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
            >
              <option value=''>Select Player 2</option>
              {players
                .filter((p) => p.name !== player1)
                .map((p) => (
                  <option key={p.userId} value={p.name}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Список матчей: score1, score2, side1, side2 */}
        {matches.map((m, index) => (
          <div
            key={index}
            className='grid grid-cols-2 gap-4 mb-4 relative border-b pb-4'
          >
            {/* Поля для Player1 */}
            <div>
              <label className='block text-sm font-semibold mb-1'>
                Player 1 Score
              </label>
              <input
                type='number'
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md mb-2'
                value={m.score1}
                onChange={(e) =>
                  setMatches(
                    matches.map((item, i) =>
                      i === index ? { ...item, score1: e.target.value } : item
                    )
                  )
                }
                placeholder={`Score #${index + 1}`}
              />
              <label className='block text-sm font-semibold mb-1'>
                Player 1 Side
              </label>
              <select
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
                value={m.side1}
                onChange={(e) => handleSide1Change(e, index)}
              >
                <option value=''>Select side</option>
                <option value='left'>Left (facing office)</option>
                <option value='right'>Right (near exit)</option>
              </select>
            </div>

            {/* Поля для Player2 */}
            <div>
              <label className='block text-sm font-semibold mb-1'>
                Player 2 Score
              </label>
              <input
                type='number'
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md mb-2'
                value={m.score2}
                onChange={(e) =>
                  setMatches(
                    matches.map((item, i) =>
                      i === index ? { ...item, score2: e.target.value } : item
                    )
                  )
                }
                placeholder={`Score #${index + 1}`}
              />
              <label className='block text-sm font-semibold mb-1'>
                Player 2 Side
              </label>
              <select
                className='w-full bg-gray-100 text-black px-4 py-2 border border-gray-300 rounded-md'
                value={m.side2}
                onChange={(e) => handleSide2Change(e, index)}
              >
                <option value=''>Select side</option>
                <option value='left'>Left (facing office)</option>
                <option value='right'>Right (near exit)</option>
              </select>
            </div>

            {/* Кнопка удаления "под-матча" */}
            {index > 0 && (
              <button
                type='button'
                onClick={() => removeMatch(index)}
                className='text-red-500 hover:text-red-700 transition-colors duration-200 ml-2 absolute top-1/2 transform -translate-y-1/2 -right-6'
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}

        {/* Кнопка добавления нового "под-матча" */}
        <button
          type='button'
          className='w-full md:w-auto bg-blue-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-blue-600 transition-colors duration-200'
          onClick={addMatch}
        >
          + Add another match
        </button>

        {/* Кнопка Submit */}
        <div className='flex justify-center mt-8'>
          <button
            type='submit'
            className='bg-green-500 text-white font-semibold py-3 px-8 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
            disabled={loading || !isFormValid}
          >
            {loading && <FaSpinner className='animate-spin mr-2' />}
            {loading ? 'Submitting...' : 'Submit Match(es)'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MatchForm;
