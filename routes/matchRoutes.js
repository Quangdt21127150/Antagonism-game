const express = require("express");
const router = express.Router();
const matchServices = require("../services/matchServices");

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
 */

/**
 * @swagger
 * /api/matches:
 *   post:
 *     summary: Save match history
 *     tags: [Matches]
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
 *       404:
 *         description: Match not found to save history
 */
router.post("/", async (req, res) => {
  const { matchId, content } = req.body;
  try {
    const result = await matchServices.saveMatchHistory(matchId, content);
    res.status(201).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/matches/{match_id}:
 *   get:
 *     summary: Load a match
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: match_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The match with following id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Match'
 *       404:
 *         description: No match found
 */
router.get("/:matchId", async (req, res) => {
  const matchId = req.params.matchId;
  try {
    const result = await matchServices.getMatchHistory(matchId);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

module.exports = router;
