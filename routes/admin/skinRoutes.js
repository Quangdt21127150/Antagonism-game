const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const skinService = require("../../services/admin/skinService");

// Lấy danh sách skin
router.get("/", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      name: req.query.name,
      type: req.query.type,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined,
    };

    const result = await skinService.getSkins(page, limit, filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo skin mới
router.post("/", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const skin = await skinService.createSkin(
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json({ skin });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật skin
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const skin = await skinService.updateSkin(
      req.params.id,
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json({ skin });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa skin
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await skinService.deleteSkin(
      req.params.id,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bật/tắt hiển thị skin trong shop
router.patch("/:id/active", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await skinService.toggleSkinActive(
      req.params.id,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê skin
router.get("/stats/overview", adminAuth, async (req, res) => {
  try {
    const stats = await skinService.getSkinStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
