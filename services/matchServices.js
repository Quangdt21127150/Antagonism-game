const { Op } = require("sequelize");
const Match = require("../models/Match");
const MatchHistory = require("../models/MatchHistory");

const saveMatchHistory = async (matchId, content) => {
  const match = await Match.findByPk(matchId);
  if (!match) throw new Error("Match not found to save history");

  await MatchHistory.create({ match_id: matchId, content });
  return { message: "Match history saved successfully" };
};

const getMatches = async (userId) => {
  const matches = await Match.findAll({
    where: { [Op.or]: [{ white_id: userId }, { black_id: userId }] },
  });

  return { matches };
};

const getMatchHistory = async (matchId) => {
  const match = await Match.findOne({
    where: { id: matchId },
  });
  const history = await MatchHistory.findOne({
    where: { match_id: matchId },
  });

  if (!match || !history) throw new Error("No match found");

  const matchHistory = {
    ...match.dataValues,
    content: history.content,
  };

  return { matchHistory };
};

module.exports = { saveMatchHistory, getMatches, getMatchHistory };
