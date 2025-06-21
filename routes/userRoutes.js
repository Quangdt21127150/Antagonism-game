const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const authMiddleware = require("../middleware/auth"); // Adjust path as needed

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Get leaderboard sorted by Elo
 *     description: Retrieve the top users sorted by their Elo rating in descending order.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users to return (max 100)
 *     responses:
 *       200:
 *         description: List of top users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   username:
 *                     type: string
 *                   elo:
 *                     type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.get("/leaderboard", async (req, res) => {
  const limit = parseInt(req.query.limit) || 10; // Default to top 10
  try {
    const leaderboard = await User.findAll({
      attributes: [
        "id",
        "username",
        "elo",
        "win_count",
        "lose_count",
        [
          User.sequelize.literal(
            "CASE WHEN (win_count + lose_count) > 0 THEN ROUND((win_count::FLOAT / (win_count + lose_count)) * 100, 2) ELSE 0 END"
          ),
          "win_rate",
        ],
      ],
      order: [["elo", "DESC"]], // Sort by elo descending
      limit: Math.min(limit, 100), // Cap limit at 100
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /username/{name}:
 *   get:
 *     summary: Get user by username
 *     description: Retrieve a user by their username.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Username of the user
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 username:
 *                   type: string
 *                 elo:
 *                   type: integer
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 */
router.get("/username/:name", authMiddleware, async (req, res) => {
  const username = req.params.name;
  try {
    const user = await User.findOne({
      where: { username },
      attributes: ["id", "username", "elo", "created_at"],
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by username:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /friend-request:
 *   post:
 *     summary: Send a friend request
 *     description: Send a friend request to another user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiver_id:
 *                 type: string
 *                 format: uuid
 *             required:
 *               - receiver_id
 *     responses:
 *       201:
 *         description: Friend request sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 friendRequest:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     sender_id:
 *                       type: string
 *                       format: uuid
 *                     receiver_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [pending, accepted, rejected]
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Receiver not found
 *       500:
 *         description: Internal server error
 */
router.post("/friend-request", authMiddleware, async (req, res) => {
  const { receiver_id } = req.body;
  const sender_id = req.user.id; // Assumes authMiddleware sets req.user.id

  // Validate request
  if (!receiver_id) {
    return res.status(400).json({ message: "receiver_id is required" });
  }
  if (sender_id === receiver_id) {
    return res
      .status(400)
      .json({ message: "Cannot send friend request to yourself" });
  }

  try {
    // Check if receiver exists
    const receiver = await User.findByPk(receiver_id);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    // Check for existing request
    const existingRequest = await FriendRequest.findOne({
      where: {
        sender_id,
        receiver_id,
        status: "pending",
      },
    });
    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Friend request already pending" });
    }

    // Create friend request
    const friendRequest = await FriendRequest.create({
      sender_id,
      receiver_id,
      status: "pending",
    });

    res.status(201).json({
      message: "Friend request sent successfully",
      friendRequest: {
        id: friendRequest.id,
        sender_id,
        receiver_id,
        status: friendRequest.status,
        created_at: friendRequest.created_at,
      },
    });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /friends:
 *   get:
 *     summary: Get friend list
 *     description: Retrieve the authenticated user's list of friends (accepted friend requests).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   username:
 *                     type: string
 *                   elo:
 *                     type: integer
 *       500:
 *         description: Internal server error
 */
router.get("/friends", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    // Find accepted friend requests where user is sender or receiver
    const friendRequests = await FriendRequest.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
        status: "accepted",
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "username", "elo"] },
        { model: User, as: "receiver", attributes: ["id", "username", "elo"] },
      ],
    });

    // Extract friends (users on the other side of the request)
    const friends = friendRequests.map((request) => {
      if (request.sender_id === userId) {
        return request.receiver;
      } else {
        return request.sender;
      }
    });

    res.status(200).json(friends);
  } catch (error) {
    console.error("Error fetching friend list:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});

/**
 * @swagger
 * /friend-request/{id}/accept:
 *   post:
 *     summary: Accept a friend request
 *     description: Accept a pending friend request sent to the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the friend request
 *     responses:
 *       200:
 *         description: Friend request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Friend request not found or not pending
 *       500:
 *         description: Internal server error
 */
router.post("/friend-request/:id/accept", authMiddleware, async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user.id;

  try {
    // Find the friend request where the user is the receiver and status is pending
    const friendRequest = await FriendRequest.findOne({
      where: {
        id: requestId,
        receiver_id: userId,
        status: "pending",
      },
    });

    if (!friendRequest) {
      return res
        .status(404)
        .json({ message: "Friend request not found or not pending" });
    }

    // Update status to accepted
    friendRequest.status = "accepted";
    await friendRequest.save();

    res.status(200).json({ message: "Friend request accepted successfully" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Internal server error" });
  }
});

module.exports = router;
