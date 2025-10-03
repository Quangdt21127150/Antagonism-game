const Code = require("../../models/Code");
const UserCode = require("../../models/UserCode");
const User = require("../../models/User");
const Log = require("../../models/Log");
const { Op } = require("sequelize");

class AdminCodeService {
  // Lấy danh sách code với filter và pagination
  async getCodes(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter theo code
      if (filters.code) {
        whereClause.code = { [Op.iLike]: `%${filters.code}%` };
      }

      // Filter theo trạng thái active
      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active;
      }

      // Filter theo loại code
      if (filters.code_type) {
        whereClause.code_type = filters.code_type;
      }

      const { count, rows: codes } = await Code.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      return {
        codes,
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

  // Tạo code mới
  async createCode(codeData, adminId, ipAddress) {
    try {
      const {
        code,
        gem_amount,
        coin_amount,
        max_uses,
        expires_at,
        code_type,
        description,
      } = codeData;

      // Kiểm tra code đã tồn tại
      const existingCode = await Code.findOne({ where: { code } });
      if (existingCode) {
        throw new Error("Code đã tồn tại");
      }

      const newCode = await Code.create({
        code,
        gem_amount: gem_amount || 0,
        coin_amount: coin_amount || 0,
        max_uses: max_uses || 1,
        current_uses: 0,
        is_active: true,
        expires_at: expires_at ? new Date(expires_at) : null,
        code_type: code_type || "gift",
        description: description || "",
      });

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "create_code",
        target_type: "code",
        target_id: newCode.id.toString(),
        details: JSON.stringify({
          code: newCode.code,
          gem_amount: newCode.gem_amount,
          coin_amount: newCode.coin_amount,
          max_uses: newCode.max_uses,
          expires_at: newCode.expires_at,
        }),
        ip_address: ipAddress,
      });

      return newCode;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật code
  async updateCode(codeId, updates, adminId, ipAddress) {
    try {
      const code = await Code.findByPk(codeId);
      if (!code) {
        throw new Error("Code không tồn tại");
      }

      const oldValues = {
        gem_amount: code.gem_amount,
        coin_amount: code.coin_amount,
        max_uses: code.max_uses,
        is_active: code.is_active,
        expires_at: code.expires_at,
      };

      // Cập nhật các trường
      await code.update(updates);

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "update_code",
        target_type: "code",
        target_id: codeId.toString(),
        details: JSON.stringify({
          code: code.code,
          old_values: oldValues,
          new_values: {
            gem_amount: code.gem_amount,
            coin_amount: code.coin_amount,
            max_uses: code.max_uses,
            is_active: code.is_active,
            expires_at: code.expires_at,
          },
        }),
        ip_address: ipAddress,
      });

      return code;
    } catch (error) {
      throw error;
    }
  }

  // Xóa code
  async deleteCode(codeId, adminId, ipAddress) {
    try {
      const code = await Code.findByPk(codeId);
      if (!code) {
        throw new Error("Code không tồn tại");
      }

      const codeInfo = {
        id: code.id,
        code: code.code,
        current_uses: code.current_uses,
      };

      await code.destroy();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "delete_code",
        target_type: "code",
        target_id: codeId.toString(),
        details: JSON.stringify(codeInfo),
        ip_address: ipAddress,
      });

      return { message: "Xóa code thành công" };
    } catch (error) {
      throw error;
    }
  }

  // Bật/tắt code
  async toggleCodeActive(codeId, adminId, ipAddress) {
    try {
      const code = await Code.findByPk(codeId);
      if (!code) {
        throw new Error("Code không tồn tại");
      }

      const oldStatus = code.is_active;
      code.is_active = !code.is_active;
      await code.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: code.is_active ? "activate_code" : "deactivate_code",
        target_type: "code",
        target_id: codeId.toString(),
        details: JSON.stringify({
          code: code.code,
          old_status: oldStatus,
          new_status: code.is_active,
        }),
        ip_address: ipAddress,
      });

      return {
        message: code.is_active ? "Đã kích hoạt code" : "Đã ẩn code",
        code: {
          id: code.id,
          code: code.code,
          is_active: code.is_active,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy lịch sử sử dụng code
  async getCodeUsageHistory(codeId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows: usages } = await UserCode.findAndCountAll({
        where: { code_id: codeId },
        include: [
          {
            model: Code,
            attributes: ["code", "gem_amount", "coin_amount"],
          },
          {
            model: User,
            attributes: ["id", "username", "email"],
          },
        ],
        order: [["used_at", "DESC"]],
        limit,
        offset,
      });

      return {
        usages,
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

  // Thống kê code
  async getCodeStats() {
    try {
      const totalCodes = await Code.count();
      const activeCodes = await Code.count({ where: { is_active: true } });
      const inactiveCodes = totalCodes - activeCodes;

      // Thống kê theo type
      const codesByType = await Code.findAll({
        attributes: [
          "code_type",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["code_type"],
      });

      // Top 5 code được sử dụng nhiều nhất
      const topUsedCodes = await Code.findAll({
        attributes: ["id", "code", "current_uses", "max_uses"],
        order: [["current_uses", "DESC"]],
        limit: 5,
      });

      // Tổng số lần sử dụng code
      const totalUses = await Code.findOne({
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

      // Thống kê theo ngày (7 ngày gần nhất)
      const dailyUsage = await UserCode.findAll({
        attributes: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("used_at")
            ),
            "date",
          ],
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        where: {
          used_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        group: [
          require("sequelize").fn("DATE", require("sequelize").col("used_at")),
        ],
        order: [
          [
            require("sequelize").fn(
              "DATE",
              require("sequelize").col("used_at")
            ),
            "DESC",
          ],
        ],
      });

      return {
        overview: {
          total_codes: totalCodes,
          active_codes: activeCodes,
          inactive_codes: inactiveCodes,
          total_uses: parseInt(totalUses.dataValues.total_uses) || 0,
        },
        by_type: codesByType,
        top_used_codes: topUsedCodes,
        daily_usage: dailyUsage,
      };
    } catch (error) {
      throw error;
    }
  }

  // Tạo code hàng loạt
  async createBulkCodes(codeData, quantity, adminId, ipAddress) {
    try {
      const codes = [];
      const {
        prefix,
        gem_amount,
        coin_amount,
        max_uses,
        expires_at,
        code_type,
        description,
      } = codeData;

      for (let i = 0; i < quantity; i++) {
        const code = `${prefix}${Date.now()}${Math.random()
          .toString(36)
          .substr(2, 5)
          .toUpperCase()}`;

        const newCode = await Code.create({
          code,
          gem_amount: gem_amount || 0,
          coin_amount: coin_amount || 0,
          max_uses: max_uses || 1,
          current_uses: 0,
          is_active: true,
          expires_at: expires_at ? new Date(expires_at) : null,
          code_type: code_type || "gift",
          description: description || "",
        });

        codes.push(newCode);
      }

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "create_bulk_codes",
        target_type: "code",
        target_id: "bulk",
        details: JSON.stringify({
          quantity,
          prefix,
          gem_amount,
          coin_amount,
          max_uses,
        }),
        ip_address: ipAddress,
      });

      return {
        message: `Đã tạo ${quantity} code thành công`,
        codes: codes.map((c) => ({
          id: c.id,
          code: c.code,
          gem_amount: c.gem_amount,
          coin_amount: c.coin_amount,
        })),
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminCodeService();
