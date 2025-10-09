const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const User = require("../models/User");
const ItemPurchase = require("../models/ItemPurchase");
const authMiddleware = require("../middleware/authMiddleware");
const sequelize = require("../config/postgres");
const itemService = require("../services/admin/itemService");

// Middleware to check admin
function adminMiddleware(req, res, next) {
  if (req.user && req.user.isAdmin === true) return next();
  return res.status(403).json({ message: "Admin access required" });
}

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
 *                 description: URL of the item image (uploaded to Cloudinary)
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
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const imageUrl = req.body.image;

    const item = await itemService.createItem(req.body, req.user.id, imageUrl);

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
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const itemId = req.params.id;
    const imageUrl = req.body.image;

    const updatedItem = await itemService.updateItem(
      itemId,
      req.body,
      imageUrl
    );

    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH: Equip or unequip an item
/**
 * @swagger
 * /api/items/{id}/equip:
 *   patch:
 *     summary: Equip or unequip an item
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
 *         description: ID of the item purchase to equip or unequip
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_equipped:
 *                 type: boolean
 *                 description: Set to true to equip, false to unequip
 *             required:
 *               - is_equipped
 *     responses:
 *       200:
 *         description: Item equipped/unequipped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 item:
 *                   $ref: '#/components/schemas/Item'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item purchase not found
 *       500:
 *         description: Internal server error
 */
router.put("/:itemId/equip", authMiddleware, async (req, res) => {
  try {
    const itemId = req.params.itemId;
    console.log(itemId);
    const { is_equipped } = req.body;
    const userId = req.user.userId;

    const updatedPurchase = await itemService.equipItem(
      userId,
      itemId,
      is_equipped
    );

    res.status(200).json({
      message: `Item ${is_equipped ? "equipped" : "unequipped"} successfully`,
      purchase: updatedPurchase,
    });
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
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
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
router.post("/:itemId/purchase", authMiddleware, async (req, res) => {
  const itemId = req.params.itemId;
  const { quantity } = req.body;
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
