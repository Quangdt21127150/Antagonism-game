const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const User = require("../models/User");
const ItemPurchase = require("../models/ItemPurchase");
const authMiddleware = require("../middleware/authMiddleware");
const sequelize = require("../config/postgres");
const upload = require("../middleware/uploadMiddleware");
const adminAuth = require("../middleware/adminAuth");
const itemService = require("../services/admin/itemService");

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
router.post("/", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file?.path;

    const item = await itemService.createItem(
      req.body,
      req.admin.id,
      imagePath
    );

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
router.put("/:id", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const itemId = req.params.id;
    const imagePath = req.file?.path;

    const updatedItem = await itemService.updateItem(
      itemId,
      req.body,
      imagePath
    );

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
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
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const item_id = req.params.id;

    await itemService.deleteItem(item_id);

    res.status(200).json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
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

  try {
    const purchase = await itemService.purchaseItem(userId, itemId, quantity);

    res.status(200).json({
      message: "Mua item thành công",
      purchase,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    const userId = req.user.userId;

    const purchases = await itemService.getPurchaseHistory(userId);

    res.status(200).json(purchases);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
