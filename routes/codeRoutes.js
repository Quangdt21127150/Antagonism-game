const express = require("express");
const router = express.Router();
const codeServices = require("../services/codeServices");
const authMiddleware = require("../middleware/authMiddleware");

// Sử dụng code (user)
router.post("/user", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;
    console.log("userId:", req.user);

    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập code" });
    }

    const result = await codeServices.useCode(userId, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy lịch sử sử dụng code của user
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await codeServices.getUserCodeHistory(userId);
    res.json({ history });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Tạo code mới (không kiểm tra quyền admin)
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { code, gem_amount, elo_amount, max_uses, expires_at } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập code" });
    }

    const newCode = await codeServices.createCode({
      code,
      gem_amount: gem_amount || 0,
      elo_amount: elo_amount || 0,
      max_uses: max_uses || 1,
      expires_at: expires_at ? new Date(expires_at) : null,
    });

    res.json({
      success: true,
      message: "Tạo code thành công",
      code: newCode,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy danh sách code (không kiểm tra quyền admin)
router.get("/list", authMiddleware, async (req, res) => {
  try {
    const codes = await codeServices.getAllCodes();
    res.json({ codes });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Vô hiệu hóa code (không kiểm tra quyền admin)
router.put("/deactivate/:codeId", authMiddleware, async (req, res) => {
  try {
    const { codeId } = req.params;
    const result = await codeServices.deactivateCode(codeId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
