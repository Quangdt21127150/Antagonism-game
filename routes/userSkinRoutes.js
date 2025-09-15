const express = require("express");
const router = express.Router();
const userSkinServices = require("../services/userSkinServices");
const authMiddleware = require("../middleware/authMiddleware");

// Lấy danh sách skin (có thể lọc theo type)
router.get("/skins", async (req, res) => {
  try {
    const { type } = req.query;
    const skins = await userSkinServices.getAllSkins(type);
    res.json(skins);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lấy danh sách skin user sở hữu
router.get("/:id/skins", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const skins = await userSkinServices.getUserSkins(userId);
    res.json(skins);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mở khóa skin cho user
router.post("/:id/skins/unlock", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { skin_id } = req.body;
    const result = await userSkinServices.unlockUserSkin(userId, skin_id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Chọn skin đang dùng
router.post("/:id/skins/select", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const { type, skin_id } = req.body;
    const user = await userSkinServices.selectUserSkin(userId, type, skin_id);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;