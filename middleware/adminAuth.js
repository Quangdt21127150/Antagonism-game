const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

module.exports = async function (req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findByPk(decoded.id);
    if (!admin) return res.status(403).json({ message: "No permission" });
    req.admin = admin;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};