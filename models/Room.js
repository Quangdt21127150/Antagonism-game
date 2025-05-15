const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");
const Match = require("./Match");
const User = require("./User");

const Room = sequelize.define(
  "Room",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Match,
        key: "id",
      },
    },
    password: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "rooms",
    timestamps: false,
  }
);

Room.belongsTo(User, { foreignKey: "owner_id", as: "user" });
Room.belongsTo(Match, { foreignKey: "match_id", as: "match" });

module.exports = Room;
