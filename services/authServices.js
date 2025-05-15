const { Op } = require("sequelize");
const User = require("../models/User");
const bcrypt = require("bcrypt");

const register = async (username, email, password) => {
  if (!username || !email) {
    throw new Error("Username and email are required");
  }

  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });
  if (existingUser) throw new Error("User already exist");

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, password: hashedPassword });
  return { message: "User registered successfully", userId: user.id };
};

const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error("Invalid email or password");
  }

  return { message: "Login successful", token };
};

module.exports = { register, login };
