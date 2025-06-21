const DataTypes = require("sequelize");
const sequelize = require("../config/postgres");
const User = require("./User");

const Match = sequelize.define(
  "Match",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    white_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    black_id: {
      type: DataTypes.UUID,
      references: {
        model: User,
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("waiting", "ongoing", "win", "draw", "lose"),
      allowNull: false,
      defaultValue: "waiting",
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    match_type: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "matches",
    timestamps: false,
  }
);

Match.belongsTo(User, { foreignKey: "white_id", as: "white" });
Match.belongsTo(User, { foreignKey: "black_id", as: "black" });

module.exports = Match;
