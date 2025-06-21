const DataTypes = require("sequelize");
const sequelize = require("../config/postgres");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    elo: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    win_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lose_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    star: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

User.beforeUpdate((user) => {
  user.updated_at = new Date();
});

module.exports = User;
