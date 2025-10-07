const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const authorization = await Authorization.findOne({
      where: { user_id: decoded.userId, access_token: token },
    });

    if (!authorization) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
