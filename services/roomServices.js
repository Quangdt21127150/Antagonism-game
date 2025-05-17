const User = require("../models/User");
const Room = require("../models/Room");
const Match = require("../models/Match");
const { Op } = require("sequelize");

// const createRoom = async (password, userId) => {
//   const match = await Match.create({
//     white_id: userId,
//     status: "waiting",
//   });

//   const room = await Room.create({
//     owner_id: userId,
//     match_id: match.id,
//     password: password,
//   });
//   return { message: "Room created successfully", roomId: room.id };
// };

const createRoom = async (opponentId, password, userId) => {
  const opponent = await User.findByPk(opponentId);
  if (!opponent) throw { status: 404, message: "Opponent not found" };

  if (opponentId === userId)
    throw { status: 400, message: "Two players must be different" };

  const match = await Match.create({
    white_id: userId,
    black_id: opponentId,
    status: "ongoing",
  });

  const room = await Room.create({
    owner_id: userId,
    id: id,
    match_id: match.id,
    password: password,
  });
  return { message: "Room created successfully", roomId: room.id };
};

const joinRoom = async (roomId, password, userId) => {
  const room = await Room.findByPk(roomId);
  if (!room) throw { status: 404, message: "Room not found" };

  if (room.password && room.password !== password) {
    throw { status: 403, message: "Incorrect password" };
  }

  let match = await Match.findByPk(room.match_id);
  if (match.white_id !== userId) {
    await match.update({ black_id: userId, status: "ongoing" });
  } else {
    throw { status: 400, message: "Two players must be different" };
  }

  return { message: "Joined room successfully", matchId: match.id };
};

const getRooms = async (userId) => {
  const rooms = await Room.findAll({
    where: { owner_id: userId },
  });
  return { rooms };
};
const getWaitingRoom = async () => {
  const room = await Room.findOne({
    where: {
      password: { [Op.or]: ["", null] }, // Password is "" or null
    },
    include: [
      {
        model: Match,
        as: "match",
        where: {
          black_id: null, // Match must have black_id as null
        },
        required: true,
      },
    ],
    order: [["created_at", "ASC"]], // Changed from "createdAt" to "created_at"
  });
  return { room: room || null }; // Return single room or null if none found
};
const getWaitingRooms = async () => {
  const rooms = await Room.findAll({
    include: [
      {
        model: Match,
        as: "match",
        where: { status: "waiting" },
        required: true,
      },
    ],
  });
  return { rooms };
};

const deleteRoom = async (roomId, userId) => {
  const room = await Room.findByPk(roomId);
  if (!room) throw { status: 404, message: "Room not found" };

  if (room.owner_id !== userId) {
    throw { status: 403, message: "Only the room owner can delete the room" };
  }

  const match = await Match.findByPk(room.match_id);
  if (match) {
    await match.destroy(); // Delete the match regardless of status
  }

  await room.destroy(); // Now delete the room

  return { message: "Room and associated match deleted successfully" };
};

module.exports = {
  createRoom,
  joinRoom,
  getRooms,
  getWaitingRooms,
  getWaitingRoom,
  deleteRoom,
};
