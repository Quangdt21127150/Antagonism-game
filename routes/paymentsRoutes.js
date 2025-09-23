//Route thanh toán đang dùng
const express = require("express");
const router = express.Router();
const paymentServices = require("../services/paymentsServices");
const authMiddleware = require("../middleware/authMiddleware");
const Package = require("../models/ShopPackage");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");
const axios = require("axios");
const {
  VNPay,
  ignoreLogger,
  ProductCode,
  VnpLocale,
  dateFormat,
} = require("vnpay");

// Tạo giao dịch nạp tiền
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { package_id } = req.body;
    const user_id = req.user.userId;
    const result = await paymentServices.createTransaction({
      user_id,
      package_id,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Nhận redirect từ MoMo (GET - redirectUrl)
router.get("/callback", async (req, res) => {
  console.log("🔄 Call back received");
  console.log("➡ Query:", req.query);
  if (req.query.partnerCode === "MOMO") {
    const { orderId, resultCode } = req.query;
    const status = resultCode == 0 ? "success" : "fail";
    const result = await paymentServices.handlePaymentCallback({
      transaction_id: orderId,
      status,
    });
    return res.status(200).json({
      message: "Redirect from MoMo",
      status,
      result,
      query: req.query,
    });
  }
  if (req.query.vnp_TxnRef && req.query.vnp_ResponseCode) {
    // vnp_ResponseCode === "00" là thành công
    const status = req.query.vnp_ResponseCode === "00" ? "success" : "fail";
    const result = await paymentServices.handlePaymentCallback({
      transaction_id: req.query.vnp_TxnRef,
      status,
    });
    return res.status(200).json({
      message: "Redirect from VNPAY",
      status,
      result,
      query: req.query,
    });
  }
  res.status(200).json({
    message: "Redirect from payment gateway",
    query: req.query,
  });
});

// Cộng tiền/gem vào tài khoản (admin/test)
router.post("/add-currency", authMiddleware, async (req, res) => {
  try {
    const { type, amount } = req.body;
    const user_id = req.user.userId;
    const result = await paymentServices.addCurrency({ user_id, type, amount });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lấy lịch sử giao dịch
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.userId;
    const transactions = await paymentServices.getTransactions(user_id);
    res.json(transactions);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/momo", authMiddleware, async (req, res) => {
  try {
    const { package_id } = req.body;
    const user_id = req.user.userId;

    // Lấy thông tin package
    const pkg = await Package.findByPk(package_id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    // Tạo transaction (orderId = transaction.id)
    const transaction = await Transaction.create({
      user_id,
      package_id,
      transaction_type: "package_purchase",
      description: `Mua gói ${pkg.name}`,
      stars_to_add: pkg.coin_amount + (pkg.bonus_amount || 0),
      amount: pkg.price_vnd,
      currency_type: pkg.type,
      payment_method: "momo",
      status: "pending",
    });

    // Chuẩn bị thông tin MoMo
    const accessKey = "F8BBA842ECF85";
    const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const partnerCode = "MOMO";
    const orderId = transaction.id;
    const requestId = orderId;
    const amount = pkg.price_vnd.toString();
    const orderInfo = `Mua gói ${pkg.name}`;
    const redirectUrl = "http://localhost:3000/api/payments/callback";
    const ipnUrl = "http://localhost:3000/api/payments/callback";
    const requestType = "payWithMethod";
    const extraData = "";
    const autoCapture = true;
    const lang = "vi";

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

    const requestBody = {
      partnerCode,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      orderGroupId: "",
      signature,
    };

    const momoRes = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    // Trả về payUrl cho FE
    res.status(200).json({
      message: "Create payment request successfully",
      payUrl: momoRes.data.payUrl,
      transaction_id: transaction.id,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// VNPAY payment endpoint
router.post("/vnpay", authMiddleware, async (req, res) => {
  try {
    const { package_id } = req.body;
    const user_id = req.user.userId;
    const pkg = await Package.findByPk(package_id);
    if (!pkg) return res.status(404).json({ error: "Package not found" });

    const transaction = await Transaction.create({
      user_id,
      package_id,
      transaction_type: "package_purchase",
      stars_to_add: pkg.coin_amount + (pkg.bonus_amount || 0),
      description: `Mua gói ${pkg.name}`,
      amount: pkg.price_vnd,
      currency_type: pkg.type,
      payment_method: "vnpay",
      status: "pending",
    });
    const vnpay = new VNPay({
      // Thông tin cấu hình bắt buộc
      tmnCode: process.env.vnp_TmnCode,
      secureSecret: process.env.vnp_HashSecret,
      vnpayHost: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",

      // Cấu hình tùy chọn
      testMode: true,
      hashAlgorithm: "SHA512",
      enableLog: true,
      loggerFn: ignoreLogger,
    });
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Ngày mai
    const vnpayResponse = vnpay.buildPaymentUrl({
      vnp_Amount: pkg.price_vnd.toString(), // Số tiền
      vnp_IpAddr: "127.0.0.1",
      vnp_OrderInfo: "Thanh toán dịch vụ",
      vnp_TxnRef: transaction.id, // Mã giao dịch (orderId)
      vnp_OrderInfo: "123456",
      vnp_ReturnUrl: "http://localhost:3000/api/payments/callback",
      vnp_OrderType: ProductCode.Other,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });

    return res.status(200).json({
      message: "VNPAY payment request created successfully",
      vnpayResponse,
    });
  } catch (error) {}
});
module.exports = router;
