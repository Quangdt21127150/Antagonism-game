const DataTypes = require("sequelize");
const sequelize = require("../config/postgres");

const UserCode = sequelize.define(
  "UserCode",
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
    code_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "codes",
        key: "id",
      },
    },
    used_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "user_codes",
    timestamps: false,
  }
);

// Association để lấy thông tin code khi truy vấn lịch sử
const Code = require("./Code");
UserCode.belongsTo(Code, { foreignKey: "code_id" });

module.exports = UserCode;
