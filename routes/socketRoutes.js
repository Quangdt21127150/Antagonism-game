const jwt = require("jsonwebtoken");
const Room = require("../models/Room");
const Match = require("../models/Match");
const MatchHistory = require("../models/MatchHistory");

module.exports = (io) => {
  // Socket.IO Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Socket.IO Connection Handling
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.userId}`);

    // Tham gia phòng
    socket.on("join-room", async ({ roomId }) => {
      try {
        const room = await Room.findByPk(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const match = await Match.findByPk(room.match_id);
        if (
          match.white_id !== socket.user.userId &&
          match.black_id !== socket.user.userId
        ) {
          socket.emit("error", {
            message: "You are not a player in this match",
          });
          return;
        }

        socket.join(roomId);
        console.log(`User ${socket.user.userId} joined room ${roomId}`);
        io.to(roomId).emit("user-joined", { userId: socket.user.userId });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Xử lý nước đi
    socket.on("make-move", async ({ roomId, move }) => {
      try {
        const room = await Room.findByPk(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        // Lưu nước đi vào MatchHistory
        await MatchHistory.create({
          match_id: room.match_id,
          content: { move, userId: socket.user.userId },
        });

        // Phát nước đi đến các client khác trong phòng
        socket
          .to(roomId)
          .emit("move-made", { userId: socket.user.userId, move });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Xử lý cập nhật trạng thái trận đấu
    socket.on("update-match-status", async ({ roomId, status }) => {
      try {
        const room = await Room.findByPk(roomId);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const match = await Match.findByPk(room.match_id);
        if (!match) {
          socket.emit("error", { message: "Match not found" });
          return;
        }

        // Cập nhật trạng thái trận đấu
        await match.update({ status });

        // Thông báo trạng thái mới đến tất cả client trong phòng
        io.to(roomId).emit("match-status-updated", { status });
      } catch (error) {
        socket.emit("error", { message: error.message });
      }
    });

    // Ngắt kết nối
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.userId}`);
    });
  });
};
