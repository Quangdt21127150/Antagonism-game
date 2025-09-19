const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const userService = require("../../services/admin/userService");

// Lấy danh sách user
router.get("/", adminAuth, async (req, res) => {
  try {   
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      username: req.query.username,
      level: req.query.level,
      is_banned:
        req.query.is_banned !== undefined
          ? req.query.is_banned === "true"
          : undefined,
    };

    const result = await userService.getUsers(page, limit, filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy thông tin chi tiết user
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const user = await userService.getUserDetail(req.params.id);
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Ban/Unban user
router.patch("/:id/ban", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await userService.toggleBanUser(
      req.params.id,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật coin/gem cho user
router.put("/:id/currency", adminAuth, async (req, res) => {
  try {
    const { coin, gem, reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await userService.updateUserCurrency(
      req.params.id,
      { coin, gem, reason },
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật ELO cho user
router.put("/:id/elo", adminAuth, async (req, res) => {
  try {
    const { elo } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await userService.updateUserElo(
      req.params.id,
      elo,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê user
router.get("/stats/overview", adminAuth, async (req, res) => {
  try {
    const stats = await userService.getUserStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
