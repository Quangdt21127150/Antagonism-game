const { Op } = require("sequelize");
const User = require("../models/User");
const bcrypt = require("bcrypt");

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
  const user = await User.create({ username, email, password: hashedPassword });
  return { message: "User registered successfully", userId: user.id };
};

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid email or password");
  }

  return { message: "Login successful" };
};

const getProfile = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error("User not found");
  }

  return { user };
};

module.exports = { register, login, getProfile };
