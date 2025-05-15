const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");
const Match = require("./Match");

const MatchHistory = sequelize.define(
  "MatchHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    match_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "matches",
        key: "id",
      },
    },
    content: {
      type: DataTypes.JSONB,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "match_histories",
    timestamps: false,
  }
);

MatchHistory.belongsTo(Match, { foreignKey: "match_id", as: "match" });

module.exports = MatchHistory;
