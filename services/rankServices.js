const RANKS = require("../constants/rankLevel");

// Điều kiện ẩn để lên cấp (có thể lên cấp mà không cần đủ ELO)
const hiddenConditions = {
  2: (user) => user.total_matches >= 10 && user.win_rate >= 0.6,
  3: (user) => user.total_matches >= 20 && user.win_rate >= 0.6,
  4: (user) => user.total_matches >= 40 && user.win_rate >= 0.6,
  5: (user) => user.total_matches >= 80 && user.win_rate >= 0.6,
  6: (user) => user.total_matches >= 160 && user.win_rate >= 0.6,
  7: (user) => user.total_matches >= 320 && user.win_rate >= 0.6,
};

// Quyền lợi khi lên cấp (sao = gem)
const rewards = {
  2: { gem: 10 },
  3: { gem: 20 },
  4: { gem: 80 },
  5: { gem: 320 },
  6: { gem: 1280 },
  7: { gem: 5120 },
};

const getLevelFromElo = (elo) => {
  return RANKS.find((r) => elo >= r.minElo && elo <= r.maxElo)?.level || 1;
};

const getEloRangeFromLevel = (level, waitMinutes = 0) => {
  // Mở rộng range theo thời gian chờ
  // 1p30s = 1.5 phút: mở rộng ±1 cấp
  // 5 phút: mở rộng ±2 cấp
  let widenLevels = 0;
  if (waitMinutes >= 1.5) widenLevels = 1;
  if (waitMinutes >= 5) widenLevels = 2;

  const minLevel = Math.max(1, level - widenLevels);
  const maxLevel = Math.min(7, level + widenLevels);

  const minElo = RANKS.find((r) => r.level === minLevel)?.minElo ?? 0;
  const maxElo = RANKS.find((r) => r.level === maxLevel)?.maxElo ?? 3000;

  return [minElo, maxElo];
};

const getRankFee = (elo) => {
  return RANKS.find((r) => elo >= r.minElo && elo <= r.maxElo)?.fee || 1;
};

// Kiểm tra điều kiện ẩn để lên cấp
const checkHiddenPromotion = (user, currentLevel) => {
  const nextLevel = currentLevel + 1;
  const condition = hiddenConditions[nextLevel];
  return condition ? condition(user) : false;
};

// Trả thưởng khi lên cấp
const applyPromotionReward = async (user, newLevel) => {
  const reward = rewards[newLevel];
  if (!reward) return;

  if (reward.gem) user.gem += reward.gem;
  if (reward.coin) user.coin += reward.coin;

  await user.save();
};

module.exports = {
  getLevelFromElo,
  getEloRangeFromLevel,
  getRankFee,
  checkHiddenPromotion,
  applyPromotionReward,
};
