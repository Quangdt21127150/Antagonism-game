const User = require("../models/User");
const UserSkin = require("../models/UserSkin");
const Skin = require("../models/Skin");

// Lấy danh sách skin (có thể lọc theo type)
const getAllSkins = async (type) => {
  const where = type ? { type } : {};
  return await Skin.findAll({ where });
};

// Lấy danh sách skin user sở hữu
const getUserSkins = async (userId) => {
  const userSkins = await UserSkin.findAll({ where: { user_id: userId } });
  const skinIds = userSkins.map((us) => us.skin_id);
  return await Skin.findAll({ where: { id: skinIds } });
};

// Mở khóa skin cho user
const unlockUserSkin = async (userId, skinId, type) => {
  const existed = await UserSkin.findOne({
    where: { user_id: userId, skin_id: skinId },
  });
  if (existed) throw new Error("User already owns this skin");

  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");

  const skin = await Skin.findByPk(skinId);
  if (!skin) throw new Error("Skin not found");

  // Giả sử skin có trường price_coin và price_gem
  if (type === "coin") {
    if (user.coin < skin.price_coin) throw new Error("Not enough coin");
    user.coin -= skin.price_coin;
  } else if (type === "gem") {
    if (user.gem < skin.price_gem) throw new Error("Not enough gem");
    user.gem -= skin.price_gem;
  } else {
    throw new Error("Invalid unlock method");
  }

  await user.save();
  await UserSkin.create({ user_id: userId, skin_id: skinId });
  return { status: 200, message: "Skin unlocked", type };
};

// Chọn skin đang dùng
const selectUserSkin = async (userId, type, skinId) => {
  const owned = await UserSkin.findOne({
    where: { user_id: userId, skin_id: skinId },
  });
  if (!owned) throw new Error("User does not own this skin");
  const skin = await Skin.findByPk(skinId);
  if (!skin || skin.type !== type) throw new Error("Invalid skin type");
  const user = await User.findByPk(userId);
  if (!user) throw new Error("User not found");
  if (type === "piece") user.selected_piece_skin = skinId;
  if (type === "board") user.selected_board_skin = skinId;
  if (type === "background") user.selected_background_skin = skinId;
  if (type === "effect") user.selected_effect_skin = skinId;
  await user.save();
  return user;
};

module.exports = {
  getAllSkins,
  getUserSkins,
  unlockUserSkin,
  selectUserSkin,
};
