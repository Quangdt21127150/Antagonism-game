const express = require("express");
const router = express.Router();
const authServices = require("../services/authServices");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - id
 *         - username
 *         - email
 *       properties:
 *         id:
 *           type: string
 *           description: The user ID
 *         username:
 *           type: string
 *           description: The user's username
 *         email:
 *           type: string
 *           description: The user's email
 *         password:
 *           type: string
 *           description: The user's hashed password
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The user's creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The user's updation date
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Username and email are required
 *       409:
 *         description: User already exist
 */
router.post("/register", async (req, res) => {
  const { username, phone, password, confirmPassword } = req.body;
  try {
    const result = await authServices.register(
      username,
      phone,
      password,
      confirmPassword
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User login successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Invalid email or password
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await authServices.login(username, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/users/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       403:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const result = await authServices.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(error.status || 403).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const result = await authServices.logout(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Load a user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user with following id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await authServices.getProfile(req.user.userId);
    res.json(result.user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/users/check-token:
 *   get:
 *     summary: Load a user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Unauthorized
 */
router.get("/check-token", authMiddleware, async (req, res) => {
  try {
    const result = await authServices.checkToken(req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

// ==================== OAUTH 2.0 ROUTES ====================
const passport = require("../config/passport");

/**
 * @swagger
 * /api/users/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @swagger
 * /api/users/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect with tokens
 */
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    if (req.user) {
      // Redirect to frontend with tokens and user info
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      console.log("[OAuth][Google] Redirecting to:", frontendUrl);

      const redirectUrl = `${frontendUrl}/social_login_callback.html?accessToken=${
        req.user.accessToken
      }&refreshToken=${req.user.refreshToken}&user=${encodeURIComponent(
        JSON.stringify({
          id: req.user.user.id,
          username: req.user.user.username,
          email: req.user.user.email,
          full_name: req.user.user.full_name,
          avatar_url: req.user.user.avatar_url,
        })
      )}`;
      res.redirect(redirectUrl);
    } else {
      // Redirect to frontend error page
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}/social_login_callback.html?error=google_oauth_failed`
      );
    }
  }
);

/**
 * @swagger
 * /api/users/auth/facebook:
 *   get:
 *     summary: Initiate Facebook OAuth login
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Facebook OAuth
 */
router.get(
  "/auth/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

/**
 * @swagger
 * /api/users/auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect with tokens
 */
router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  (req, res) => {
    if (req.user) {
      // Redirect to frontend with tokens and user info
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      console.log("[OAuth][Facebook] Redirecting to:", frontendUrl);

      const redirectUrl = `${frontendUrl}/social_login_callback.html?accessToken=${
        req.user.accessToken
      }&refreshToken=${req.user.refreshToken}&user=${encodeURIComponent(
        JSON.stringify({
          id: req.user.user.id,
          username: req.user.user.username,
          email: req.user.user.email,
          full_name: req.user.user.full_name,
          avatar_url: req.user.user.avatar_url,
        })
      )}`;
      res.redirect(redirectUrl);
    } else {
      // Redirect to frontend error page
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}/social_login_callback.html?error=facebook_oauth_failed`
      );
    }
  }
);

/**
 * @swagger
 * /api/users/auth/mobile/google:
 *   post:
 *     summary: Mobile Google OAuth login
 *     tags: [Authentication]
 *     description: Login with Google access token from mobile app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               googleToken:
 *                 type: string
 *                 description: Google access token from mobile SDK
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Invalid token
 */
router.post("/auth/mobile/google", async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    // Verify Google token and get user info
    const { OAuth2Client } = require("google-auth-library");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const fullName = payload.name;
    const avatarUrl = payload.picture;

    // Find or create user (same logic as passport strategy)
    const User = require("../models/User");
    let user = await User.findOne({ where: { google_id: googleId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      const username = (email.split("@")[0] || `gg_${Date.now()}`).slice(0, 30);
      user = await User.create({
        full_name: fullName || username,
        username,
        email,
        google_id: googleId,
        avatar_url: avatarUrl,
      });
    } else {
      const updates = {};
      if (!user.google_id) updates.google_id = googleId;
      if (avatarUrl && user.avatar_url !== avatarUrl)
        updates.avatar_url = avatarUrl;
      if (Object.keys(updates).length) {
        await user.update(updates);
      }
    }

    // Generate JWT tokens
    const jwt = require("jsonwebtoken");
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "365d" }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "15d" }
    );

    // Update authorization
    const Authorization = require("../models/Authorization");
    await Authorization.destroy({ where: { user_id: user.id } });
    await Authorization.create({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        total_matches: user.total_matches,
        wins: user.wins,
        losses: user.losses,
        win_rate: user.win_rate,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Mobile Google OAuth error:", error);
    res.status(400).json({ message: "Invalid Google token" });
  }
});

/**
 * @swagger
 * /api/users/auth/mobile/facebook:
 *   post:
 *     summary: Mobile Facebook OAuth login
 *     tags: [Authentication]
 *     description: Login with Facebook access token from mobile app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               facebookToken:
 *                 type: string
 *                 description: Facebook access token from mobile SDK
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid token
 */
router.post("/auth/mobile/facebook", async (req, res) => {
  try {
    const { facebookToken } = req.body;

    if (!facebookToken) {
      return res.status(400).json({ message: "Facebook token is required" });
    }

    // Verify Facebook token
    const axios = require("axios");
    const response = await axios.get(
      `https://graph.facebook.com/me?access_token=${facebookToken}&fields=id,name,email,picture`
    );

    if (!response.data.id) {
      return res.status(400).json({ message: "Invalid Facebook token" });
    }

    const facebookId = response.data.id;
    const email = response.data.email;
    const fullName = response.data.name;
    const avatarUrl = response.data.picture?.data?.url;

    // Find or create user
    const User = require("../models/User");
    let user = await User.findOne({ where: { facebook_id: facebookId } });
    if (!user && email) {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      const username = email
        ? email.split("@")[0].slice(0, 30)
        : `fb_${Date.now()}`;
      user = await User.create({
        full_name: fullName || username,
        username,
        email: email || null,
        facebook_id: facebookId,
        avatar_url: avatarUrl,
      });
    } else {
      const updates = {};
      if (!user.facebook_id) updates.facebook_id = facebookId;
      if (avatarUrl && user.avatar_url !== avatarUrl)
        updates.avatar_url = avatarUrl;
      if (Object.keys(updates).length) {
        await user.update(updates);
      }
    }

    // Generate JWT tokens
    const jwt = require("jsonwebtoken");
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "365d" }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "15d" }
    );

    // Update authorization
    const Authorization = require("../models/Authorization");
    await Authorization.destroy({ where: { user_id: user.id } });
    await Authorization.create({
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        total_matches: user.total_matches,
        wins: user.wins,
        losses: user.losses,
        win_rate: user.win_rate,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Mobile Facebook OAuth error:", error);
    res.status(400).json({ message: "Invalid Facebook token" });
  }
});

/**
 * @swagger
 * /api/users/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid token
 */
router.get("/auth/verify", authMiddleware, async (req, res) => {
  try {
    const User = require("../models/User");
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(401).json({ valid: false, message: "User not found" });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        total_matches: user.total_matches,
        wins: user.wins,
        losses: user.losses,
        win_rate: user.win_rate,
        selected_skins: user.selected_skins,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

/**
 * @swagger
 * /api/users/auth/link-social:
 *   post:
 *     summary: Link social account to existing user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, facebook]
 *               token:
 *                 type: string
 *                 description: OAuth token from social provider
 *     responses:
 *       200:
 *         description: Social account linked successfully
 *       400:
 *         description: Invalid request or token
 */
router.post("/auth/link-social", authMiddleware, async (req, res) => {
  try {
    const { provider, token } = req.body;
    const User = require("../models/User");

    if (!provider || !token) {
      return res
        .status(400)
        .json({ message: "Provider and token are required" });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let socialId, avatarUrl;

    if (provider === "google") {
      const { OAuth2Client } = require("google-auth-library");
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      socialId = payload.sub;
      avatarUrl = payload.picture;

      await user.update({
        google_id: socialId,
        avatar_url: avatarUrl || user.avatar_url,
      });
    } else if (provider === "facebook") {
      const axios = require("axios");
      const response = await axios.get(
        `https://graph.facebook.com/me?access_token=${token}&fields=id,picture`
      );
      socialId = response.data.id;
      avatarUrl = response.data.picture?.data?.url;

      await user.update({
        facebook_id: socialId,
        avatar_url: avatarUrl || user.avatar_url,
      });
    } else {
      return res.status(400).json({ message: "Unsupported provider" });
    }

    res.json({
      success: true,
      message: `${provider} account linked successfully`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        google_id: user.google_id,
        facebook_id: user.facebook_id,
      },
    });
  } catch (error) {
    console.error("Link social account error:", error);
    res.status(400).json({ message: "Failed to link social account" });
  }
});

/**
 * @swagger
 * /api/users/auth/success:
 *   get:
 *     summary: OAuth success handler (temporary)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: access_token
 *         schema:
 *           type: string
 *       - in: query
 *         name: refresh_token
 *         schema:
 *           type: string
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OAuth success page
 */
router.get("/auth/success", (req, res) => {
  const { access_token, refresh_token, user } = req.query;

  if (!access_token || !refresh_token) {
    return res.status(400).json({
      error: "Missing tokens",
      message: "Access token and refresh token are required",
    });
  }

  try {
    const userData = user ? JSON.parse(decodeURIComponent(user)) : null;

    res.json({
      success: true,
      message: "OAuth login successful!",
      data: {
        access_token,
        refresh_token,
        user: userData,
      },
      instructions: {
        frontend_usage:
          "Store the tokens in localStorage and use access_token for API calls",
        api_header: `Authorization: Bearer ${access_token}`,
        test_api: "GET /api/users/me with the access token",
      },
    });
  } catch (error) {
    res.status(400).json({
      error: "Invalid user data",
      message: "Failed to parse user information",
    });
  }
});

module.exports = router;
