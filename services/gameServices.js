const Match = require("../models/Match");
const Room = require("../models/Room");
const ChatMessage = require("../models/Chat_Message");
const roomServices = require("./roomServices");
const matchServices = require("./matchServices");
const codeServices = require("./codeServices");
const matchmakingService = require("./matchmakingService");
const {
  getLevelFromElo,
  getEloRangeFromLevel,
  getRankFee,
} = require("./rankServices");

const User = require("../models/User");

class GameService {
  constructor() {
    this.socketToUser = new Map();
  }

  attachHandlers(io) {
    io.on("connection", (socket) => {
      // Unity xử lý toàn bộ game logic, Node.js chỉ xử lý chat và utilities

      // Chat functionality
      socket.join("global");

      socket.to("global").emit("chat_message", {
        sender: "System",
        message: "Một người đã tham gia phòng chat",
        timestamp: new Date(),
      });

      socket.on("chat_message", async ({ userId, username, message }) => {
        try {
          const msg = await ChatMessage.create({
            userId,
            username,
            message,
            timestamp: new Date(),
          });
          io.to("global").emit("chat_message", {
            username: msg.username,
            message: msg.message,
            timestamp: msg.timestamp,
          });
        } catch (err) {
          socket.emit("error", {
            message: "Failed to send message: " + err.message,
          });
        }
      });

      socket.on("disconnect", () => {
        socket.to("global").emit("chat_message", {
          sender: "System",
          message: "Một người đã rời khỏi phòng chat",
          timestamp: new Date(),
        });
      });

      // Currency management
      socket.on("add_currency", async ({ userId, packageId }) => {
        try {
          const user = await User.findByPk(userId);
          const pkg = await ShopPackage.findByPk(packageId);

          if (!user) return socket.emit("error", { message: "User not found" });
          if (!pkg || !pkg.is_active) {
            return socket.emit("error", { message: "Package not available" });
          }

          // Áp dụng cộng coin/gem dựa vào type
          if (pkg.type === "coin") {
            user.coin += pkg.coin_amount + (pkg.bonus_amount || 0);
          } else if (pkg.type === "gem") {
            user.gem += pkg.coin_amount + (pkg.bonus_amount || 0);
          }

          await user.save();

          socket.emit("currency_added", {
            gem: user.gem,
            coin: user.coin,
            message: `Nạp thành công ${pkg.coin_amount} + ${
              pkg.bonus_amount || 0
            } ${pkg.type}`,
          });
        } catch (err) {
          socket.emit("error", { message: "Failed to add currency" });
        }
      });

      // Code usage
      socket.on("use_code", async ({ userId, code }) => {
        try {
          if (!code) {
            return socket.emit("error", { message: "Vui lòng nhập code" });
          }

          const result = await codeServices.useCode(userId, code);

          socket.emit("code_used", {
            success: true,
            message: result.message,
            rewards: result.rewards,
            user: result.user,
          });
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      // Room management (for non-rank matches)
      socket.on(
        "create_room",
        async ({ roomName, password, userId, time_limit }) => {
          try {
            const result = await roomServices.createRoomwithPassword({
              roomName,
              password,
              userId,
              time_limit,
            });
            socket.emit("room_created", result);
          } catch (err) {
            socket.emit("error", {
              message: err.message || "Create room failed",
            });
          }
        }
      );

      socket.on("join_room", async ({ roomId, password, userId }) => {
        try {
          const result = await roomServices.joinRoom({
            roomId,
            password,
            userId,
          });
          socket.emit("room_joined", result);
        } catch (err) {
          socket.emit("error", { message: err.message || "Join room failed" });
        }
      });
    });
  }
}

module.exports = new GameService();
