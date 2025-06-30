const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const authMiddleware = require("../middleware/authMiddleware"); // Adjust path as needed

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
    const users = await User.findAll({
      attributes: ["id", "username", "elo", "win_count", "lose_count"],
      order: [["elo", "DESC"]],
      limit: Math.min(limit, 100),
    });

    const leaderboard = users.map((user) => {
      const total = user.win_count + user.lose_count;
      const win_rate =
        total > 0 ? Math.round((user.win_count / total) * 10000) / 100 : 0;
      return {
        ...user.get(),
        win_rate,
      };
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
  const sender_id = req.user.userId;

  /* … validate, auto-accept v.v … */

  const friendRequest = await FriendRequest.create({
    sender_id,
    receiver_id,
  });

  await friendRequest.reload({
    include: [
      { model: User, as: "sender", attributes: ["id", "username", "elo"] },
      { model: User, as: "receiver", attributes: ["id", "username", "elo"] },
    ],
  });

  res.status(201).json({
    message: "Friend request sent",
    friendRequest,
  });
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
  const userId = req.user.userId;
  if (!userId) {
    return res.status(401).json({ message: "Invalid token: missing user ID" });
  }

  try {
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

    const friends = friendRequests.map((request) =>
      request.sender_id === userId ? request.receiver : request.sender
    );

    res.status(200).json(friends);
  } catch (err) {
    console.error("Error fetching friend list:", err);
    res.status(500).json({ message: "Internal server error" });
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
  const userId = req.user.userId;

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

router.get("/friend-request", authMiddleware, async (req, res) => {
  const role = req.query.role || "receiver"; // receiver | sender | both
  const status = req.query.status || "pending"; // pending | accepted | rejected
  const userId = req.user.userId;

  const where = { status };
  if (role !== "both")
    where[role === "sender" ? "sender_id" : "receiver_id"] = userId;
  else where[Op.or] = [{ sender_id: userId }, { receiver_id: userId }];

  const list = await FriendRequest.findAll({
    where,
    order: [["created_at", "DESC"]],
    include: [
      { model: User, as: "sender", attributes: ["id", "username", "elo"] },
      { model: User, as: "receiver", attributes: ["id", "username", "elo"] },
    ],
  });

  res.json(list);
});
module.exports = router;
