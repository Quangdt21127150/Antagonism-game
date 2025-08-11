const Payment = require("../models/Payment");
const User = require("../models/User");
const momoService = require("./momoService");
const sequelize = require("../config/postgres");

class PaymentService {
  // Tạo payment order mới
  async createPaymentOrder({ userId, amount, starsToAdd, orderInfo }) {
    const orderId = `ORDER_${Date.now()}_${userId.slice(-8)}`;
    const requestId = `REQ_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Tạo payment record trong database
      const payment = await Payment.create({
        user_id: userId,
        order_id: orderId,
        request_id: requestId,
        amount: amount,
        stars_to_add: starsToAdd,
        status: "pending",
      });

      // Gọi MoMo API để tạo payment URL
      const momoResponse = await momoService.createPayment({
        orderId,
        requestId,
        amount,
        orderInfo: orderInfo || `Mua ${starsToAdd} stars`,
        extraData: JSON.stringify({ userId, starsToAdd }),
      });

      // Cập nhật payment với MoMo response
      if (momoResponse.resultCode === 0) {
        payment.momo_response = momoResponse;
        await payment.save();

        return {
          success: true,
          paymentId: payment.id,
          orderId,
          paymentUrl: momoResponse.payUrl,
          qrCodeUrl: momoResponse.qrCodeUrl,
        };
      } else {
        payment.status = "failed";
        payment.momo_response = momoResponse;
        await payment.save();

        throw new Error(`MoMo Error: ${momoResponse.message}`);
      }
    } catch (error) {
      console.error("Create payment error:", error);
      throw error;
    }
  }

  // Verify và complete payment
  async verifyAndCompletePayment(momoData) {
    const transaction = await sequelize.transaction();

    try {
      // Verify signature từ MoMo
      if (!momoService.verifySignature(momoData)) {
        throw new Error("Invalid MoMo signature");
      }

      // Tìm payment record
      const payment = await Payment.findOne({
        where: { order_id: momoData.orderId },
        transaction,
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      // Kiểm tra payment đã được xử lý chưa
      if (payment.status !== "pending") {
        throw new Error("Payment already processed");
      }

      // Kiểm tra amount
      if (parseInt(momoData.amount) !== parseInt(payment.amount)) {
        throw new Error("Amount mismatch");
      }

      // Cập nhật payment status
      if (momoData.resultCode === 0) {
        // Payment thành công
        payment.status = "completed";
        payment.momo_transaction_id = momoData.transId;
        payment.momo_response = momoData;
        payment.completed_at = new Date();
        await payment.save({ transaction });

        // Parse extraData để xem loại payment
        let extraData = {};
        try {
          extraData = JSON.parse(momoData.extraData || "{}");
        } catch (e) {
          console.warn("Failed to parse extraData:", momoData.extraData);
        }

        const user = await User.findByPk(payment.user_id, { transaction });
        if (!user) {
          throw new Error("User not found");
        }

        let result = {
          success: true,
          message: "Payment completed successfully",
        };

        if (extraData.type === "item_purchase") {
          // Xử lý item purchase
          const Item = require("../models/Item");
          const ItemPurchase = require("../models/ItemPurchase");

          const item = await Item.findByPk(extraData.itemId, { transaction });
          if (!item) {
            throw new Error("Item not found");
          }

          const quantity = extraData.quantity || 1;

          // Check quantity availability
          if (item.number < quantity) {
            throw new Error(`Only ${item.number} items available`);
          }

          // Calculate coins earned
          const coinsEarned = Math.floor(payment.amount * 0.1);

          // Update user coins
          user.coin += coinsEarned;
          await user.save({ transaction });

          // Update item quantity
          item.number -= quantity;
          await item.save({ transaction });

          // Create purchase record
          await ItemPurchase.create(
            {
              user_id: payment.user_id,
              item_id: extraData.itemId,
              quantity: quantity,
              stars_spent: 0, // Paid with real money, not stars
              coins_earned: coinsEarned,
            },
            { transaction }
          );

          result = {
            success: true,
            message: "Item purchased successfully",
            coinsEarned: coinsEarned,
            quantity: quantity,
            itemName: item.name,
            newCoinBalance: user.coin,
          };
        } else {
          // Xử lý star purchase
          user.star += payment.stars_to_add;
          await user.save({ transaction });

          result = {
            success: true,
            message: "Payment completed successfully",
            starsAdded: payment.stars_to_add,
            newStarBalance: user.star,
          };
        }

        await transaction.commit();
        return result;
      } else {
        // Payment thất bại
        payment.status = "failed";
        payment.momo_response = momoData;
        await payment.save({ transaction });

        await transaction.commit();

        return {
          success: false,
          message: `Payment failed: ${momoData.message}`,
        };
      }
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Verify payment error:", error);
      throw error;
    }
  }

  // Lấy lịch sử payment của user
  async getUserPaymentHistory(userId) {
    return await Payment.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "order_id",
        "amount",
        "stars_to_add",
        "status",
        "created_at",
        "completed_at",
      ],
    });
  }

  // Query payment status từ MoMo
  async queryPaymentStatus(orderId) {
    try {
      const payment = await Payment.findOne({
        where: { order_id: orderId },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      // Query từ MoMo
      const momoResponse = await momoService.queryTransaction({
        orderId: payment.order_id,
        requestId: payment.request_id,
      });

      // Cập nhật status nếu cần
      if (momoResponse.resultCode === 0 && payment.status === "pending") {
        await this.verifyAndCompletePayment(momoResponse);
      }

      return {
        orderId: payment.order_id,
        status: payment.status,
        amount: payment.amount,
        starsToAdd: payment.stars_to_add,
        momoStatus: momoResponse,
      };
    } catch (error) {
      console.error("Query payment status error:", error);
      throw error;
    }
  }

  // Tính toán stars dựa trên amount VND
  calculateStars(amountVND) {
    // 1000 VND = 10 stars (có thể điều chỉnh tỷ lệ)
    return Math.floor(amountVND / 100);
  }

  // Predefined packages
  getStarPackages() {
    return [
      { id: 1, stars: 100, price: 10000, name: "Gói Cơ Bản" },
      { id: 2, stars: 500, price: 45000, name: "Gói Phổ Biến", bonus: 50 },
      {
        id: 3,
        stars: 1000,
        price: 85000,
        name: "Gói Siêu Giá Trị",
        bonus: 150,
      },
      { id: 4, stars: 2000, price: 160000, name: "Gói VIP", bonus: 400 },
      {
        id: 5,
        stars: 5000,
        price: 375000,
        name: "Gói Tối Thượng",
        bonus: 1250,
      },
    ];
  }
}

module.exports = new PaymentService();
