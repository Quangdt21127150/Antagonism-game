const express = require("express");
const router = express.Router();
const adminAuth = require("../../middleware/adminAuth");
const transactionService = require("../../services/admin/transactionService");

// Lấy danh sách giao dịch
router.get("/", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {
      user_id: req.query.user_id,
      type: req.query.type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      min_amount: req.query.min_amount
        ? parseInt(req.query.min_amount)
        : undefined,
      max_amount: req.query.max_amount
        ? parseInt(req.query.max_amount)
        : undefined,
    };

    const result = await transactionService.getTransactions(
      page,
      limit,
      filters
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy chi tiết giao dịch
router.get("/:id", adminAuth, async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionDetail(
      req.params.id
    );
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo giao dịch thủ công (admin tặng coin/gem)
router.post("/manual", adminAuth, async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const result = await transactionService.createManualTransaction(
      req.body,
      req.admin.id,
      ipAddress
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Thống kê giao dịch
router.get("/stats/overview", adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };

    const stats = await transactionService.getTransactionStats(filters);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xuất báo cáo giao dịch
router.get("/export/report", adminAuth, async (req, res) => {
  try {
    const filters = {
      user_id: req.query.user_id,
      type: req.query.type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
    };

    const data = await transactionService.exportTransactions(filters);
    res.json({ data });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
