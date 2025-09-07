const { Op } = require("sequelize");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Authorization = require("../models/Authorization");

const register = async (username, phone, password, confirmPassword) => {
  // Validate required fields
  if (!username || !phone || !password || !confirmPassword) {
    throw { status: 400, message: "Vui lòng nhập đầy đủ thông tin" };
  }

  // Validate username length (4-16 characters)
  if (username.length < 4 || username.length > 16) {
    throw {
      status: 400,
      message: "Tên đăng nhập phải từ 4 đến 16 ký tự",
    };
  }

  // Validate phone (must start with 0 and have exactly 10 digits)
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw {
      status: 400,
      message:
        "Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có đúng 10 số)",
    };
  }

  // Validate password length (8-16 characters)
  if (password.length < 8 || password.length > 16) {
    throw {
      status: 400,
      message: "Mật khẩu phải từ 8 đến 16 ký tự",
    };
  }

  // Validate password confirmation
  if (password !== confirmPassword) {
    throw { status: 400, message: "Mật khẩu xác nhận không khớp" };
  }

  // Check for duplicate username, email, or phone
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ username }, { phone }],
    },
  });
  if (existingUser) {
    if (existingUser.username === username) {
      throw { status: 409, message: "Tên người dùng đã tồn tại" };
    }
    if (existingUser.phone === phone) {
      throw { status: 409, message: "Số điện thoại đã được sử dụng" };
    }

    throw { status: 409, message: "Tài khoản đã tồn tại" };
  }

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    full_name: username, // Sử dụng username làm full_name nếu không có trường full_name riêng
    username,
    phone,
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
    { expiresIn: "1d" }
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
      "win",
      "lose",
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
