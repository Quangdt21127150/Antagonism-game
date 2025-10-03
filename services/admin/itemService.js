const Item = require("../../models/Item");
const Log = require("../../models/Log");
const ItemPurchase = require("../../models/ItemPurchase");
const User = require("../../models/User");
const sequelize = require("../../config/postgres");

class AdminItemService {
  async createItem(itemData, adminId, imagePath) {
    try {
      const { name, type, price, price_type, number, discount, is_active } =
        itemData;

      // Kiểm tra trùng tên
      const existingItem = await Item.findOne({ where: { name } });
      if (existingItem) {
        throw new Error("Tên item đã tồn tại");
      }

      // Tạo item mới
      const item = await Item.create({
        name,
        type,
        price,
        price_type,
        number,
        image: imagePath, // Đường dẫn ảnh từ Cloudinary
        discount: discount || 0,
        is_active: is_active !== undefined ? is_active : true,
      });

      // Ghi log admin
      await Log.create({
        admin_id: adminId,
        action: "create_item",
        target_type: "item",
        target_id: item.id,
        details: JSON.stringify({
          name: item.name,
          type: item.type,
          price: item.price,
          price_type: item.price_type,
          number: item.number,
        }),
      });

      return item;
    } catch (error) {
      throw error;
    }
  }

  async updateItem(itemId, itemData, imagePath) {
    try {
      const { name, type, price, price_type, number, discount, is_active } =
        itemData;

      // Tìm item
      const item = await Item.findByPk(itemId);
      if (!item) {
        throw new Error("Item không tồn tại");
      }

      // Cập nhật item
      await item.update({
        name: name || item.name,
        type: type || item.type,
        price: price || item.price,
        price_type: price_type || item.price_type,
        number: number || item.number,
        image: imagePath || item.image,
        discount: discount !== undefined ? discount : item.discount,
        is_active: is_active !== undefined ? is_active : item.is_active,
      });

      return item;
    } catch (error) {
      throw error;
    }
  }

  async deleteItem(item_id) {
    try {
      // Tìm item
      const item = await Item.findByPk(item_id);
      if (!item) {
        throw new Error("Item không tồn tại");
      }

      // Xóa item
      await item.destroy();
    } catch (error) {
      throw error;
    }
  }

  async purchaseItem(userId, itemId, quantity) {
    const transaction = await sequelize.transaction();

    try {
      // Tìm item
      const item = await Item.findByPk(itemId, { transaction });
      if (!item) {
        throw new Error("Item không tồn tại");
      }

      // Kiểm tra số lượng item còn lại
      if (item.number < quantity) {
        throw new Error(`Chỉ còn ${item.number} item, không đủ để mua`);
      }

      // Tìm user
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error("User không tồn tại");
      }

      // Tính toán chi phí
      const totalStarsNeeded = item.price * quantity;

      // Kiểm tra số dư stars của user
      if (user.star < totalStarsNeeded) {
        throw new Error(
          `Không đủ stars. Cần ${totalStarsNeeded}, hiện có ${user.star}`
        );
      }

      // Trừ stars và cộng coins cho user
      user.star -= totalStarsNeeded;
      user.coin += Math.floor(totalStarsNeeded * 0.1); // 10% stars thành coins
      await user.save({ transaction });

      // Giảm số lượng item
      item.number -= quantity;
      await item.save({ transaction });

      // Tạo bản ghi mua item
      const purchase = await ItemPurchase.create(
        {
          user_id: userId,
          item_id: itemId,
          quantity,
          stars_spent: totalStarsNeeded,
          coins_earned: Math.floor(totalStarsNeeded * 0.1),
        },
        { transaction }
      );

      await transaction.commit();

      return purchase;
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async getPurchaseHistory(userId) {
    try {
      const purchases = await ItemPurchase.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Item,
            as: "item",
            attributes: ["id", "name", "price", "image"],
          },
        ],
        order: [["purchased_at", "DESC"]],
      });

      return purchases;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminItemService();
