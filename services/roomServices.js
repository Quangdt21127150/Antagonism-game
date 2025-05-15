const Room = require("../models/Room");
const Match = require("../models/Match");
const jwt = require("jsonwebtoken");

const createRoom = async (accessToken, password) => {
  let userId;
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    userId = decoded.userId;
  } catch (error) {
    throw { status: 401, message: "Unauthorized" };
  }

  const room = await Room.create({
    owner_id: userId,
    password: password,
  });
  return { message: "Room created successfully", roomId: room.id };
};

const joinRoom = async (roomId, password, accessToken) => {
  let userId;
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    userId = decoded.userId;
  } catch (error) {
    throw { status: 401, message: "Unauthorized" };
  }

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

const getRooms = async (accessToken) => {
  let userId;
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
    userId = decoded.userId;
  } catch (error) {
    throw { status: 401, message: "Unauthorized" };
  }

  const rooms = await Room.findAll({
    where: { owner_id: userId },
  });
  return { rooms };
};

const getWaitingRooms = async (accessToken) => {
  try {
    jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw { status: 401, message: "Unauthorized" };
  }

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

module.exports = { createRoom, joinRoom, getRooms, getWaitingRooms };
