const express = require("express");
const router = express.Router();
const matchmakingService = require("../services/matchmakingService");
const authMiddleware = require("../middleware/authMiddleware");
const Match = require("../models/Match");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

/**
 * @swagger
 * /api/matchmaking/check-rank-status:
 *   get:
 *     summary: Kiểm tra trạng thái rank khi user vào game
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Rank status check result
 */
router.get("/check-rank-status", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    console.log("Checking rank status for user:", userId);
    const eligibility = await matchmakingService.checkRankEligibility(userId);

    const response = {
      allowed_ranked: eligibility.canPlayRank,
      requiredFee: eligibility.requiredFee,
      availableGem: eligibility.availableGem,
      availableCoin: eligibility.availableCoin,
      userLevel: eligibility.userLevel,
      elo: eligibility.elo,
      message: eligibility.message,
    };

    console.log("Rank status result:", response);
    res.json(response);
  } catch (error) {
    console.error("Rank status check error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matchmaking/create-match:
 *   post:
 *     summary: Unity gọi khi tìm được đối thủ - tạo match và reserve phí
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whiteId:
 *                 type: string
 *               blackId:
 *                 type: string
 *               fee:
 *                 type: integer
 *               currencyType:
 *                 type: string
 *                 enum: [gem, coin]
 *     responses:
 *       200:
 *         description: Match created and fee reserved
 */
router.post("/create-match", authMiddleware, async (req, res) => {
  try {
    const { whiteId, blackId, fee, currencyType } = req.body;
    const userId = req.user.id || req.user.userId;

    // Kiểm tra user có trong match này không
    if (userId !== whiteId && userId !== blackId) {
      return res
        .status(403)
        .json({ error: "Not authorized to create this match" });
    }

    console.log("Creating match:", { whiteId, blackId, fee, currencyType });

    // Kiểm tra eligibility cho cả 2 players
    const whiteEligibility = await matchmakingService.checkRankEligibility(
      whiteId
    );
    const blackEligibility = await matchmakingService.checkRankEligibility(
      blackId
    );

    if (!whiteEligibility.canPlayRank || !blackEligibility.canPlayRank) {
      const errorMessages = [];
      if (!whiteEligibility.canPlayRank) {
        errorMessages.push(`Người chơi trắng: ${whiteEligibility.message}`);
      }
      if (!blackEligibility.canPlayRank) {
        errorMessages.push(`Người chơi đen: ${blackEligibility.message}`);
      }

      return res.status(400).json({
        error: "Không thể tạo trận đấu xếp hạng",
        details: errorMessages.join("; "),
      });
    }

    // Tạo match
    const match = await matchmakingService.createMatch(
      whiteId,
      blackId,
      fee,
      currencyType
    );

    // Reserve phí cho cả 2 players
    const whiteReserve = await matchmakingService.reserveMatchFee(
      whiteId,
      match.id,
      fee,
      currencyType
    );
    const blackReserve = await matchmakingService.reserveMatchFee(
      blackId,
      match.id,
      fee,
      currencyType
    );

    // Cập nhật match status
    await Match.update({ fee_reserved: true }, { where: { id: match.id } });

    console.log("Match created and fee reserved:", match.id);
    res.json({
      success: true,
      matchId: match.id,
      message: "Match created and fee reserved successfully",
      whiteReserve: whiteReserve.message,
      blackReserve: blackReserve.message,
    });
  } catch (error) {
    console.error("Create match error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matchmaking/match-result:
 *   post:
 *     summary: Unity gửi kết quả match - xử lý ELO và cập nhật DB
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               matchId:
 *                 type: string
 *               winnerId:
 *                 type: string
 *               moves:
 *                 type: array
 *               gameData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Match result processed successfully
 */
router.post("/match-result", authMiddleware, async (req, res) => {
  try {
    const { matchId, winnerId, moves, gameData } = req.body;
    const userId = req.user.id || req.user.userId;

    // Kiểm tra match tồn tại
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Kiểm tra user có trong match này không
    if (match.white_id !== userId && match.black_id !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to submit this match result" });
    }

    // Kiểm tra winner có hợp lệ không
    if (winnerId !== match.white_id && winnerId !== match.black_id) {
      return res.status(400).json({ error: "Invalid winner ID" });
    }

    console.log("Processing match result:", { matchId, winnerId });

    // Xử lý kết quả match
    await matchmakingService.processMatchResult(
      matchId,
      winnerId,
      moves,
      gameData
    );

    res.json({
      success: true,
      message: "Match result processed successfully",
    });
  } catch (error) {
    console.error("Process match result error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matchmaking/commit-match/{matchId}:
 *   post:
 *     summary: Unity gọi khi game bắt đầu - commit phí
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fee committed successfully
 */
router.post("/commit-match/:matchId", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id || req.user.userId;

    console.log("Committing match fee:", { matchId, userId });

    const result = await matchmakingService.commitMatchFee(userId, matchId);

    console.log("Fee committed:", result);
    res.json(result);
  } catch (error) {
    console.error("Commit fee error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matchmaking/release-match/{matchId}:
 *   post:
 *     summary: Unity gọi khi game bị hủy - release phí
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fee released successfully
 */
router.post("/release-match/:matchId", authMiddleware, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.user.id || req.user.userId;

    console.log("Releasing match fee:", { matchId, userId });

    const result = await matchmakingService.releaseMatchFee(userId, matchId);

    console.log("Fee released:", result);
    res.json(result);
  } catch (error) {
    console.error("Release fee error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matchmaking/reserved-matches:
 *   get:
 *     summary: Lấy thông tin reserved matches (admin/monitoring)
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reserved matches information
 */
router.get("/reserved-matches", authMiddleware, async (req, res) => {
  try {
    const reservedInfo = matchmakingService.getReservedMatchesInfo();
    res.json(reservedInfo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/matches/{matchId}/fee-status:
 *   get:
 *     summary: Kiểm tra trạng thái phí của match
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: matchId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match fee status
 */
router.get("/matches/:matchId/fee-status", authMiddleware, async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const userId = req.user.id || req.user.userId;

    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Kiểm tra user có trong match này không
    if (match.white_id !== userId && match.black_id !== userId) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this match" });
    }

    // Lấy transaction records
    const transactions = await Transaction.findAll({
      where: { match_id: matchId },
      order: [["created_at", "DESC"]],
    });

    const response = {
      matchId,
      status: match.status,
      fee_reserved: match.fee_reserved,
      fee_committed: match.fee_committed,
      match_fee: match.match_fee,
      currency_type: match.currency_type,
      created_at: match.created_at,
      started_at: match.started_at,
      completed_at: match.completed_at,
      transactions: transactions.map((t) => ({
        id: t.id,
        transaction_type: t.transaction_type,
        amount: t.amount,
        currency_type: t.currency_type,
        status: t.status,
        description: t.description,
        created_at: t.created_at,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Fee status check error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/transactions/user:
 *   get:
 *     summary: Lấy lịch sử transaction của user
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User transaction history
 */
router.get("/transactions/user", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const transactions = await Transaction.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit: 20,
    });

    const response = {
      userId,
      totalTransactions: transactions.length,
      transactions: transactions.map((t) => ({
        id: t.id,
        transaction_type: t.transaction_type,
        amount: t.amount,
        currency_type: t.currency_type,
        status: t.status,
        description: t.description,
        match_id: t.match_id,
        package_id: t.package_id,
        created_at: t.created_at,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Transaction history error:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Lấy thông tin profile và balance của user
 *     tags: [Matchmaking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile with balance
 */
router.get("/users/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;

    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "email",
        "elo",
        "level",
        "gem",
        "coin",
        "locked_gem",
        "locked_coin",
        "created_at",
        "updated_at",
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const response = {
      userId: user.id,
      username: user.username,
      email: user.email,
      elo: user.elo,
      level: user.level,
      balance: {
        gem: user.gem,
        coin: user.coin,
        locked_gem: user.locked_gem,
        locked_coin: user.locked_coin,
        available_gem: user.gem - user.locked_gem,
        available_coin: user.coin - user.locked_coin,
      },
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    res.json(response);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
