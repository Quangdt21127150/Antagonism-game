// models/Skin.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const Skin = sequelize.define("Skin", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM("piece", "board", "background", "effect"), allowNull: false },
  image_url: { type: DataTypes.STRING },
  price_coin: { type: DataTypes.INTEGER, defaultValue: 0 }, // <--- thêm trường này
  price_gem: { type: DataTypes.INTEGER, defaultValue: 0 },  // <--- thêm trường này
  effect_url: { type: DataTypes.STRING }, // nếu là hiệu ứng
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: "skins",
  timestamps: false,
});

module.exports = Skin;