const express = require("express");
const router = express.Router();
const voucherServices = require("../services/voucherServices");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     Voucher:
 *       type: object
 *       required:
 *         - name
 *         - amount
 *         - validDate
 *         - expireDate
 *       properties:
 *         name:
 *           type: string
 *           description: The voucher name/code
 *         amount:
 *           type: integer
 *           description: The amount of stars to be added to user account
 *         validDate:
 *           type: string
 *           format: date-time
 *           description: When the voucher becomes valid
 *         expireDate:
 *           type: string
 *           format: date-time
 *           description: When the voucher expires
 */

// Middleware to check admin
function adminMiddleware(req, res, next) {
  if (req.user && req.user.isAdmin === true) return next();
  return res.status(403).json({ message: "Admin access required" });
}

/**
 * @swagger
 * /api/vouchers/create:
 *   post:
 *     summary: Create a new voucher (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - amount
 *               - validDate
 *               - expireDate
 *             properties:
 *               name:
 *                 type: string
 *                 description: Unique voucher name/code
 *               amount:
 *                 type: integer
 *                 description: Amount of stars to give to user
 *               validDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the voucher becomes valid
 *               expireDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the voucher expires
 *     responses:
 *       201:
 *         description: Voucher created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Bad request - missing fields
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Voucher already exists
 */
// Admin creates voucher
router.post("/create", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, amount, validDate, expireDate } = req.body;
    const voucher = await voucherServices.createVoucher({
      name,
      amount,
      validDate,
      expireDate,
    });
    res.status(201).json(voucher);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers/redeem:
 *   post:
 *     summary: Redeem a voucher for stars
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - voucherName
 *             properties:
 *               voucherName:
 *                 type: string
 *                 description: The name/code of the voucher to redeem
 *     responses:
 *       200:
 *         description: Voucher redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 starsAdded:
 *                   type: integer
 *                   description: Number of stars added to user account
 *                 newStarBalance:
 *                   type: integer
 *                   description: User's new star balance
 *       400:
 *         description: Invalid voucher or already redeemed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Voucher not found
 */
// User redeems voucher
router.post("/redeem", authMiddleware, async (req, res) => {
  try {
    const { voucherName } = req.body;
    const result = await voucherServices.redeemVoucher({
      userId: req.user.userId,
      voucherName,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers:
 *   get:
 *     summary: Get all vouchers (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all vouchers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Voucher'
 *       403:
 *         description: Admin access required
 */
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const vouchers = await voucherServices.getAllVouchers();
    res.json(vouchers);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers/{id}:
 *   get:
 *     summary: Get a specific voucher by ID (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Voucher ID
 *     responses:
 *       200:
 *         description: Voucher details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       404:
 *         description: Voucher not found
 *       403:
 *         description: Admin access required
 */
router.get("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const voucher = await voucherServices.getVoucherById(req.params.id);
    res.json(voucher);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers/{id}:
 *   put:
 *     summary: Update a voucher (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Voucher ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Voucher name/code
 *               amount:
 *                 type: integer
 *                 description: Amount of stars
 *               validDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the voucher becomes valid
 *               expireDate:
 *                 type: string
 *                 format: date-time
 *                 description: When the voucher expires
 *     responses:
 *       200:
 *         description: Voucher updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Voucher'
 *       400:
 *         description: Bad request
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Voucher not found
 *       409:
 *         description: Voucher name already exists
 */
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, amount, validDate, expireDate } = req.body;
    const voucher = await voucherServices.updateVoucher(req.params.id, {
      name,
      amount,
      validDate,
      expireDate,
    });
    res.json(voucher);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers/{id}:
 *   delete:
 *     summary: Delete a voucher (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Voucher ID
 *     responses:
 *       200:
 *         description: Voucher deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Voucher not found
 */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await voucherServices.deleteVoucher(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/vouchers/{id}/redemptions:
 *   get:
 *     summary: Get redemption history for a specific voucher (Admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Voucher ID
 *     responses:
 *       200:
 *         description: Voucher redemption history
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
 *                   voucher_id:
 *                     type: integer
 *                   stars_added:
 *                     type: integer
 *                   redeemed_at:
 *                     type: string
 *                     format: date-time
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Voucher not found
 */
router.get(
  "/:id/redemptions",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const redemptions = await voucherServices.getVoucherRedemptionHistory(
        req.params.id
      );
      res.json(redemptions);
    } catch (error) {
      res.status(error.status || 400).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/vouchers/user/redemptions:
 *   get:
 *     summary: Get current user's voucher redemption history
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's voucher redemption history
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
 *                   voucher_id:
 *                     type: integer
 *                   stars_added:
 *                     type: integer
 *                   redeemed_at:
 *                     type: string
 *                     format: date-time
 *                   voucher:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       amount:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get("/user/redemptions", authMiddleware, async (req, res) => {
  try {
    const redemptions = await voucherServices.getUserRedemptionHistory(
      req.user.userId
    );
    res.json(redemptions);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

module.exports = router;
