const Item = require("../models/Item");
const ItemPurchase = require("../models/ItemPurchase");

// Định nghĩa quan hệ giữa Item và ItemPurchase
Item.hasMany(ItemPurchase, { foreignKey: "item_id", as: "purchases" });
ItemPurchase.belongsTo(Item, { foreignKey: "item_id", as: "item" });
