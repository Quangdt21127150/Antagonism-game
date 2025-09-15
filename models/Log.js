const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const Log = sequelize.define(
  "Log",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    admin_id: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false }, // create, update, delete, ban, etc.
    target_type: { type: DataTypes.STRING, allowNull: false }, // user, skin, transaction, etc.
    target_id: { type: DataTypes.STRING, allowNull: false }, // ID của đối tượng bị tác động
    details: { type: DataTypes.TEXT }, // Chi tiết thay đổi (JSON string)
    ip_address: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "admin_logs",
    timestamps: false,
  }
);

module.exports = Log;
