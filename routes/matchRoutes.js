const express = require("express");
const router = express.Router();
const matchServices = require("../services/matchServices");

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
 *               type: object
 *               items:
 *                 $ref: '#/components/schemas/Match'
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
