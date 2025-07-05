const { Op } = require("sequelize");
const Match = require("../models/Match");
const MatchHistory = require("../models/MatchHistory");
const sequelize = require("../config/postgres");
const User = require("../models/User");
const saveMatchHistory = async (matchId, content, status) => {
  const transaction = await sequelize.transaction();

  try {
    console.log("🔍 Fetching match:", matchId);
    const match = await Match.findByPk(matchId, {
      include: [
        { model: User, as: "white" },
        { model: User, as: "black" },
      ],
      transaction,
    });

    if (!match) {
      throw new Error("Match not found to save history");
    }
    console.log("✅ Match found:", match.id);

    if (status && !["win", "lose", "draw"].includes(status)) {
      throw new Error("Invalid status provided");
    }

    if (status && ["win", "lose"].includes(status)) {
      await match.update({ status }, { transaction });
      console.log("✅ Match status updated to:", status);
    }

    console.log("📝 Creating match history...");
    await MatchHistory.create({ match_id: matchId, content }, { transaction });
    console.log("✅ Match history saved");

    // Update Elo only for rank matches
    if (match.match_type === 1 && status && ["win", "lose"].includes(status)) {
      let winner, loser;
      if (status === "win") {
        winner = match.white;
        loser = match.black;
      } else if (status === "lose") {
        winner = match.black;
        loser = match.white;
      }

      if (!winner || !loser) {
        throw new Error("Winner or loser not found for Elo update");
      }

      console.log("⚡ Updating Elo: winner", winner.id, "loser", loser.id);

      const getKFactor = (elo) => {
        if (elo < 1000) return 32;
        if (elo < 2000) return 24;
        return 16;
      };

      const winnerK = getKFactor(winner.elo);
      const loserK = getKFactor(loser.elo);

      const expectedWin =
        1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
      const expectedLose = 1 - expectedWin;

      const newWinnerElo = Math.round(winner.elo + winnerK * (1 - expectedWin));
      const newLoserElo = Math.round(loser.elo - loserK * expectedLose);

      winner.elo = Math.min(3000, Math.max(0, newWinnerElo));
      loser.elo = Math.min(3000, Math.max(0, newLoserElo));

      await winner.save({ transaction });
      await loser.save({ transaction });

      console.log("✅ Elo updated: winner", winner.elo, "loser", loser.elo);
    }

    await transaction.commit();
    console.log("✅ Transaction committed for match:", matchId);

    return { message: "Match history saved successfully" };
  } catch (error) {
    console.log("❌ Error saving match history:", error.message);
    await transaction.rollback();
    throw error;
  }
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
