const express = require("express");
const router = express.Router();
const roomServices = require("../services/roomServices");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Room:
 *       type: object
 *       required:
 *         - id
 *         - owner_id
 *       properties:
 *         id:
 *           type: string
 *           description: The room ID
 *         owner_id:
 *           type: string
 *           description: ID of the user who created the room
 *         match_id:
 *           type: string
 *           description: ID of the match occuring in the room
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The room creation date
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               opponent_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 *       400:
 *         description: Two players must be different
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Opponent not found
 */
router.post("/", authMiddleware, async (req, res) => {
  const { opponent_id, roomType } = req.body;
  try {
    const result = await roomServices.createRoom(
      opponent_id,
      roomType,
      req.user.userId
    );
    res.status(201).json(result);
  } catch (error) {
    console.log(error);
    res.status(error.status || 404).json({ message: error.message });
  }
});

module.exports = router;
