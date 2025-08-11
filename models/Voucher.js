const { DataTypes } = require("sequelize");
const sequelize = require("../config/postgres");

const Voucher = sequelize.define("Voucher", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  validDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  expireDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  redeemedUsers: {
    type: DataTypes.ARRAY(DataTypes.STRING), // store user IDs
    defaultValue: [],
  },
});

module.exports = Voucher;
