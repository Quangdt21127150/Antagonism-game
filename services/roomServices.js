const Room = require("../models/Room");
const Match = require("../models/Match");
const User = require("../models/User");

const createRoom = async (ownerId, password) => {
  const owner = await User.findByPk(ownerId);
  if (!owner) throw new Error("Owner of room not found");

  const room = await Room.create({
    owner_id: ownerId,
    password: password || null,
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
  if (!match) {
    match = await Match.create({ white_id: userId, status: "waiting" });
    await room.update({ match_id: match.id });
  } else if (match.white_id !== userId) {
    await match.update({ black_id: userId, status: "ongoing" });
  } else {
    throw { status: 400, message: "Two players must be different" };
  }

  return { message: "Joined room successfully", matchId: match.id };
};

const getWaitingRooms = async () => {
  const rooms = await Room.findAll({
    include: [
      {
        model: Match,
        where: { status: "waiting" },
        required: true,
      },
    ],
  });
  return { rooms };
};

module.exports = { createRoom, joinRoom, getWaitingRooms };
