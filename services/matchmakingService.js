const { Op } = require("sequelize");
const User = require("../models/User");
const Match = require("../models/Match");
const Transaction = require("../models/Transaction");
const sequelize = require("../config/postgres");
const {
  getLevelFromElo,
  getEloRangeFromLevel,
  getRankFee,
} = require("./rankServices");

class MatchmakingService {
  constructor() {
    // Unity xử lý toàn bộ game, BE chỉ nhận kết quả
    this.reservedMatches = new Map(); // matchId -> { users: [{userId, fee, currencyType}], reservedAt }
  }

  /**
   * Kiểm tra eligibility để chơi rank match
   */
  async checkRankEligibility(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const rankFee = getRankFee(user.elo);
    const availableGem = user.gem - user.locked_gem;
    const availableCoin = user.coin - user.locked_coin;
    const userLevel = getLevelFromElo(user.elo);

    const canPlayRank = availableGem >= rankFee || availableCoin >= rankFee;

    let message = "";
    if (canPlayRank) {
      message = `Có thể chơi rank cấp ${userLevel}`;
    } else {
      if (availableGem < rankFee && availableCoin < rankFee) {
        message = `Bạn không đủ sao để đánh xếp hạng cấp ${userLevel}. Cần ${rankFee} sao, hiện có ${Math.max(
          availableGem,
          availableCoin
        )} sao.`;
      } else if (availableGem < rankFee) {
        message = `Bạn không đủ gem để đánh xếp hạng cấp ${userLevel}. Cần ${rankFee} gem, hiện có ${availableGem} gem.`;
      } else {
        message = `Bạn không đủ coin để đánh xếp hạng cấp ${userLevel}. Cần ${rankFee} coin, hiện có ${availableCoin} coin.`;
      }
    }

    return {
      canPlayRank,
      requiredFee: rankFee,
      availableGem,
      availableCoin,
      userLevel,
      elo: user.elo,
      message,
    };
  }

