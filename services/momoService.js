const crypto = require("crypto");
const axios = require("axios");

class MoMoService {
  constructor() {
    // MoMo Configuration - Thay đổi cho production
    this.partnerCode = process.env.MOMO_PARTNER_CODE || "MOMO_DEMO";
    this.accessKey = process.env.MOMO_ACCESS_KEY || "DEMO_ACCESS_KEY";
    this.secretKey = process.env.MOMO_SECRET_KEY || "DEMO_SECRET_KEY";
    this.endpoint =
      process.env.MOMO_ENDPOINT ||
      "https://test-payment.momo.vn/v2/gateway/api/create";
    this.ipnUrl =
      process.env.MOMO_IPN_URL ||
      "https://your-domain.com/api/payment/momo/ipn";
    this.redirectUrl =
      process.env.MOMO_REDIRECT_URL ||
      "https://your-domain.com/payment/success";
  }

  // Tạo signature cho MoMo request
  createSignature(data) {
    const rawSignature = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;

    return crypto
      .createHmac("sha256", this.secretKey)
      .update(rawSignature)
      .digest("hex");
  }

  // Verify signature từ MoMo response
  verifySignature(data) {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = data;

    const rawSignature = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(rawSignature)
      .digest("hex");

    return signature === expectedSignature;
  }

  // Tạo payment request tới MoMo
  async createPayment({
    orderId,
    requestId,
    amount,
    orderInfo,
    extraData = "",
  }) {
    const requestData = {
      partnerCode: this.partnerCode,
      partnerName: "Game Store",
      storeId: "GameStore01",
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: orderInfo,
      redirectUrl: this.redirectUrl,
      ipnUrl: this.ipnUrl,
      lang: "vi",
      extraData: extraData,
      requestType: "payWithATM",
      accessKey: this.accessKey,
    };

    // Tạo signature
    requestData.signature = this.createSignature(requestData);

    try {
      console.log("Sending MoMo request:", requestData);

      const response = await axios.post(this.endpoint, requestData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });

      console.log("MoMo response:", response.data);
      return response.data;
    } catch (error) {
      console.error("MoMo API Error:", error.response?.data || error.message);
      throw new Error("Failed to create MoMo payment");
    }
  }

  // Query transaction status từ MoMo
  async queryTransaction({ orderId, requestId }) {
    const requestData = {
      partnerCode: this.partnerCode,
      requestId: requestId,
      orderId: orderId,
      lang: "vi",
      accessKey: this.accessKey,
    };

    // Tạo signature cho query
    const rawSignature = `accessKey=${requestData.accessKey}&orderId=${requestData.orderId}&partnerCode=${requestData.partnerCode}&requestId=${requestData.requestId}`;
    requestData.signature = crypto
      .createHmac("sha256", this.secretKey)
      .update(rawSignature)
      .digest("hex");

    try {
      const queryEndpoint =
        process.env.MOMO_QUERY_ENDPOINT ||
        "https://test-payment.momo.vn/v2/gateway/api/query";
      const response = await axios.post(queryEndpoint, requestData);
      return response.data;
    } catch (error) {
      console.error("MoMo Query Error:", error.response?.data || error.message);
      throw new Error("Failed to query MoMo transaction");
    }
  }
}

module.exports = new MoMoService();
