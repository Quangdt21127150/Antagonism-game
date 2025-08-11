const express = require("express");
const router = express.Router();
const paymentService = require("../services/paymentService");
const authMiddleware = require("../middleware/authMiddleware");
const paymentLogger = require("../middleware/paymentLogger");

// Apply payment monitoring to all routes
router.use(paymentLogger.paymentMonitor.bind(paymentLogger));

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentPackage:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         stars:
 *           type: integer
 *         price:
 *           type: integer
 *         name:
 *           type: string
 *         bonus:
 *           type: integer
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         order_id:
 *           type: string
 *         amount:
 *           type: integer
 *         stars_to_add:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled]
 *         created_at:
 *           type: string
 *           format: date-time
 *         completed_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/payment/packages:
 *   get:
 *     summary: Get available star packages
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available star packages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/PaymentPackage'
 *       401:
 *         description: Unauthorized
 */
router.get("/packages", authMiddleware, async (req, res) => {
  try {
    const packages = paymentService.getStarPackages();
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/momo/create:
 *   post:
 *     summary: Create MoMo payment for stars
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: integer
 *                 description: ID of the star package
 *               customAmount:
 *                 type: integer
 *                 description: Custom amount in VND (if not using package)
 *               orderInfo:
 *                 type: string
 *                 description: Custom order description
 *             required: []
 *     responses:
 *       200:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 paymentId:
 *                   type: string
 *                 orderId:
 *                   type: string
 *                 paymentUrl:
 *                   type: string
 *                 qrCodeUrl:
 *                   type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/momo/create", authMiddleware, async (req, res) => {
  try {
    const { packageId, customAmount, orderInfo } = req.body;
    const userId = req.user.userId;

    let amount, starsToAdd, description;

    if (packageId) {
      // Sử dụng predefined package
      const packages = paymentService.getStarPackages();
      const selectedPackage = packages.find((p) => p.id === packageId);

      if (!selectedPackage) {
        return res.status(400).json({ message: "Invalid package ID" });
      }

      amount = selectedPackage.price;
      starsToAdd = selectedPackage.stars + (selectedPackage.bonus || 0);
      description = `Mua ${selectedPackage.name} - ${starsToAdd} stars`;
    } else if (customAmount) {
      // Custom amount
      if (customAmount < 10000) {
        return res
          .status(400)
          .json({ message: "Minimum amount is 10,000 VND" });
      }

      amount = customAmount;
      starsToAdd = paymentService.calculateStars(customAmount);
      description = `Mua ${starsToAdd} stars`;
    } else {
      return res
        .status(400)
        .json({ message: "Either packageId or customAmount is required" });
    }

    const result = await paymentService.createPaymentOrder({
      userId,
      amount,
      starsToAdd,
      orderInfo: orderInfo || description,
    });

    res.json(result);
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/momo/ipn:
 *   post:
 *     summary: MoMo IPN (Instant Payment Notification)
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: IPN processed successfully
 *       400:
 *         description: Invalid request
 */
router.post("/momo/ipn", async (req, res) => {
  try {
    console.log("Received MoMo IPN:", req.body);

    const result = await paymentService.verifyAndCompletePayment(req.body);

    if (result.success) {
      res.status(200).json({ message: "IPN processed successfully" });
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (error) {
    console.error("IPN processing error:", error);
    res.status(500).json({ message: "IPN processing failed" });
  }
});

/**
 * @swagger
 * /api/payment/momo/verify:
 *   post:
 *     summary: Verify MoMo payment result
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to verify
 *             required:
 *               - orderId
 *     responses:
 *       200:
 *         description: Payment verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 starsAdded:
 *                   type: integer
 *                 newStarBalance:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.post("/momo/verify", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const result = await paymentService.queryPaymentStatus(orderId);
    res.json(result);
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's payment history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Unauthorized
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await paymentService.getUserPaymentHistory(req.user.userId);
    res.json(history);
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/status/{orderId}:
 *   get:
 *     summary: Check payment status
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID to check
 *     responses:
 *       200:
 *         description: Payment status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 amount:
 *                   type: integer
 *                 starsToAdd:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.get("/status/:orderId", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await paymentService.queryPaymentStatus(orderId);
    res.json(result);
  } catch (error) {
    console.error("Get payment status error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/payment/momo/create-item:
 *   post:
 *     summary: Create MoMo payment for item purchase
 *     tags: [Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID of the item to purchase
 *               quantity:
 *                 type: integer
 *                 description: Quantity to purchase
 *             required:
 *               - itemId
 *     responses:
 *       200:
 *         description: Payment URL created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/momo/create-item", authMiddleware, async (req, res) => {
  try {
    const { itemId, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!itemId) {
      return res.status(400).json({ message: "Item ID is required" });
    }

    // Get item details
    const Item = require("../models/Item");
    const item = await Item.findByPk(itemId);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.number < quantity) {
      return res.status(400).json({
        message: `Only ${item.number} items available, requested ${quantity}`,
      });
    }

    const totalAmount = item.price * quantity;

    // Create return URL with item info
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl = `${frontendUrl}/deposit?itemId=${itemId}&quantity=${quantity}&paymentType=momo`;

    const result = await paymentService.createPaymentOrder({
      userId,
      amount: totalAmount,
      starsToAdd: 0, // For item purchase, we don't add stars directly
      orderInfo: `Mua ${item.name} x${quantity}`,
      extraData: JSON.stringify({
        itemId,
        quantity,
        type: "item_purchase",
        returnUrl,
      }),
    });

    // Modify the paymentUrl to include return URL for MoMo
    if (result.success && result.paymentUrl) {
      const url = new URL(result.paymentUrl);
      url.searchParams.set("returnUrl", returnUrl);
      result.paymentUrl = url.toString();
    }

    res.json(result);
  } catch (error) {
    console.error("Create item payment error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
