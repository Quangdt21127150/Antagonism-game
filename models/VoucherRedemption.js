const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const VoucherRedemption = sequelize.define(
  "VoucherRedemption",
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
    voucher_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Vouchers",
        key: "id",
      },
    },
    stars_added: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    redeemed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "voucher_redemptions",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "voucher_id"],
        name: "unique_user_voucher_redemption",
      },
    ],
  }
);

module.exports = VoucherRedemption;
