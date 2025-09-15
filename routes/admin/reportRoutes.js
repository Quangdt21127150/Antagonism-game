const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const reportService = require("../../services/admin/reportService");

// Thống kê tổng quan
router.get("/overview", adminAuth, async (req, res) => {
  try {
    const stats = await reportService.getOverviewStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê user theo level
router.get("/users/level", adminAuth, async (req, res) => {
  try {
    const stats = await reportService.getUserLevelStats();
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê giao dịch theo thời gian
router.get("/transactions/time", adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await reportService.getTransactionTimeStats(days);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê hoạt động admin
router.get("/admin/activity", adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await reportService.getAdminActivityStats(days);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Báo cáo tài chính
router.get("/financial", adminAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const report = await reportService.getFinancialReport(start_date, end_date);
    res.json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xuất báo cáo
router.get("/export/:type", adminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const filters = {
      user_id: req.query.user_id,
      type: req.query.type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      is_active:
        req.query.is_active !== undefined
          ? req.query.is_active === "true"
          : undefined,
    };

    const data = await reportService.exportReport(type, filters);
    res.json({ data });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
