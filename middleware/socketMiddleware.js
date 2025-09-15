
const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");

const SECRET = process.env.JWT_ACCESS_SECRET || "secret";

async function socketAuthMiddleware(socket, next) {
  console.log("socket", socket);
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Tạo token mới với thời hạn 365 ngày nếu không có token
    const newToken = jwt.sign(
      { userId: socket.handshake.auth?.userId },
      SECRET,
      { expiresIn: "365d" }
    );
    socket.token = newToken;
    return next();
  }

  try {
    // Decode token
    const payload = jwt.verify(token, SECRET);
    const userId = payload.userId;

    // Check token in Authorization table
    const authorization = await Authorization.findOne({
      where: { user_id: userId, access_token: token },
    });

    if (!authorization) {
      // Tạo token mới với thời hạn 365 ngày nếu token không hợp lệ
      const newToken = jwt.sign({ userId: userId }, SECRET, {
        expiresIn: "365d",
      });
      socket.token = newToken;
      return next();
    }

    // Attach user info to socket
    socket.userId = userId;
    socket.token = token;
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Invalid token"));
  }
}

module.exports = socketAuthMiddleware;
