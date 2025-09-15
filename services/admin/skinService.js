const Skin = require("../../models/Skin");
const Log = require("../../models/Log");
const { Op } = require("sequelize");

class AdminSkinService {
  // Lấy danh sách skin với filter và pagination
  async getSkins(page = 1, limit = 20, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filter theo tên
      if (filters.name) {
        whereClause.name = { [Op.iLike]: `%${filters.name}%` };
      }

      // Filter theo type
      if (filters.type) {
        whereClause.type = filters.type;
      }

      // Filter theo trạng thái active
      if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active;
      }

      const { count, rows: skins } = await Skin.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit,
        offset,
      });

      return {
        skins,
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

  // Tạo skin mới
  async createSkin(skinData, adminId, ipAddress) {
    try {
      const {
        name,
        type,
        image_url,
        price_coin,
        price_gem,
        description,
        is_active,
      } = skinData;

      // Kiểm tra tên skin đã tồn tại
      const existingSkin = await Skin.findOne({ where: { name } });
      if (existingSkin) {
        throw new Error("Tên skin đã tồn tại");
      }

      const skin = await Skin.create({
        name,
        type: type || "piece",
        image_url,
        price_coin: price_coin || 0,
        price_gem: price_gem || 0,
        description,
        is_active: is_active !== undefined ? is_active : true,
      });

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "create_skin",
        target_type: "skin",
        target_id: skin.id,
        details: JSON.stringify({
          name: skin.name,
          type: skin.type,
          price_coin: skin.price_coin,
          price_gem: skin.price_gem,
        }),
        ip_address: ipAddress,
      });

      return skin;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật skin
  async updateSkin(skinId, updates, adminId, ipAddress) {
    try {
      const skin = await Skin.findByPk(skinId);
      if (!skin) {
        throw new Error("Skin không tồn tại");
      }

      const oldValues = {
        name: skin.name,
        type: skin.type,
        price_coin: skin.price_coin,
        price_gem: skin.price_gem,
        is_active: skin.is_active,
      };

      // Cập nhật các trường
      await skin.update(updates);

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "update_skin",
        target_type: "skin",
        target_id: skinId.toString(),
        details: JSON.stringify({
          skin_name: skin.name,
          old_values: oldValues,
          new_values: {
            name: skin.name,
            type: skin.type,
            price_coin: skin.price_coin,
            price_gem: skin.price_gem,
            is_active: skin.is_active,
          },
        }),
        ip_address: ipAddress,
      });

      return skin;
    } catch (error) {
      throw error;
    }
  }

  // Xóa skin
  async deleteSkin(skinId, adminId, ipAddress) {
    try {
      const skin = await Skin.findByPk(skinId);
      if (!skin) {
        throw new Error("Skin không tồn tại");
      }

      const skinInfo = {
        id: skin.id,
        name: skin.name,
        type: skin.type,
      };

      await skin.destroy();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "delete_skin",
        target_type: "skin",
        target_id: skinId.toString(),
        details: JSON.stringify(skinInfo),
        ip_address: ipAddress,
      });

      return { message: "Xóa skin thành công" };
    } catch (error) {
      throw error;
    }
  }

  // Bật/tắt hiển thị skin trong shop
  async toggleSkinActive(skinId, adminId, ipAddress) {
    try {
      const skin = await Skin.findByPk(skinId);
      if (!skin) {
        throw new Error("Skin không tồn tại");
      }

      const oldStatus = skin.is_active;
      skin.is_active = !skin.is_active;
      await skin.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: skin.is_active ? "activate_skin" : "deactivate_skin",
        target_type: "skin",
        target_id: skinId.toString(),
        details: JSON.stringify({
          skin_name: skin.name,
          old_status: oldStatus,
          new_status: skin.is_active,
        }),
        ip_address: ipAddress,
      });

      return {
        message: skin.is_active ? "Đã kích hoạt skin" : "Đã ẩn skin",
        skin: {
          id: skin.id,
          name: skin.name,
          is_active: skin.is_active,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê skin
  async getSkinStats() {
    try {
      const totalSkins = await Skin.count();
      const activeSkins = await Skin.count({ where: { is_active: true } });
      const inactiveSkins = totalSkins - activeSkins;

      // Thống kê theo type
      const skinTypes = await Skin.findAll({
        attributes: [
          "type",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["type"],
      });

      // Top 5 skin có giá cao nhất
      const expensiveSkins = await Skin.findAll({
        attributes: ["id", "name", "price_coin", "price_gem"],
        order: [
          [
            require("sequelize").fn(
              "GREATEST",
              require("sequelize").col("price_coin"),
              require("sequelize").col("price_gem")
            ),
            "DESC",
          ],
        ],
        limit: 5,
      });

      return {
        overview: {
          total_skins: totalSkins,
          active_skins: activeSkins,
          inactive_skins: inactiveSkins,
        },
        by_type: skinTypes,
        expensive_skins: expensiveSkins,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminSkinService();
