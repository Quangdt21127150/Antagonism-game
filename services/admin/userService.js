const User = require("../../models/User");
const Log = require("../../models/Log");
const { Op } = require("sequelize");
const { getLevelFromElo } = require("../rankServices");

class AdminUserService {
  // Lấy danh sách user với filter và pagination
  async getUsers(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter theo username
      if (filters.username) {
        whereClause.username = { [Op.iLike]: `%${filters.username}%` };
      }

      // Filter theo email
      if (filters.email) {
        whereClause.email = { [Op.iLike]: `%${filters.email}%` };
      }

      // Filter theo level - sẽ được xử lý sau khi lấy data
      // Filter theo trạng thái ban
      if (filters.is_banned !== undefined) {
        whereClause.is_banned = filters.is_banned;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        attributes: [
          "id",
          "username",
          "email",
          "coin",
          "gem",
          "elo",
          "is_banned",
          "created_at",
          "updated_at",
          "total_matches",
          "win_rate",
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      // Thêm level vào mỗi user
      const usersWithLevel = users.map((user) => {
        const userData = user.toJSON();
        return {
          ...userData,
          level: getLevelFromElo(userData.elo),
          last_login: userData.updated_at, // Sử dụng updated_at thay cho last_login
        };
      });

      // Filter theo level nếu có
      let filteredUsers = usersWithLevel;
      if (filters.level) {
        filteredUsers = usersWithLevel.filter(
          (user) => user.level === parseInt(filters.level)
        );
      }

      return {
        users: filteredUsers,
        pagination: {
          page,
          limit,
          total: filteredUsers.length,
          totalPages: Math.ceil(filteredUsers.length / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin chi tiết user
  async getUserDetail(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: [
          "id",
          "username",
          "email",
          "coin",
          "gem",
          "elo",
          "is_banned",
          "created_at",
          "updated_at",
          "total_matches",
          "win_rate",
        ],
      });

      if (!user) {
        throw new Error("User không tồn tại");
      }

      const userData = user.toJSON();
      return {
        ...userData,
        level: getLevelFromElo(userData.elo),
        last_login: userData.updated_at, // Sử dụng updated_at thay cho last_login
      };
    } catch (error) {
      throw error;
    }
  }

  // Ban/Unban user
  async toggleBanUser(userId, adminId, ipAddress) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      user.is_banned = !user.is_banned;
      await user.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: user.is_banned ? "ban_user" : "unban_user",
        target_type: "user",
        target_id: userId.toString(),
        details: JSON.stringify({
          username: user.username,
          is_banned: user.is_banned,
        }),
        ip_address: ipAddress,
      });

      return {
        message: user.is_banned ? "Đã khóa user" : "Đã mở khóa user",
        user: {
          id: user.id,
          username: user.username,
          is_banned: user.is_banned,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật coin/gem cho user
  async updateUserCurrency(userId, updates, adminId, ipAddress) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      const oldValues = {
        coin: user.coin,
        gem: user.gem,
      };

      // Cập nhật coin/gem
      if (updates.coin !== undefined) {
        user.coin = updates.coin;
      }
      if (updates.gem !== undefined) {
        user.gem = updates.gem;
      }

      await user.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "update_user_currency",
        target_type: "user",
        target_id: userId.toString(),
        details: JSON.stringify({
          username: user.username,
          old_values: oldValues,
          new_values: { coin: user.coin, gem: user.gem },
          reason: updates.reason || "Admin update",
        }),
        ip_address: ipAddress,
      });

      return {
        message: "Cập nhật thành công",
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

  // Cập nhật ELO cho user
  async updateUserElo(userId, newElo, adminId, ipAddress) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("User không tồn tại");
      }

      const oldElo = user.elo;
      user.elo = Math.max(1000, Math.min(3000, newElo)); // Giới hạn ELO 1000-3000
      await user.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "update_user_elo",
        target_type: "user",
        target_id: userId.toString(),
        details: JSON.stringify({
          username: user.username,
          old_elo: oldElo,
          new_elo: user.elo,
        }),
        ip_address: ipAddress,
      });

      return {
        message: "Cập nhật ELO thành công",
        user: {
          id: user.id,
          username: user.username,
          elo: user.elo,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê user
  async getUserStats() {
    try {
      const totalUsers = await User.count();
      const bannedUsers = await User.count({ where: { is_banned: true } });
      const activeUsers = totalUsers - bannedUsers;

      // Top 10 user theo ELO
      const topEloUsers = await User.findAll({
        attributes: ["id", "username", "elo", "level"],
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

      // Tổng coin và gem trong hệ thống
      const totalStats = await User.findOne({
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

      return {
        overview: {
          total_users: totalUsers,
          active_users: activeUsers,
          banned_users: bannedUsers,
        },
        currency: {
          total_coin: parseInt(totalStats.dataValues.total_coin) || 0,
          total_gem: parseInt(totalStats.dataValues.total_gem) || 0,
        },
        top_users: {
          by_elo: topEloUsers,
          by_coin: topCoinUsers,
          by_gem: topGemUsers,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminUserService();
