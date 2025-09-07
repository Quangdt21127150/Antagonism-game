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

    if (status && ["win", "lose", "draw"].includes(status)) {
      // Set completed_at timestamp when match ends
      await match.update(
        {
          status,
          completed_at: new Date(),
        },
        { transaction }
      );
      console.log("✅ Match status updated to:", status);
    }

    console.log("📝 Creating match history...");
    await MatchHistory.create({ match_id: matchId, content }, { transaction });
    console.log("✅ Match history saved");

    // Update Elo only for rank matches
    if (
      match.match_type === 1 &&
      status &&
      ["win", "lose", "draw"].includes(status)
    ) {
      let winner, loser;

      if (status === "draw") {
        // Handle draw case - both players get total_matches updated
        const whitePlayer = match.white;
        const blackPlayer = match.black;

        if (!whitePlayer || !blackPlayer) {
          throw new Error("Players not found for draw update");
        }

        // Store ELO before changes for draw
        const whiteEloBefore = whitePlayer.elo;
        const blackEloBefore = blackPlayer.elo;

        // Update total_matches for both players
        whitePlayer.total_matches = (whitePlayer.total_matches || 0) + 1;
        blackPlayer.total_matches = (blackPlayer.total_matches || 0) + 1;

        // Recalculate win rates
        whitePlayer.win_rate =
          whitePlayer.total_matches > 0
            ? Math.round(
                ((whitePlayer.wins || 0) / whitePlayer.total_matches) * 10000
              ) / 100
            : 0;
        blackPlayer.win_rate =
          blackPlayer.total_matches > 0
            ? Math.round(
                ((blackPlayer.wins || 0) / blackPlayer.total_matches) * 10000
              ) / 100
            : 0;

        await whitePlayer.save({ transaction });
        await blackPlayer.save({ transaction });

        // Store ELO data for draw (no ELO change)
        const drawEloData = {
          white_elo_before: whiteEloBefore,
          black_elo_before: blackEloBefore,
          white_elo_after: whiteEloBefore,
          black_elo_after: blackEloBefore,
        };

        await match.update(drawEloData, { transaction });
        console.log(
          "✅ Draw match processed - total_matches updated for both players"
        );
      } else if (status === "win") {
        winner = match.white;
        loser = match.black;
      } else if (status === "lose") {
        winner = match.black;
        loser = match.white;
      }

      // Only process ELO changes for win/lose (not draw)
      if (winner && loser) {
        if (!winner || !loser) {
          throw new Error("Winner or loser not found for Elo update");
        }

        console.log("⚡ Updating Elo: winner", winner.id, "loser", loser.id);

        // Store ELO before changes
        const winnerEloBefore = winner.elo;
        const loserEloBefore = loser.elo;

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

        const newWinnerElo = Math.round(
          winner.elo + winnerK * (1 - expectedWin)
        );
        const newLoserElo = Math.round(loser.elo - loserK * expectedLose);

        winner.elo = Math.min(3000, Math.max(0, newWinnerElo));
        loser.elo = Math.min(3000, Math.max(0, newLoserElo));

        // Update win/lose counts and statistics
        winner.wins = (winner.wins || 0) + 1;
        winner.total_matches = (winner.total_matches || 0) + 1;
        loser.losses = (loser.losses || 0) + 1;
        loser.total_matches = (loser.total_matches || 0) + 1;

        // Calculate win rates
        winner.win_rate =
          winner.total_matches > 0
            ? Math.round((winner.wins / winner.total_matches) * 10000) / 100
            : 0;
        loser.win_rate =
          loser.total_matches > 0
            ? Math.round(((loser.wins || 0) / loser.total_matches) * 10000) /
              100
            : 0;

        await winner.save({ transaction });
        await loser.save({ transaction });

        // Store ELO changes in match record
        const eloUpdateData = {
          white_elo_before: status === "win" ? winnerEloBefore : loserEloBefore,
          black_elo_before: status === "win" ? loserEloBefore : winnerEloBefore,
          white_elo_after: status === "win" ? winner.elo : loser.elo,
          black_elo_after: status === "win" ? loser.elo : winner.elo,
        };

        await match.update(eloUpdateData, { transaction });

        console.log("✅ Elo updated: winner", winner.elo, "loser", loser.elo);
        console.log("📊 ELO tracking saved to match record");
      }
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
    include: [
      { model: User, as: "white", attributes: ["id", "username", "elo"] },
      { model: User, as: "black", attributes: ["id", "username", "elo"] },
    ],
  });
  const history = await MatchHistory.findOne({
    where: { match_id: matchId },
  });

  if (!match || !history) throw new Error("No match found");

  const matchHistory = {
    ...match.dataValues,
    content: history.content,
    // Include ELO changes if available
    eloChanges:
      match.white_elo_before && match.black_elo_before
        ? {
            white: {
              before: match.white_elo_before,
              after: match.white_elo_after,
              change: match.white_elo_after - match.white_elo_before,
            },
            black: {
              before: match.black_elo_before,
              after: match.black_elo_after,
              change: match.black_elo_after - match.black_elo_before,
            },
          }
        : null,
    // Calculate match duration if both timestamps exist
    duration:
      match.started_at && match.completed_at
        ? Math.round(
            (new Date(match.completed_at) - new Date(match.started_at)) / 1000
          )
        : null,
  };

  return { matchHistory };
};

const startMatch = async (matchId) => {
  const transaction = await sequelize.transaction();

  try {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: User, as: "white" },
        { model: User, as: "black" },
      ],
      transaction,
    });

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.status !== "waiting") {
      throw new Error("Match is not in waiting status");
    }

    if (!match.black_id) {
      throw new Error("Match needs a second player to start");
    }

    // Set ELO before values and start timestamp
    const updateData = {
      status: "ongoing",
      started_at: new Date(),
      white_elo_before: match.white.elo,
      black_elo_before: match.black.elo,
    };

    await match.update(updateData, { transaction });
    await transaction.commit();

    console.log("🚀 Match started:", matchId);
    return {
      message: "Match started successfully",
      matchId: match.id,
      startedAt: updateData.started_at,
    };
  } catch (error) {
    console.log("❌ Error starting match:", error.message);
    await transaction.rollback();
    throw error;
  }
};

module.exports = { saveMatchHistory, getMatches, getMatchHistory, startMatch };
