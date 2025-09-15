// constants/rankLevels.js
module.exports = [
  { level: 1, minElo: 0, maxElo: 500, fee: 1 },
  { level: 2, minElo: 501, maxElo: 1100, fee: 2 },
  { level: 3, minElo: 1101, maxElo: 1500, fee: 4 },
  { level: 4, minElo: 1501, maxElo: 2100, fee: 8 },
  { level: 5, minElo: 2101, maxElo: 2900, fee: 16 },
  { level: 6, minElo: 2901, maxElo: 4000, fee: 32 },
  { level: 7, minElo: 4001, maxElo: Infinity, fee: 64 },
];
