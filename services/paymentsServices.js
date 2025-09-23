const User = require("../models/User");
const ShopPackage = require("../models/ShopPackage");
const Transaction = require("../models/Transaction");
const axios = require("axios");
const crypto = require("crypto");

// Tạo giao dịch nạp tiền
const createTransaction = async ({ user_id, package_id }) => {
  const user = await User.findByPk(user_id);
  const pkg = await ShopPackage.findByPk(package_id);
  if (!user) throw new Error("User not found");
  if (!pkg) throw new Error("Package not found");

  const transaction = await Transaction.create({
    user_id,
    package_id,
    status: "pending",
  });

  return { transaction };
};

// Xử lý webhook từ cổng thanh toán
const handlePaymentCallback = async ({ transaction_id, status }) => {
  const transaction = await Transaction.findByPk(transaction_id);
  if (!transaction) throw new Error("Transaction not found");

  // Chỉ xử lý nếu đang pending
  if (transaction.status !== "pending") return { message: "Already processed" };

  await transaction.update({ status });

  // Nếu thành công thì cộng tiền/gem
  if (status === "success") {
    const pkg = await ShopPackage.findByPk(transaction.package_id);
    const user = await User.findByPk(transaction.user_id);
    if (pkg.type === "coin") {
      user.coin += pkg.coin_amount + (pkg.bonus_amount || 0);
    } else if (pkg.type === "gem") {
      user.gem += pkg.coin_amount + (pkg.bonus_amount || 0);
    }
    await user.save();
  }

  return { message: "Callback processed", transaction };
};

// Cộng tiền/gem vào tài khoản (dùng cho admin hoặc test)
const addCurrency = async ({ user_id, type, amount }) => {
  const user = await User.findByPk(user_id);
  if (!user) throw new Error("User not found");
  if (type === "coin") user.coin += amount;
  else if (type === "gem") user.gem += amount;
  await user.save();
  return { user };
};

// Lấy lịch sử giao dịch
const getTransactions = async (user_id) => {
  return await Transaction.findAll({
    where: { user_id },
    order: [["created_at", "DESC"]],
  });
};

const accessKey = "F8BBA842ECF85";
const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const partnerCode = "MOMO";
const momoEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create";

// Hàm tạo thanh toán MoMo
const createMomoPayment = async ({ transaction }) => {
  const orderId = partnerCode + new Date().getTime();
  const requestId = orderId;
  const amount = "50000"; // Có thể lấy từ transaction.package.price
  const orderInfo = "Thanh toán dịch vụ";
  var redirectUrl = "https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b";
  var ipnUrl = "https://webhook.site/b3088a6a-2d17-4f8d-a383-71389a6c600b";
  const requestType = "payWithMethod";
  const extraData = "";
  const autoCapture = true;

  const rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const body = {
    partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture,
    extraData,
    orderGroupId: "",
    signature,
  };

  const result = await axios.post(momoEndpoint, body, {
    headers: { "Content-Type": "application/json" },
  });

  return result.data;
};

// Xác thực callback từ MoMo và cập nhật giao dịch
const verifyMomoCallback = async (momoBody) => {
  const { orderId, resultCode } = momoBody;
  const status = resultCode === 0 ? "success" : "failed";

  const transaction_id = orderId; 

  return await handlePaymentCallback({ transaction_id, status });
};

module.exports = {
  createTransaction,
  handlePaymentCallback,
  addCurrency,
  getTransactions,
  createMomoPayment,
  verifyMomoCallback,
};
