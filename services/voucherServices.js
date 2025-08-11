const Voucher = require("../models/Voucher");
const User = require("../models/User");
const VoucherRedemption = require("../models/VoucherRedemption");
const sequelize = require("../config/postgres");

async function createVoucher({ name, amount, validDate, expireDate }) {
  if (!name || !amount || !validDate || !expireDate) {
    throw { status: 400, message: "All fields are required" };
  }
  const exists = await Voucher.findOne({ where: { name } });
  if (exists) throw { status: 409, message: "Voucher already exists" };
  const voucher = await Voucher.create({ name, amount, validDate, expireDate });
  return voucher;
}

async function redeemVoucher({ userId, voucherName }) {
  // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
  const transaction = await sequelize.transaction();

  try {
    const voucher = await Voucher.findOne({
      where: { name: voucherName },
      transaction,
    });

    if (!voucher) {
      throw { status: 404, message: "Voucher not found" };
    }

    const now = new Date();
    if (now < voucher.validDate || now > voucher.expireDate) {
      throw { status: 400, message: "Voucher not valid at this time" };
    }

    // Kiểm tra xem user đã redeem voucher này chưa bằng cách check bảng voucher_redemptions
    const existingRedemption = await VoucherRedemption.findOne({
      where: {
        user_id: userId,
        voucher_id: voucher.id,
      },
      transaction,
    });

    if (existingRedemption) {
      throw { status: 400, message: "Voucher already redeemed by this user" };
    }

    // Double check với array redeemedUsers (backup validation)
    if (voucher.redeemedUsers.includes(userId)) {
      throw { status: 400, message: "Voucher already redeemed by this user" };
    }

    // Find user và cập nhật stars
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    // Cập nhật stars của user
    user.star += voucher.amount;
    await user.save({ transaction });

    // Tạo record trong bảng voucher_redemptions
    await VoucherRedemption.create(
      {
        user_id: userId,
        voucher_id: voucher.id,
        stars_added: voucher.amount,
      },
      { transaction }
    );

    // Cập nhật array redeemedUsers (để backward compatibility)
    voucher.redeemedUsers.push(userId);
    await voucher.save({ transaction });

    await transaction.commit();

    return {
      message: "Voucher redeemed successfully",
      starsAdded: voucher.amount,
      newStarBalance: user.star,
    };
  } catch (error) {
    // Chỉ rollback nếu transaction chưa được commit hoặc rollback
    if (!transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
}

async function getAllVouchers() {
  const vouchers = await Voucher.findAll({
    order: [["createdAt", "DESC"]],
  });
  return vouchers;
}

async function getVoucherById(id) {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw { status: 404, message: "Voucher not found" };
  return voucher;
}

async function updateVoucher(id, { name, amount, validDate, expireDate }) {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw { status: 404, message: "Voucher not found" };

  // Check if name is being changed and if it already exists
  if (name && name !== voucher.name) {
    const exists = await Voucher.findOne({ where: { name } });
    if (exists) throw { status: 409, message: "Voucher name already exists" };
  }

  const updatedVoucher = await voucher.update({
    name: name || voucher.name,
    amount: amount !== undefined ? amount : voucher.amount,
    validDate: validDate || voucher.validDate,
    expireDate: expireDate || voucher.expireDate,
  });

  return updatedVoucher;
}

async function deleteVoucher(id) {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw { status: 404, message: "Voucher not found" };

  await voucher.destroy();
  return { message: "Voucher deleted successfully" };
}

async function getVoucherRedemptionHistory(voucherId) {
  const redemptions = await VoucherRedemption.findAll({
    where: { voucher_id: voucherId },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "username", "email"],
      },
    ],
    order: [["redeemed_at", "DESC"]],
  });
  return redemptions;
}

async function getUserRedemptionHistory(userId) {
  const redemptions = await VoucherRedemption.findAll({
    where: { user_id: userId },
    include: [
      {
        model: Voucher,
        as: "voucher",
        attributes: ["id", "name", "amount"],
      },
    ],
    order: [["redeemed_at", "DESC"]],
  });
  return redemptions;
}

module.exports = {
  createVoucher,
  redeemVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
  getVoucherRedemptionHistory,
  getUserRedemptionHistory,
};
