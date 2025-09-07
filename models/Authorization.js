const DataTypes = require("sequelize");
const sequelize = require("../config/postgres");
const User = require("./User");

const Authorization = sequelize.define(
  "Authorization",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID, // Sửa từ STRING thành UUID
      allowNull: false,
      unique: true,
    },
    access_token: {
      type: DataTypes.TEXT, // Thay đổi từ STRING thành TEXT
    },
    refresh_token: {
      type: DataTypes.TEXT, // Thay đổi từ STRING thành TEXT
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "authorization",
    timestamps: false,
  }
);

Authorization.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = Authorization;
