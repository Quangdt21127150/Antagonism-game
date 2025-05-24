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
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    access_token: {
      type: DataTypes.STRING,
    },
    refresh_token: {
      type: DataTypes.STRING,
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
