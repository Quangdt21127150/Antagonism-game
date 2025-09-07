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
      allowNull: true, // Cho phép null
      unique: true,
    },
    password: {
      type: DataTypes.TEXT, // Thay đổi từ STRING thành TEXT
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    facebook_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    avatar_url: {
      type: DataTypes.TEXT, // Thay đổi từ STRING thành TEXT
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
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
    total_matches: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    wins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    losses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    win_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.0,
    },
    star: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    coin: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isAdmin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // false là client, true là admin
    },
    is_banned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    selected_piece_skin: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    selected_board_skin: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    selected_background_skin: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    selected_effect_skin: {
      type: DataTypes.UUID,
      allowNull: true,
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
