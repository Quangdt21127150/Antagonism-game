const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    order_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    request_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    amount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    stars_to_add: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "momo",
    },
    status: {
      type: DataTypes.ENUM,
      values: ["pending", "completed", "failed", "cancelled"],
      defaultValue: "pending",
    },
    momo_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    momo_response: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "payments",
    timestamps: false,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["order_id"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

module.exports = Payment;
