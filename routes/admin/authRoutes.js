const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const authService = require("../../services/admin/authService");

// Đăng nhập admin
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.login(username, password, ipAddress);
    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ message: error.message });
  }
});

// Đăng xuất admin
router.post("/logout", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.logout(req.admin.id, ipAddress);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy thông tin admin hiện tại
router.get("/profile", adminAuth, async (req, res) => {
  try {
    const admin = await authService.getAdminInfo(req.admin.id);
    res.json(admin);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Đổi mật khẩu
router.put("/change-password", adminAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.changePassword(
      req.admin.id,
      oldPassword,
      newPassword,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo admin mới (chỉ superadmin)
router.post("/create", adminAuth, async (req, res) => {
  try {
    if (req.admin.role !== "superadmin") {
      return res.status(403).json({ message: "Không có quyền tạo admin" });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await authService.createAdmin(
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy danh sách admin (chỉ superadmin)
router.get("/list", adminAuth, async (req, res) => {
  try {
    if (req.admin.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Không có quyền xem danh sách admin" });
    }

    const admins = await authService.getAllAdmins();
    res.json({ admins });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
