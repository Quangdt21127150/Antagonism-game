const User = require("../../models/User");
const Transaction = require("../../models/Transaction");
const Code = require("../../models/Code");
const Skin = require("../../models/Skin");
const Match = require("../../models/Match");
const Log = require("../../models/Log");
const { Op } = require("sequelize");

class AdminReportService {
  // Thống kê tổng quan
  async getOverviewStats() {
    try {
      // Thống kê user
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { is_banned: false } });
      const bannedUsers = totalUsers - activeUsers;
      const newUsersToday = await User.count({
        where: {
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      // Thống kê tiền tệ
      const currencyStats = await User.findOne({
        attributes: [
          [
            require("sequelize").fn("SUM", require("sequelize").col("coin")),
            "total_coin",
          ],
          [
            require("sequelize").fn("SUM", require("sequelize").col("gem")),
            "total_gem",
          ],
        ],
      });

      // Thống kê giao dịch
      const totalTransactions = await Transaction.count();
      const todayTransactions = await Transaction.count({
        where: {
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      // Thống kê code
      const totalCodes = await Code.count();
      const activeCodes = await Code.count({ where: { is_active: true } });
      const totalCodeUses = await Code.findOne({
        attributes: [
          [
            require("sequelize").fn(
              "SUM",
              require("sequelize").col("current_uses")
            ),
            "total_uses",
          ],
        ],
      });

      // Thống kê skin
      const totalSkins = await Skin.count();
      const activeSkins = await Skin.count({ where: { is_active: true } });

      // Thống kê match
      const totalMatches = await Match.count();
      const todayMatches = await Match.count({
        where: {
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      });

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers,
          new_today: newUsersToday,
        },
        currency: {
          total_coin: parseInt(currencyStats.dataValues.total_coin) || 0,
          total_gem: parseInt(currencyStats.dataValues.total_gem) || 0,
        },
        transactions: {
          total: totalTransactions,
          today: todayTransactions,
        },
        codes: {
          total: totalCodes,
          active: activeCodes,
          total_uses: parseInt(totalCodeUses.dataValues.total_uses) || 0,
        },
        skins: {
          total: totalSkins,
          active: activeSkins,
        },
        matches: {
          total: totalMatches,
          today: todayMatches,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê user theo level
  async getUserLevelStats() {
    try {
      const levelStats = await User.findAll({
        attributes: [
          "level",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["level"],
        order: [["level", "ASC"]],
      });

      // Top 10 user theo ELO
      const topEloUsers = await User.findAll({
        attributes: [
          "id",
          "username",
          "elo",
          "level",
          "total_matches",
          "win_rate",
        ],
        order: [["elo", "DESC"]],
        limit: 10,
      });

      // Top 10 user theo coin
      const topCoinUsers = await User.findAll({
        attributes: ["id", "username", "coin"],
        order: [["coin", "DESC"]],
        limit: 10,
      });

      // Top 10 user theo gem
      const topGemUsers = await User.findAll({
        attributes: ["id", "username", "gem"],
        order: [["gem", "DESC"]],
        limit: 10,
      });

      return {
        by_level: levelStats,
        top_by_elo: topEloUsers,
        top_by_coin: topCoinUsers,
        top_by_gem: topGemUsers,
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê giao dịch theo thời gian
  async getTransactionTimeStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Thống kê theo ngày
      const dailyStats = await Transaction.findAll({
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
        where: {
          created_at: {
            [Op.gte]: startDate,
          },
        },
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
            "ASC",
          ],
        ],
      });

      // Thống kê theo type
      const typeStats = await Transaction.findAll({
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
        where: {
          created_at: {
            [Op.gte]: startDate,
          },
        },
        group: ["type"],
      });

      return {
        daily: dailyStats,
        by_type: typeStats,
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê hoạt động admin
  async getAdminActivityStats(days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Thống kê theo action
      const actionStats = await Log.findAll({
        attributes: [
          "action",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: {
          created_at: {
            [Op.gte]: startDate,
          },
        },
        group: ["action"],
        order: [
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "DESC",
          ],
        ],
      });

      // Thống kê theo admin
      const adminStats = await Log.findAll({
        attributes: [
          "admin_id",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: {
          created_at: {
            [Op.gte]: startDate,
          },
        },
        group: ["admin_id"],
        order: [
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "DESC",
          ],
        ],
      });

      // Thống kê theo ngày
      const dailyStats = await Log.findAll({
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
        ],
        where: {
          created_at: {
            [Op.gte]: startDate,
          },
        },
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
            "ASC",
          ],
        ],
      });

      return {
        by_action: actionStats,
        by_admin: adminStats,
        daily: dailyStats,
      };
    } catch (error) {
      throw error;
    }
  }

  // Báo cáo tài chính
  async getFinancialReport(startDate, endDate) {
    try {
      const whereClause = {};
      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }

      // Tổng thu nhập theo loại
      const incomeByType = await Transaction.findAll({
        attributes: [
          "type",
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: {
          ...whereClause,
          type: {
            [Op.in]: ["topup", "purchase"],
          },
        },
        group: ["type"],
      });

      // Tổng chi tiêu theo loại
      const expenseByType = await Transaction.findAll({
        attributes: [
          "type",
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: {
          ...whereClause,
          type: {
            [Op.in]: ["buy_skin", "admin_gift", "code_reward"],
          },
        },
        group: ["type"],
      });

      // Thống kê theo ngày
      const dailyStats = await Transaction.findAll({
        attributes: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("created_at")
            ),
            "date",
          ],
          [
            require("sequelize").fn("SUM", require("sequelize").col("amount")),
            "total_amount",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: whereClause,
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
            "ASC",
          ],
        ],
      });

      return {
        income_by_type: incomeByType,
        expense_by_type: expenseByType,
        daily_stats: dailyStats,
      };
    } catch (error) {
      throw error;
    }
  }

  // Xuất báo cáo Excel/CSV
  async exportReport(reportType, filters = {}) {
    try {
      let data = [];

      switch (reportType) {
        case "users":
          data = await User.findAll({
            attributes: [
              "id",
              "username",
              "email",
              "coin",
              "gem",
              "elo",
              "level",
              "is_banned",
              "created_at",
            ],
            where: filters,
            order: [["created_at", "DESC"]],
          });
          break;

        case "transactions":
          data = await Transaction.findAll({
            include: [
              {
                model: User,
                as: "user",
                attributes: ["username", "email"],
              },
            ],
            where: filters,
            order: [["created_at", "DESC"]],
          });
          break;

        case "codes":
          data = await Code.findAll({
            where: filters,
            order: [["created_at", "DESC"]],
          });
          break;

        case "skins":
          data = await Skin.findAll({
            where: filters,
            order: [["created_at", "DESC"]],
          });
          break;

        default:
          throw new Error("Loại báo cáo không hợp lệ");
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminReportService();
