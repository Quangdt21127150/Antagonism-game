const { Op } = require("sequelize");
const Match = require("../models/Match");
const MatchHistory = require("../models/MatchHistory");

const saveMatchHistory = async (matchId, content) => {
  // Start a transaction to ensure atomicity
  const transaction = await sequelize.transaction();

  try {
    // Find the match
    const match = await Match.findByPk(matchId, {
      include: [
        { model: User, as: "white" },
        { model: User, as: "black" },
      ],
      transaction,
    });

    if (!match) {
      await transaction.rollback();
      throw new Error("Match not found to save history");
    }

    // Save match history
    await MatchHistory.create({ match_id: matchId, content }, { transaction });

    // Update Elo if match_type is 1 and status is win or lose
    if (match.match_type === 1 && ["win", "lose"].includes(match.status)) {
      let winner, loser;

      // Determine winner and loser based on status
      if (match.status === "win") {
        winner = match.white; // white_id wins
        loser = match.black; // black_id loses
      } else if (match.status === "lose") {
        winner = match.black; // black_id wins
        loser = match.white; // white_id loses
      }

      // Ensure both players exist
      if (!winner || !loser) {
        await transaction.rollback();
        throw new Error("Winner or loser not found");
      }

      // K-factor based on Elo
      const getKFactor = (elo) => {
        if (elo < 1000) return 32; // New player
        if (elo < 2000) return 24; // Intermediate
        return 16; // Expert
      };

      const winnerK = getKFactor(winner.elo);
      const loserK = getKFactor(loser.elo);

      // Calculate expected scores
      const expectedWin =
        1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
      const expectedLose = 1 - expectedWin;

      // Update Elo
      const newWinnerElo = Math.round(winner.elo + winnerK * (1 - expectedWin));
      const newLoserElo = Math.round(loser.elo - loserK * expectedLose);

      // Clamp Elo between 0 and 3000
      winner.elo = Math.min(3000, Math.max(0, newWinnerElo));
      loser.elo = Math.min(3000, Math.max(0, newLoserElo));

      // Save updated Elo
      await winner.save({ transaction });
      await loser.save({ transaction });
    }

    // Commit transaction
    await transaction.commit();

    return { message: "Match history saved successfully" };
  } catch (error) {
    // Rollback transaction on error
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
