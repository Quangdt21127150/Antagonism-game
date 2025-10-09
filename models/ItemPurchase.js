const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");
const Item = require("./Item");
const User = require("./User");

const ItemPurchase = sequelize.define(
  "ItemPurchase",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    item_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Item,
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    stars_spent: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    coins_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_equipped: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    purchased_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "item_purchases",
    timestamps: false,
  }
);

module.exports = ItemPurchase;
