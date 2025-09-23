const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require("vnpay");

class VnpayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNP_TMNCODE;
    this.vnp_HashSecret = process.env.VNP_HASHSECRET;
    this.vnp_ReturnUrl = process.env.VNP_RETURNURL || "http://localhost:3000/api/payments/vnpay/callback";
    this.vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  }

  createPayment({ transactionId, amount, description }) {
    const vnpay = new VNPay({
      tmnCode: this.vnp_TmnCode,
      secureSecret: this.vnp_HashSecret,
      vnpayHost: this.vnp_Url,
      testMode: true,
      hashAlgorithm: "SHA512",
      enableLog: true,
      loggerFn: ignoreLogger,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return vnpay.buildPaymentUrl({
      vnp_Amount: amount.toString(),
      vnp_IpAddr: "127.0.0.1",
      vnp_TxnRef: transactionId,
      vnp_OrderInfo: description,
      vnp_ReturnUrl: this.vnp_ReturnUrl,
      vnp_OrderType: ProductCode.Other,
      vnp_Locale: VnpLocale.VN,
      vnp_CreateDate: dateFormat(new Date()),
      vnp_ExpireDate: dateFormat(tomorrow),
    });
  }
}

module.exports = new VnpayService();
