const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");
const ShopPackage = require("./ShopPackage");
const User = require("./User");

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: { type: DataTypes.UUID, allowNull: false },
    package_id: { type: DataTypes.UUID, allowNull: true }, // Optional for rank matches
    match_id: { type: DataTypes.UUID, allowNull: true }, // For rank match transactions
    transaction_type: {
      type: DataTypes.ENUM(
        "package_purchase",
        "rank_match_fee",
        "rank_match_refund",
        "code_reward"
      ),
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    currency_type: {
      type: DataTypes.ENUM("coin", "gem"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "success", "failed", "cancelled"),
      defaultValue: "pending",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
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
    tableName: "transactions",
    timestamps: false,
  }
);

Transaction.belongsTo(ShopPackage, {
  foreignKey: "package_id",
  as: "package",
});

Transaction.belongsTo(User, { foreignKey: "user_id", as: "user" });

module.exports = Transaction;
