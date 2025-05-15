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
 *         password:
 *           type: string
 *           description: Password of the room
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
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/", authMiddleware, async (req, res) => {
  const { password } = req.body;
  try {
    const result = await roomServices.createRoom(password, req.user.userId);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 404).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   post:
 *     summary: Join a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Join room successfully
 *       400:
 *         description: Two players must be different
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Incorrect password
 *       404:
 *         description: Room not found
 */
router.post("/:id", authMiddleware, async (req, res) => {
  const { password } = req.body;
  const roomId = req.params.id;
  try {
    const result = await roomServices.joinRoom(
      roomId,
      password,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/rooms/all:
 *   get:
 *     summary: Get all rooms belonging to user
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all rooms belonging to user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       401:
 *         description: Unauthorized
 */
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const result = await roomServices.getRooms(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get waiting rooms
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of waiting rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 *       401:
 *         description: Unauthorized
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await roomServices.getWaitingRooms();
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
