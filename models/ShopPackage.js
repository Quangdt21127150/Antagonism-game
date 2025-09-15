const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const ShopPackage = sequelize.define(
  "ShopPackage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    coin_amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bonus_amount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    price_display: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price_vnd: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
    },
    order_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    type: {
      type: DataTypes.ENUM("gem", "coin"),
      defaultValue: "coin",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "shop_packages",
    timestamps: false,
  }
);

module.exports = ShopPackage;
