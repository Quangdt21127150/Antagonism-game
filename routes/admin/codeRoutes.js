const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const codeService = require("../../services/admin/codeService");

// Lấy danh sách code
router.get("/", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      code: req.query.code,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined,
      code_type: req.query.code_type,
    };

    const result = await codeService.getCodes(page, limit, filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo code mới
router.post("/", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const code = await codeService.createCode(
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json({ code });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo code hàng loạt
router.post("/bulk", adminAuth, async (req, res) => {
  try {
    const { quantity, ...codeData } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await codeService.createBulkCodes(
      codeData,
      quantity,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Cập nhật code
router.put("/:id", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const code = await codeService.updateCode(
      req.params.id,
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json({ code });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa code
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await codeService.deleteCode(
      req.params.id,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bật/tắt code
router.patch("/:id/active", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await codeService.toggleCodeActive(
      req.params.id,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy lịch sử sử dụng code
router.get("/:id/history", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await codeService.getCodeUsageHistory(
      req.params.id,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê code
router.get("/stats/overview", adminAuth, async (req, res) => {
  try {
    const stats = await codeService.getCodeStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
