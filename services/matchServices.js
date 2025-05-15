const Match = require("../models/Match");
const MatchHistory = require("../models/MatchHistory");

const saveMatchHistory = async (matchId, content) => {
  const match = await Match.findByPk(matchId);
  if (!match) throw new Error("Match not found");

  await MatchHistory.create({ match_id: matchId, content });
  return { message: "Match history saved successfully" };
};

const getMatchHistory = async (matchId) => {
  const match = await Match.findOne({
    where: { match_id: matchId },
  });
  if (!match) throw new Error("No match found");
  return { match };
};

module.exports = { saveMatchHistory, getMatchHistory };
