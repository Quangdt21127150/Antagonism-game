const express = require("express");
const router = express.Router();
const roomServices = require("../services/roomServices");

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a room
 *     tags: [Rooms]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               owner_id:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 *       404:
 *         description: Owner of room not found
 *       500:
 *         description: Error creating room
 */
router.post("/", async (req, res) => {
  const { ownerId, password } = req.body;
  try {
    const result = await roomServices.createRoom(ownerId, password);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Join a room
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Join room successfully
 *       404:
 *         description: Room not found
 *       403:
 *         description: Incorrect password
 */
router.post("/:id", async (req, res) => {
  const { password } = req.body;
  const roomId = req.params.id;
  try {
    const result = await roomServices.joinRoom(roomId, password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get waiting rooms
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: A list of waiting rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Room'
 */
router.get("/", async (req, res) => {
  try {
    const result = await roomServices.getWaitingRooms();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
