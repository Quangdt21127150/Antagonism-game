const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const User = require("../models/User");
const ItemPurchase = require("../models/ItemPurchase");
const authMiddleware = require("../middleware/authMiddleware");
const sequelize = require("../config/postgres");

// GET all items
/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - price
 *         - number
 *       properties:
 *         id:
 *           type: string
 *           description: The item ID
 *         name:
 *           type: string
 *           description: The item name
 *         price:
 *           type: integer
 *           description: Price of the item in VND
 *         number:
 *           type: integer
 *           description: Quantity of the item
 *         image:
 *           type: string
 *           description: URL of the item image
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The item creation date
 */

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Retrieve all items
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const items = await Item.findAll();
    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// POST a new item
/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: integer
 *               number:
 *                 type: integer
 *               image:
 *                 type: string
 *                 description: URL of the item image
 *             required:
 *               - name
 *               - price
 *               - number
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post("/", authMiddleware, async (req, res) => {
  const { name, price, number, image } = req.body;
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  if (!name || !price || !number) {
    return res
      .status(400)
      .json({ message: "Name, price, and quantity are required" });
  }
  try {
    const item = await Item.create({ name, price, number, image });
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// PUT to update an item
/**
 * @swagger
 * /api/items/{id}:
 *   put:
 *     summary: Update an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the item to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: integer
 *               number:
 *                 type: integer
 *               image:
 *                 type: string
 *                 description: URL of the item image
 *             required:
 *               - name
 *               - price
 *               - number
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  const { name, price, number, image } = req.body;
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  if (!name || !price || !number) {
    return res
      .status(400)
      .json({ message: "Name, price, and quantity are required" });
  }
  try {
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    await item.update({ name, price, number, image });
    res.status(200).json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// DELETE an item
/**
 * @swagger
 * /api/items/{id}:
 *   delete:
 *     summary: Delete an item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the item to delete
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  try {
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    await item.destroy();
    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// POST purchase item
/**
 * @swagger
 * /api/items/{id}/purchase:
 *   post:
 *     summary: Purchase an item with stars to get coins
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the item to purchase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 description: Quantity to purchase (default 1)
 *                 minimum: 1
 *             required: []
 *     responses:
 *       200:
 *         description: Item purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 quantity:
 *                   type: integer
 *                 starsSpent:
 *                   type: integer
 *                 coinsEarned:
 *                   type: integer
 *                 newStarBalance:
 *                   type: integer
 *                 newCoinBalance:
 *                   type: integer
 *       400:
 *         description: Invalid input or insufficient stars
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 *       500:
 *         description: Internal server error
 */
router.post("/:id/purchase", authMiddleware, async (req, res) => {
  const itemId = req.params.id;
  const { quantity = 1 } = req.body;
  const userId = req.user.userId;

  // Validate quantity
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return res
      .status(400)
      .json({ message: "Quantity must be a positive integer" });
  }

  const transaction = await sequelize.transaction();

  try {
    // Find item
    const item = await Item.findByPk(itemId, { transaction });
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check if enough quantity available
    if (item.number < quantity) {
      return res.status(400).json({
        message: `Only ${item.number} items available, requested ${quantity}`,
      });
    }

    // Find user
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Calculate costs and earnings
    const totalStarsNeeded = item.price * quantity;
    const coinsEarned = Math.floor(totalStarsNeeded * 0.1); // 10% của stars spent thành coins

    // Check if user has enough stars
    if (user.star < totalStarsNeeded) {
      return res.status(400).json({
        message: `Insufficient stars. Need ${totalStarsNeeded}, have ${user.star}`,
      });
    }

    // Update user balances
    user.star -= totalStarsNeeded;
    user.coin += coinsEarned;
    await user.save({ transaction });

    // Update item quantity
    item.number -= quantity;
    await item.save({ transaction });

    // Create purchase record
    await ItemPurchase.create(
      {
        user_id: userId,
        item_id: itemId,
        quantity: quantity,
        stars_spent: totalStarsNeeded,
        coins_earned: coinsEarned,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({
      message: "Item purchased successfully",
      quantity: quantity,
      starsSpent: totalStarsNeeded,
      coinsEarned: coinsEarned,
      newStarBalance: user.star,
      newCoinBalance: user.coin,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error purchasing item:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

// GET purchase history
/**
 * @swagger
 * /api/items/purchases:
 *   get:
 *     summary: Get user's purchase history
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's purchase history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   user_id:
 *                     type: string
 *                   item_id:
 *                     type: string
 *                   quantity:
 *                     type: integer
 *                   stars_spent:
 *                     type: integer
 *                   coins_earned:
 *                     type: integer
 *                   purchased_at:
 *                     type: string
 *                     format: date-time
 *                   item:
 *                     $ref: '#/components/schemas/Item'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/purchases", authMiddleware, async (req, res) => {
  try {
    const purchases = await ItemPurchase.findAll({
      where: { user_id: req.user.userId },
      include: [
        {
          model: Item,
          as: "item",
          attributes: ["id", "name", "price", "image"],
        },
      ],
      order: [["purchased_at", "DESC"]],
    });
    res.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

module.exports = router;
