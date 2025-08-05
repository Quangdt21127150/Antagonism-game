const express = require("express");
const router = express.Router();
const Item = require("../models/Item");
const authMiddleware = require("../middleware/authMiddleware");

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
 *           description: Number of coins for the item
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
 *     summary: Get all items
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
 *         multipart/form-data:
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

  try {
    const item = await Item.create({ name, price, number, image });
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
});

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

module.exports = router;
