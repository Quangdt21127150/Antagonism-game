const express = require("express");
const router = express.Router();
const sequelize = require("../config/postgres");
const authMiddleware = require("../middleware/authMiddleware");

// Helper to run leaderboard query
async function getLeaderboard(period, userId) {
  // period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'overall'
  // Metric: number of wins in ranked matches (matches.winner_id)
  // Fallback if no activity: users still get rank > N based on zero wins

  let dateFilter = "";
  if (period === "daily") {
    dateFilter = `
      AND m.completed_at >= date_trunc('day', CURRENT_DATE)
      AND m.completed_at < date_trunc('day', CURRENT_DATE) + interval '1 day'
    `;
  } else if (period === "weekly") {
    dateFilter = `
      AND m.completed_at >= date_trunc('week', CURRENT_DATE)
      AND m.completed_at < date_trunc('week', CURRENT_DATE) + interval '1 week'
    `;
  } else if (period === "monthly") {
    dateFilter = `
      AND m.completed_at >= date_trunc('month', CURRENT_DATE)
      AND m.completed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
    `;
  } else if (period === "yearly") {
    dateFilter = `
      AND m.completed_at >= date_trunc('year', CURRENT_DATE)
      AND m.completed_at < date_trunc('year', CURRENT_DATE) + interval '1 year'
    `;
  }

  // Top 50
  const [topRows] = await sequelize.query(
    `
    WITH wins AS (
      SELECT m.winner_id AS user_id, COUNT(*) AS win_count
      FROM matches m
      WHERE m.status = 'completed' ${dateFilter}
      GROUP BY m.winner_id
    ),
    ranks AS (
      SELECT u.id, u.username, u.avatar_url, u.elo, COALESCE(w.win_count, 0) AS wins,
             RANK() OVER (ORDER BY COALESCE(w.win_count, 0) DESC, u.elo DESC, u.created_at ASC) AS rank
      FROM users u
      LEFT JOIN wins w ON w.user_id = u.id
    )
    SELECT id, username, avatar_url, elo, wins, rank
    FROM ranks
    ORDER BY rank ASC
    LIMIT 50;
  `
  );

  // User rank
  const [[me]] = await sequelize.query(
    `
    WITH wins AS (
      SELECT m.winner_id AS user_id, COUNT(*) AS win_count
      FROM matches m
      WHERE m.status = 'completed' ${dateFilter}
      GROUP BY m.winner_id
    ),
    ranks AS (
      SELECT u.id, u.username, u.avatar_url, u.elo, COALESCE(w.win_count, 0) AS wins,
             RANK() OVER (ORDER BY COALESCE(w.win_count, 0) DESC, u.elo DESC, u.created_at ASC) AS rank
      FROM users u
      LEFT JOIN wins w ON w.user_id = u.id
    )
    SELECT id, username, avatar_url, elo, wins, rank
    FROM ranks
    WHERE id = :userId;
  `,
    { replacements: { userId } }
  );

  return { top: topRows, me: me || null };
}

// Endpoint for daily leaderboard
router.get("/leaderboard/daily", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const data = await getLeaderboard("daily", userId);
    res.json({ period: "daily", ...data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint for weekly leaderboard
router.get("/leaderboard/weekly", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const data = await getLeaderboard("weekly", userId);
    res.json({ period: "weekly", ...data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint for monthly leaderboard
router.get("/leaderboard/monthly", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const data = await getLeaderboard("monthly", userId);
    res.json({ period: "monthly", ...data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint for yearly leaderboard
router.get("/leaderboard/yearly", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const data = await getLeaderboard("yearly", userId);
    res.json({ period: "yearly", ...data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Endpoint for overall leaderboard
router.get("/leaderboard/overall", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const data = await getLeaderboard("overall", userId);
    res.json({ period: "overall", ...data });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
