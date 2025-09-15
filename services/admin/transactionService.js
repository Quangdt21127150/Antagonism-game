const Transaction = require("../../models/Transaction");
const User = require("../../models/User");
const Log = require("../../models/Log");
const { Op } = require("sequelize");

class AdminTransactionService {
  // Lấy danh sách giao dịch với filter và pagination
  async getTransactions(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter theo user_id
      if (filters.user_id) {
        whereClause.user_id = filters.user_id;
      }

      // Filter theo type
      if (filters.type) {
        whereClause.type = filters.type;
      }

      // Filter theo khoảng thời gian
      if (filters.start_date && filters.end_date) {
        whereClause.created_at = {
          [Op.between]: [
            new Date(filters.start_date),
            new Date(filters.end_date),
          ],
        };
      }

      // Filter theo amount range
      if (filters.min_amount || filters.max_amount) {
        whereClause.amount = {};
        if (filters.min_amount) {
          whereClause.amount[Op.gte] = filters.min_amount;
        }
        if (filters.max_amount) {
          whereClause.amount[Op.lte] = filters.max_amount;
        }
      }

      const { count, rows: transactions } = await Transaction.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      return {
        transactions,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy chi tiết giao dịch
  async getTransactionDetail(transactionId) {
    try {
      const transaction = await Transaction.findByPk(transactionId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email", "coin", "gem"],
          },
        ],
      });

      if (!transaction) {
        throw new Error("Giao dịch không tồn tại");
      }

      return transaction;
    } catch (error) {
      throw error;
    }
  }

  // Tạo giao dịch thủ công (admin tặng coin/gem)
  async createManualTransaction(transactionData, adminId, ipAddress) {
    try {
      const { user_id, type, amount, currency_type, note } = transactionData;

      // Kiểm tra user tồn tại
      const user = await User.findByPk(user_id);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      // Tạo giao dịch
      const transaction = await Transaction.create({
        user_id,
        type: type || "admin_gift",
        amount,
        currency_type: currency_type || "coin", // coin hoặc gem
        note: note || "Admin tặng",
        status: "completed",
      });

      // Cập nhật coin/gem cho user
      if (currency_type === "gem") {
        user.gem += amount;
      } else {
        user.coin += amount;
      }
      await user.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "create_manual_transaction",
        target_type: "transaction",
        target_id: transaction.id.toString(),
        details: JSON.stringify({
          user_id,
          username: user.username,
          type,
          amount,
          currency_type,
          note,
        }),
        ip_address: ipAddress,
      });

      return {
        message: "Tạo giao dịch thành công",
        transaction: {
          id: transaction.id,
          user_id: transaction.user_id,
          type: transaction.type,
          amount: transaction.amount,
          currency_type: transaction.currency_type,
          note: transaction.note,
          created_at: transaction.created_at,
        },
        user: {
          id: user.id,
          username: user.username,
          coin: user.coin,
          gem: user.gem,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê giao dịch
  async getTransactionStats(filters = {}) {
    try {
      const whereClause = {};

      // Filter theo khoảng thời gian
      if (filters.start_date && filters.end_date) {
        whereClause.created_at = {
          [Op.between]: [
            new Date(filters.start_date),
            new Date(filters.end_date),
          ],
        };
      }

      // Tổng số giao dịch
      const totalTransactions = await Transaction.count({ where: whereClause });

      // Tổng số tiền
      const totalAmount = await Transaction.findOne({
        where: whereClause,
        attributes: [
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
        ],
      });

      // Thống kê theo type
      const transactionsByType = await Transaction.findAll({
        where: whereClause,
        attributes: [
          "type",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
        ],
        group: ["type"],
      });

      // Thống kê theo currency_type
      const transactionsByCurrency = await Transaction.findAll({
        where: whereClause,
        attributes: [
          "currency_type",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
        ],
        group: ["currency_type"],
      });

      // Top 10 giao dịch có giá trị cao nhất
      const topTransactions = await Transaction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["username"],
          },
        ],
        order: [["amount", "DESC"]],
        limit: 10,
      });

      // Thống kê theo ngày (7 ngày gần nhất)
      const dailyStats = await Transaction.findAll({
        where: {
          ...whereClause,
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        attributes: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("created_at")
            ),
            "date",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
        ],
        group: [
          require("sequelize").fn(
            "DATE",
            require("sequelize").col("created_at")
          ),
        ],
        order: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("created_at")
            ),
            "DESC",
          ],
        ],
      });

      return {
        overview: {
          total_transactions: totalTransactions,
          total_amount: parseInt(totalAmount.dataValues.total_amount) || 0,
        },
        by_type: transactionsByType,
        by_currency: transactionsByCurrency,
        top_transactions: topTransactions,
        daily_stats: dailyStats,
      };
    } catch (error) {
      throw error;
    }
  }

  // Xuất báo cáo giao dịch
  async exportTransactions(filters = {}) {
    try {
      const whereClause = {};

      if (filters.user_id) {
        whereClause.user_id = filters.user_id;
      }
      if (filters.type) {
        whereClause.type = filters.type;
      }
      if (filters.start_date && filters.end_date) {
        whereClause.created_at = {
          [Op.between]: [
            new Date(filters.start_date),
            new Date(filters.end_date),
          ],
        };
      }

      const transactions = await Transaction.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["username", "email"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return transactions.map((t) => ({
        id: t.id,
        user_id: t.user_id,
        username: t.user?.username,
        email: t.user?.email,
        type: t.type,
        amount: t.amount,
        currency_type: t.currency_type,
        status: t.status,
        note: t.note,
        created_at: t.created_at,
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminTransactionService();
