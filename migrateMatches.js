const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Подключаем service account key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function parseFinnishDateString(dateStr) {
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart || !timePart) return null;

  const [dd, mm, yyyy] = datePart.split('.');
  const [HH, MM, SS] = timePart.split('.');

  return new Date(+yyyy, mm - 1, +dd, +HH, +MM, +SS);
}

function calculateElo(playerRating, opponentRating, score) {
  const kFactor = 32;
  const expectedScore = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  return Math.round(playerRating + kFactor * (score - expectedScore));
}

async function updateDatabaseWithNewData() {
  console.log('> Начинаем обновление базы данных...');

  const matchesRef = db.collection('matches');
  const roomsRef = db.collection('rooms');

  const matchesSnapshot = await matchesRef.get();
  const roomsSnapshot = await roomsRef.get();

  const allMatches = matchesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Сортируем матчи по timestamp
  allMatches.sort((a, b) => {
    const dateA = parseFinnishDateString(a.timestamp);
    const dateB = parseFinnishDateString(b.timestamp);
    return dateA - dateB;
  });

  const playerRatings = {};

  const updatedMatches = allMatches.map((match) => {
    const { player1, player2 } = match;

    if (!playerRatings[player1.name]) {
      playerRatings[player1.name] = { UpdatedTemporaryOldRating: 1000 };
    }
    if (!playerRatings[player2.name]) {
      playerRatings[player2.name] = { UpdatedTemporaryOldRating: 1000 };
    }

    const player1OldRating = playerRatings[player1.name].UpdatedTemporaryOldRating;
    const player2OldRating = playerRatings[player2.name].UpdatedTemporaryOldRating;

    const player1Score = match.winner === player1.name ? 1 : 0;
    const player2Score = match.winner === player2.name ? 1 : 0;

    const player1NewRating = calculateElo(player1OldRating, player2OldRating, player1Score);
    const player2NewRating = calculateElo(player2OldRating, player1OldRating, player2Score);

    playerRatings[player1.name].UpdatedTemporaryOldRating = player1NewRating;
    playerRatings[player2.name].UpdatedTemporaryOldRating = player2NewRating;

    // Обновляем данные матча
    return {
      id: match.id,
      player1: {
        ...player1,
        oldRating: player1OldRating,
        newRating: player1NewRating,
        addedPoints: player1NewRating - player1OldRating,
      },
      player2: {
        ...player2,
        oldRating: player2OldRating,
        newRating: player2NewRating,
        addedPoints: player2NewRating - player2OldRating,
      },
    };
  });

  for (const updatedMatch of updatedMatches) {
    const { id, player1, player2 } = updatedMatch;
    await matchesRef.doc(id).update({
      player1,
      player2,
    });
  }

  const updatedRooms = roomsSnapshot.docs.map((roomDoc) => {
    const roomData = roomDoc.data();

    const updatedMembers = roomData.members.map((member) => {
      const playerRating = playerRatings[member.name];
      if (playerRating) {
        const OriginalRoomRating = member.rating || 1000;
        const UpdatedTotalRating = playerRating.UpdatedTemporaryOldRating;
        const UpdatedRoomRating = calculateElo(
          OriginalRoomRating,
          UpdatedTotalRating,
          1
        );

        return {
          ...member,
          rating: UpdatedRoomRating,
          totalRating: UpdatedTotalRating,
        };
      }
      return member;
    });

    return {
      id: roomDoc.id,
      name: roomData.name,
      members: updatedMembers,
    };
  });

  for (const room of updatedRooms) {
    await roomsRef.doc(room.id).update({
      members: room.members,
    });
  }

  console.log('> База данных успешно обновлена!');
}

(async () => {
  try {
    await updateDatabaseWithNewData();
    console.log('> Скрипт выполнен успешно.');
    process.exit(0);
  } catch (error) {
    console.error('> Ошибка при выполнении скрипта:', error);
    process.exit(1);
  }
})();