const express = require("express");
const router = express.Router();
const matchServices = require("../services/matchServices");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Match:
 *       type: object
 *       required:
 *         - id
 *         - white_id
 *         - status
 *       properties:
 *         id:
 *           type: string
 *           description: The match ID
 *         white_id:
 *           type: string
 *           description: ID of the user playing white side
 *         black_id:
 *           type: string
 *           description: ID of the user playing black side
 *         status:
 *           type: enum<string>
 *           description: Status of the match ("waiting", "ongoing", "win", "draw", "lose")
 *           default: waiting
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The match creation date
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/matches:
 *   post:
 *     summary: Save match history
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               match_id:
 *                 type: string
 *               content:
 *                 type: object
 *     responses:
 *       201:
 *         description: Save match history successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Match not found to save history
 */
router.post("/", authMiddleware, async (req, res) => {
  const { match_id, content } = req.body;
  try {
    const result = await matchServices.saveMatchHistory(match_id, content);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 404).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get matches that user joined
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of matches that user joined
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Match'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await matchServices.getMatches(req.user.userId);
    res.status(200).json(result.matches);
  } catch (error) {
    res.status(error.status || 404).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/matches/{id}:
 *   get:
 *     summary: Load a match
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the match
 *     responses:
 *       200:
 *         description: The match with following id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Match'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No match found
 */
router.get("/:id", authMiddleware, async (req, res) => {
  const matchId = req.params.id;
  try {
    const result = await matchServices.getMatchHistory(matchId);
    res.status(200).json(result.matchHistory);
  } catch (error) {
    res.status(error.status || 404).json({ message: error.message });
  }
});
router.get("/rate/:id", authMiddleware, async (req, res) => {
  const userId = req.params.id;

  // Ensure the authenticated user can only access their own stats
  if (req.user.id !== userId) {
    return res
      .status(403)
      .json({ message: "Unauthorized: You can only view your own stats" });
  }

  try {
    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Count wins
    const wins = await Match.count({
      where: {
        [Op.or]: [
          { white_id: userId, status: "win" },
          { black_id: userId, status: "lose" },
        ],
      },
    });

    // Count losses
    const losses = await Match.count({
      where: {
        [Op.or]: [
          { white_id: userId, status: "lose" },
          { black_id: userId, status: "win" },
        ],
      },
    });

    // Count draws
    const draws = await Match.count({
      where: {
        [Op.or]: [
          { white_id: userId, status: "draw" },
          { black_id: userId, status: "draw" },
        ],
      },
    });

    // Calculate total and win rate
    const total = wins + losses + draws;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : 0;

    const result = {
      userId,
      username: user.username,
      elo: user.elo,
      wins,
      losses,
      draws,
      total,
      winRate,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching match stats:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});
module.exports = router;
