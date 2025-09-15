const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminUser = require("../../models/AdminUser");
const Log = require("../../models/Log");

class AdminAuthService {
  // Đăng nhập admin
  async login(username, password, ipAddress) {
    try {
      const admin = await AdminUser.findOne({
        where: { username, is_active: true },
      });

      if (!admin) {
        throw new Error("Tài khoản không tồn tại hoặc đã bị khóa");
      }

      const isValidPassword = await bcrypt.compare(
        password,
        admin.password_hash
      );
      if (!isValidPassword) {
        throw new Error("Mật khẩu không đúng");
      }

      // Cập nhật last_login
      admin.last_login = new Date();
      await admin.save();

      // Tạo JWT token
      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          role: admin.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Ghi log đăng nhập
      await Log.create({
        admin_id: admin.id,
        action: "login",
        target_type: "admin",
        target_id: admin.id.toString(),
        details: JSON.stringify({ username: admin.username }),
        ip_address: ipAddress,
      });

      return {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          last_login: admin.last_login,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // Đăng xuất admin
  async logout(adminId, ipAddress) {
    try {
      await Log.create({
        admin_id: adminId,
        action: "logout",
        target_type: "admin",
        target_id: adminId.toString(),
        details: "Admin logged out",
        ip_address: ipAddress,
      });

      return { message: "Đăng xuất thành công" };
    } catch (error) {
      throw error;
    }
  }

  // Tạo admin mới (chỉ superadmin mới có quyền)
  async createAdmin(adminData, createdBy, ipAddress) {
    try {
      const { username, email, password, role } = adminData;

      // Kiểm tra username và email đã tồn tại
      const existingAdmin = await AdminUser.findOne({
        where: {
          [require("sequelize").Op.or]: [{ username }, { email }],
        },
      });

      if (existingAdmin) {
        throw new Error("Username hoặc email đã tồn tại");
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Tạo admin mới
      const newAdmin = await AdminUser.create({
        username,
        email,
        password_hash: passwordHash,
        role: role || "admin",
      });

      // Ghi log
      await Log.create({
        admin_id: createdBy,
        action: "create_admin",
        target_type: "admin",
        target_id: newAdmin.id.toString(),
        details: JSON.stringify({ username, email, role }),
        ip_address: ipAddress,
      });

      return {
        id: newAdmin.id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        created_at: newAdmin.created_at,
      };
    } catch (error) {
      throw error;
    }
  }

  // Đổi mật khẩu
  async changePassword(adminId, oldPassword, newPassword, ipAddress) {
    try {
      const admin = await AdminUser.findByPk(adminId);
      if (!admin) {
        throw new Error("Admin không tồn tại");
      }

      // Kiểm tra mật khẩu cũ
      const isValidOldPassword = await bcrypt.compare(
        oldPassword,
        admin.password_hash
      );
      if (!isValidOldPassword) {
        throw new Error("Mật khẩu cũ không đúng");
      }

      // Hash mật khẩu mới
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Cập nhật mật khẩu
      admin.password_hash = newPasswordHash;
      admin.updated_at = new Date();
      await admin.save();

      // Ghi log
      await Log.create({
        admin_id: adminId,
        action: "change_password",
        target_type: "admin",
        target_id: adminId.toString(),
        details: "Password changed",
        ip_address: ipAddress,
      });

      return { message: "Đổi mật khẩu thành công" };
    } catch (error) {
      throw error;
    }
  }

  // Lấy thông tin admin
  async getAdminInfo(adminId) {
    try {
      const admin = await AdminUser.findByPk(adminId, {
        attributes: { exclude: ["password_hash"] },
      });

      if (!admin) {
        throw new Error("Admin không tồn tại");
      }

      return admin;
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách admin (chỉ superadmin)
  async getAllAdmins() {
    try {
      const admins = await AdminUser.findAll({
        attributes: { exclude: ["password_hash"] },
        order: [["created_at", "DESC"]],
      });

      return admins;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminAuthService();
