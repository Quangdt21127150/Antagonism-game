const Code = require("../models/Code");
const UserCode = require("../models/UserCode");
const User = require("../models/User");
const sequelize = require("../config/postgres");
const { getLevelFromElo } = require("./rankServices");

class CodeService {
  // Tạo code mới
  async createCode(codeData) {
    try {
      const code = await Code.create({
        code: codeData.code,
        gem_amount: codeData.gem_amount || 0,
        elo_amount: codeData.elo_amount || 0,
        max_uses: codeData.max_uses || 1,
        expires_at: codeData.expires_at || null,
      });
      return code;
    } catch (error) {
      throw new Error(`Lỗi tạo code: ${error.message}`);
    }
  }

  // Sử dụng code
  async useCode(userId, codeString) {
    const transaction = await sequelize.transaction();

    try {
      // Tìm code
      const code = await Code.findOne({
        where: { code: codeString, is_active: true },
        lock: true,
        transaction,
      });

      if (!code) {
        throw new Error("Code không tồn tại hoặc đã bị vô hiệu hóa");
      }

      // Kiểm tra hết hạn
      if (code.expires_at && new Date() > code.expires_at) {
        throw new Error("Code đã hết hạn");
      }

      // Kiểm tra số lượt sử dụng
      if (code.current_uses >= code.max_uses) {
        throw new Error("Code đã hết lượt sử dụng");
      }

      // Kiểm tra user đã sử dụng code này chưa
      const userCode = await UserCode.findOne({
        where: { user_id: userId, code_id: code.id },
        transaction,
      });

      if (userCode) {
        throw new Error("Bạn đã sử dụng code này rồi");
      }

      // Lấy thông tin user
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error("User không tồn tại");
      }

      // Cập nhật gem và ELO cho user
      const oldElo = user.elo;
      const oldGem = user.gem;

      user.gem += code.gem_amount;
      user.elo += code.elo_amount;

      // Giới hạn ELO ẩn từ 1000-3000
      if (user.elo < 1000) user.elo = 1000;
      if (user.elo > 3000) user.elo = 3000;

      await user.save({ transaction });

      // Tăng số lượt sử dụng của code
      code.current_uses += 1;
      await code.save({ transaction });

      // Lưu lịch sử sử dụng
      await UserCode.create(
        {
          user_id: userId,
          code_id: code.id,
        },
        { transaction }
      );

      // Kiểm tra lên cấp
      const newLevel = getLevelFromElo(user.elo);
      const oldLevel = getLevelFromElo(oldElo);

      let promotionReward = 0;
      if (newLevel > oldLevel) {
        // Tính thưởng lên cấp theo rankServices
        const { rewards } = require("./rankServices");
        promotionReward = rewards[newLevel]?.gem || 0;
        user.gem += promotionReward;
        await user.save({ transaction });
      }

      await transaction.commit();

      return {
        success: true,
        message: `Sử dụng code thành công!`,
        rewards: {
          gem_added: code.gem_amount,
          elo_added: code.elo_amount,
          promotion_gem: promotionReward,
          new_level: newLevel,
          old_level: oldLevel,
        },
        user: {
          gem: user.gem,
          elo: user.elo,
          level: newLevel,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Lỗi sử dụng code: ${error.message}`);
    }
  }

  // Lấy danh sách code (cho admin)
  async getAllCodes() {
    try {
      const codes = await Code.findAll({
        order: [["created_at", "DESC"]],
      });
      return codes;
    } catch (error) {
      throw new Error(`Lỗi lấy danh sách code: ${error.message}`);
    }
  }

  // Vô hiệu hóa code
  async deactivateCode(codeId) {
    try {
      const code = await Code.findByPk(codeId);
      if (!code) {
        throw new Error("Code không tồn tại");
      }

      code.is_active = false;
      await code.save();

      return { success: true, message: "Đã vô hiệu hóa code" };
    } catch (error) {
      throw new Error(`Lỗi vô hiệu hóa code: ${error.message}`);
    }
  }

  // Lấy lịch sử sử dụng code của user
  async getUserCodeHistory(userId) {
    try {
      const history = await UserCode.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Code,
            attributes: ["code", "gem_amount", "elo_amount"],
          },
        ],
        order: [["used_at", "DESC"]],
      });
      return history;
    } catch (error) {
      throw new Error(`Lỗi lấy lịch sử code: ${error.message}`);
    }
  }
}

module.exports = new CodeService();
