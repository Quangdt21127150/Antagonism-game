const Item = require("../models/Item");
const ItemPurchase = require("../models/ItemPurchase");
const User = require("../models/User");

// Định nghĩa quan hệ giữa Item và ItemPurchase
Item.hasMany(ItemPurchase, { foreignKey: "item_id", as: "purchases" });
ItemPurchase.belongsTo(Item, { foreignKey: "item_id", as: "item" });

// Định nghĩa quan hệ giữa User và ItemPurchase
User.hasMany(ItemPurchase, { foreignKey: "user_id", as: "purchases" });
ItemPurchase.belongsTo(User, { foreignKey: "user_id", as: "user" });