  /**
   * Unity gọi khi bắt đầu tìm match - reserve phí
   */
  async reserveMatchFee(userId, matchId, fee, currencyType) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { lock: true, transaction });
      if (!user) {
        throw new Error("User not found");
      }

      const availableAmount =
        currencyType === "gem"
          ? user.gem - user.locked_gem
          : user.coin - user.locked_coin;

      if (availableAmount < fee) {
        const currencyName = currencyType === "gem" ? "sao" : "coin";
        throw new Error(
          `Bạn không đủ ${currencyName} để đánh xếp hạng. Cần ${fee} ${currencyName}, hiện có ${availableAmount} ${currencyName}.`
        );
      }

      // Lock currency
      if (currencyType === "gem") {
        user.locked_gem += fee;
      } else {
        user.locked_coin += fee;
      }

      await user.save({ transaction });

      // Log transaction
      await Transaction.create(
        {
          user_id: userId,
          match_id: matchId,
          transaction_type: "FEE_RESERVE",
          amount: fee,
          currency_type: currencyType,
          status: "PENDING",
          description: `Reserve ${fee} ${currencyType} for match ${matchId}`,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Đã reserve ${fee} ${currencyType} cho trận đấu`,
        lockedAmount:
          currencyType === "gem" ? user.locked_gem : user.locked_coin,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Khi trận bắt đầu - commit phí (trừ thật)
   */
  async commitMatchFee(userId, matchId) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { lock: true, transaction });
      if (!user) {
        throw new Error("User not found");
      }

      const match = await Match.findByPk(matchId, { transaction });
      if (!match) {
        throw new Error("Match not found");
      }

      if (!match.fee_reserved) {
        throw new Error("Match fee chưa được reserve");
      }

      // Commit locked currency
      if (match.currency_type === "gem") {
        if (user.locked_gem < match.match_fee) {
          throw new Error("Không đủ gem đã reserve để commit");
        }
        user.gem -= match.match_fee;
        user.locked_gem -= match.match_fee;
      } else {
        if (user.locked_coin < match.match_fee) {
          throw new Error("Không đủ coin đã reserve để commit");
        }
        user.coin -= match.match_fee;
        user.locked_coin -= match.match_fee;
      }

      await user.save({ transaction });

      // Update transaction status
      await Transaction.update(
        {
          status: "COMPLETED",
          description: `Committed ${match.match_fee} ${match.currency_type} for match ${matchId}`,
        },
        {
          where: {
            user_id: userId,
            match_id: matchId,
            transaction_type: "FEE_RESERVE",
            status: "PENDING",
          },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Đã trừ ${match.match_fee} ${match.currency_type} cho trận đấu`,
        remainingBalance: match.currency_type === "gem" ? user.gem : user.coin,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Khi user thoát trước trận - release phí đã lock
   */
  async releaseMatchFee(userId, matchId) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(userId, { lock: true, transaction });
      if (!user) {
        throw new Error("User not found");
      }

      const match = await Match.findByPk(matchId, { transaction });
      if (!match) {
        throw new Error("Match not found");
      }

      // Release locked currency
      if (match.currency_type === "gem") {
        if (user.locked_gem < match.match_fee) {
          throw new Error("Không có gem đã reserve để release");
        }
        user.locked_gem -= match.match_fee;
      } else {
        if (user.locked_coin < match.match_fee) {
          throw new Error("Không có coin đã reserve để release");
        }
        user.locked_coin -= match.match_fee;
      }

      await user.save({ transaction });

      // Update transaction status
      await Transaction.update(
        {
          status: "CANCELLED",
          description: `Released ${match.match_fee} ${match.currency_type} for match ${matchId}`,
        },
        {
          where: {
            user_id: userId,
            match_id: matchId,
            transaction_type: "FEE_RESERVE",
            status: "PENDING",
          },
          transaction,
        }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Đã hoàn trả ${match.match_fee} ${match.currency_type} đã reserve`,
        remainingLocked:
          match.currency_type === "gem" ? user.locked_gem : user.locked_coin,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Unity gọi khi tìm được đối thủ - tạo match record
   */
  async createMatch(whiteId, blackId, fee, currencyType) {
    const match = await Match.create({
      white_id: whiteId,
      black_id: blackId,
      status: "pending",
      match_fee: fee,
      currency_type: currencyType,
      fee_reserved: false, // Sẽ được set true khi reserve
      fee_committed: false,
    });

    return match;
  }

  /**
   * Unity gọi khi game kết thúc - xử lý kết quả
   */
  async processMatchResult(matchId, winnerId, moves, gameData) {
    const transaction = await sequelize.transaction();

    try {
      const match = await Match.findByPk(matchId, { transaction });
      if (!match) {
        throw new Error("Match not found");
      }

      // Cập nhật match status
      match.status = "completed";
      match.winner_id = winnerId;
      match.completed_at = new Date();
      await match.save({ transaction });

      // Lưu match history
      const MatchHistory = require("../models/MatchHistory");
      await MatchHistory.create(
        {
          match_id: matchId,
          content: {
            winner: winnerId,
            moves: moves,
            gameData: gameData,
            completed_at: new Date(),
          },
        },
        { transaction }
      );

      // Tính ELO và cập nhật profile
      const loserId =
        match.white_id === winnerId ? match.black_id : match.white_id;

      // Import matchServices để tính ELO
      const matchServices = require("./matchServices");
      await matchServices.updateElo(winnerId, loserId);
      await matchServices.updateProfileStats(winnerId, true);
      await matchServices.updateProfileStats(loserId, false);

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Lấy thông tin reserved matches (cho admin/monitoring)
   */
  getReservedMatchesInfo() {
    return {
      totalReserved: this.reservedMatches.size,
      reservedMatches: Array.from(this.reservedMatches.keys()),
    };
  }

  /**
   * Cleanup expired reservations (có thể gọi định kỳ)
   */
  async cleanupExpiredReservations() {
    const now = new Date();
    const expiredMatches = [];

    for (const [matchId, data] of this.reservedMatches.entries()) {
      const timeDiff = now - data.reservedAt;
      if (timeDiff > 5 * 60 * 1000) {
        // 5 phút
        expiredMatches.push(matchId);
      }
    }

    for (const matchId of expiredMatches) {
      try {
        await this.releaseMatchFee(matchId);
      } catch (error) {
        console.error(`Failed to cleanup expired match ${matchId}:`, error);
      }
    }
  }
}

module.exports = new MatchmakingService();
