const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");
const User = require("./User");

const FriendRequest = sequelize.define(
  "FriendRequest",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    receiver_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      allowNull: false,
      defaultValue: "pending",
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
    tableName: "friend_requests",
    timestamps: false,
  }
);

FriendRequest.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
FriendRequest.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });

FriendRequest.beforeUpdate((friendRequest) => {
  friendRequest.updated_at = new Date();
});

module.exports = FriendRequest;
