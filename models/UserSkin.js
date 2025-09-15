// models/UserSkin.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const UserSkin = sequelize.define("UserSkin", {
  user_id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  skin_id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  unlocked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "user_skins",
  timestamps: false,
});

module.exports = UserSkin;