const { Op } = require("sequelize");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");

const register = async (
  username,
  email,
  password,
  phone,
  confirmPassword,
  fullname
) => {
  if (
    !username ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword ||
    !fullname
  ) {
    throw { status: 400, message: "Vui lòng nhập đầy đủ thông tin" };
  }
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw { status: 400, message: "Email không hợp lệ (phải có dạng @...com)" };
  }
  // Validate phone (basic)
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    throw { status: 400, message: "Số điện thoại không hợp lệ" };
  }

  if (password !== confirmPassword) {
    throw { status: 400, message: "Mật khẩu xác nhận không khớp" };
  }
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { email }],
    },
  });
  if (existingUser) throw { status: 409, message: "Người dùng đã tồn tại!" };

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    full_name: fullname,
    username,
    phone,
    email,
    password: hashedPassword,
  });
  return { message: "Đăng ký thành công", userId: user.id };
};

const login = async (identifier, password) => {
  if (!identifier || !password) {
    throw {
      status: 400,
      message: "Bạn chưa nhập tên người dùng hoặc mật khẩu.",
    };
  }

  // identifier: có thể là email, sđt hoặc username
  let where = {};
  if (typeof identifier === "string" && identifier.includes("@")) {
    where = { email: identifier };
  } else if (
    typeof identifier === "string" &&
    /^\+?\d{9,15}$/.test(identifier.replace(/\s/g, ""))
  ) {
    where = { phone: identifier };
  } else {
    where = { username: identifier };
  }

  const user = await User.findOne({ where });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw {
      status: 400,
      message: "Tên người dùng hoặc mật khẩu không đúng, vui lòng thử lại.",
    };
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "45m" }
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
    message: "Đăng nhập thành công.",
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
  return { message: "Đăng xuất thành công!" };
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
      "coin",
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
