const { Op } = require("sequelize");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");

const register = async (username, email, password) => {
  if (!username || !email) {
    throw { status: 400, message: "Username and email are required" };
  }

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });
  if (existingUser) throw { status: 409, message: "User already exist" };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });
  return { message: "User registered successfully", userId: user.id };
};

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid email or password");
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "15d" }
  );

  await Authorization.destroy({ where: { user_id: user.id } });

  await Authorization.create({
    user_id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return {
    message: "Login successful",
    accessToken,
    refreshToken,
    isAdmin: user.isAdmin,
  };
};

const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findOne({
      where: { id: decoded.userId },
    });
    if (!user) throw new Error("Invalid refresh token");

    const newAccessToken = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const authorization = await Authorization.findOne({
      where: { user_id: decoded.userId, refresh_token: refreshToken },
    });
    await authorization.update({ access_token: newAccessToken });

    return { accessToken: newAccessToken };
  } catch (error) {
    throw { status: 403, message: "Invalid or expired refresh token" };
  }
};

const logout = async (userId) => {
  await Authorization.destroy({ where: { user_id: userId } });
  return { message: "Logged out successfully" };
};

const getProfile = async (id) => {
  const user = await User.findByPk(id, {
    attributes: [
      "id",
      "username",
      "email",
      "created_at",
      "updated_at",
      "isAdmin",
      "star",
      "elo",
      "win_count",
      "lose_count",
    ],
  });
  if (!user) {
    throw new Error("User not found");
  }

  return { user };
};

const checkToken = async (userId) => {
  const authorization = await Authorization.findOne({
    where: { user_id: userId },
  });
  if (!authorization) {
    throw new Error("Token is invalid");
  }

  return { message: "Token is valid" };
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  checkToken,
};
