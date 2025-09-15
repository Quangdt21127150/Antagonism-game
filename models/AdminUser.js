const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const AdminUser = sequelize.define(
  "AdminUser",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    role: {
      type: DataTypes.ENUM("superadmin", "admin", "editor"),
      defaultValue: "admin",
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "admin_users",
    timestamps: false,
  }
);

module.exports = AdminUser;
