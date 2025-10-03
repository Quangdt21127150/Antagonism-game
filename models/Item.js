const DataTypes = require("sequelize");
const sequelize = require("../config/postgres");
const ItemPurchase = require("./ItemPurchase");

const Item = sequelize.define(
  "Item",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    type: {
      type: DataTypes.ENUM(
        "skin",
        "pet",
        "title",
        "booster",
        "coin_pack",
        "gem_pack"
      ),
      allowNull: false,
    },
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    price_type: {
      type: DataTypes.ENUM("coin", "gem", "real_money"),
      allowNull: false,
    },
    icon: { type: DataTypes.STRING },
    discount: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0.0 },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "items",
    timestamps: false,
  }
);


module.exports = Item;
