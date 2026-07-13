import { Injectable } from "@nestjs/common";
import { LedgerGameType, PracticeActionType, PracticeHandStatus, PracticeRoomStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const [ledgerGames, practiceRooms, teams] = await Promise.all([
      this.prisma.ledgerGame.count({
        where: {
          OR: [
            { ownerUserId: userId },
            { players: { some: { userId } } }
          ]
        }
      }),
      this.prisma.practiceRoom.count({
        where: {
          OR: [
            { ownerUserId: userId },
            { players: { some: { userId } } }
          ]
        }
      }),
      this.prisma.teamMember.count({
        where: { userId, status: "ACTIVE" }
      })
    ]);

    return {
      ledgerGames,
      practiceRooms,
      teams
    };
  }

  async ledger(userId: string) {
    const games = await this.prisma.ledgerGame.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { players: { some: { userId } } }
        ]
      },
      select: {
        type: true,
        status: true,
        totalBuyIn: true,
        totalCashOut: true,
        totalProfit: true
      }
    });

    return {
      gameCount: games.length,
      personalCount: games.filter((game) => game.type === LedgerGameType.PERSONAL).length,
      teamCount: games.filter((game) => game.type === LedgerGameType.TEAM).length,
      totalBuyIn: games.reduce((sum, game) => sum + Number(game.totalBuyIn), 0),
      totalCashOut: games.reduce((sum, game) => sum + Number(game.totalCashOut), 0),
      totalProfit: games.reduce((sum, game) => sum + Number(game.totalProfit), 0)
    };
  }

  async practice(userId: string) {
    const rooms = await this.prisma.practiceRoom.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          { players: { some: { userId } } }
        ]
      },
      select: { mode: true, status: true }
    });
    return {
      roomCount: rooms.length,
      activeRoomCount: rooms.filter(
        (room) =>
          room.status === PracticeRoomStatus.WAITING ||
          room.status === PracticeRoomStatus.READY ||
          room.status === PracticeRoomStatus.PLAYING
      ).length,
      friendsRoomCount: rooms.filter((room) => room.mode === "FRIENDS").length,
      soloRoomCount: rooms.filter((room) => room.mode === "SOLO").length,
      ...(await this.practiceOverview(userId))
    };
  }

  async practiceOverview(userId: string) {
    const rows = await this.practiceRows(userId);
    const metrics = this.calculatePracticeMetrics(userId, rows);
    return {
      ...metrics,
      completedHandCount: rows.length,
      totalPracticeChipsNet: metrics.netResult,
      soloHandCount: rows.filter((row) => row.hand.room.mode === "SOLO").length,
      friendsHandCount: rows.filter((row) => row.hand.room.mode === "FRIENDS").length
    };
  }

  async practiceRecent(userId: string) {
    const rows = await this.practiceRows(userId, 20);
    return rows.map((row) => ({
      handId: row.handId,
      roomCode: row.hand.room.roomCode,
      mode: row.hand.room.mode,
      handNo: row.hand.handNo,
      boardCards: this.asCards(row.hand.boardCards),
      finalStatus: row.finalStatus,
      showdown: row.showdown,
      handRankDescription: row.handRankDescription,
      netResult: row.netResult || 0,
      endedAt: row.hand.endedAt || row.hand.startedAt
    }));
  }

  async practiceTrend(userId: string) {
    const rows = await this.practiceRows(userId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 13);
    const buckets = new Map<string, { date: string; handCount: number; netResult: number }>();
    for (let offset = 0; offset < 14; offset += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      const key = date.toISOString().slice(0, 10);
      buckets.set(key, { date: key, handCount: 0, netResult: 0 });
    }
    rows.forEach((row) => {
      const date = new Date(row.hand.endedAt || row.hand.startedAt).toISOString().slice(0, 10);
      const bucket = buckets.get(date);
      if (!bucket) return;
      bucket.handCount += 1;
      bucket.netResult += row.netResult || 0;
    });
    return [...buckets.values()];
  }

  async practiceAdvice(userId: string) {
    const rows = await this.practiceRows(userId);
    const metrics = this.calculatePracticeMetrics(userId, rows);
    const advice: Array<{ level: "INFO" | "WARNING"; title: string; content: string }> = [];
    if (metrics.totalHands < 10) {
      advice.push({
        level: "INFO",
        title: "先积累样本",
        content: "建议先完成至少 10 手牌，再根据 VPIP、PFR、摊牌率做针对性调整。"
      });
    }
    if (metrics.vpip > 45) {
      advice.push({
        level: "WARNING",
        title: "入池率偏高",
        content: "VPIP 偏高通常意味着翻前范围过松，可以优先减少弱牌跟注。"
      });
    }
    if (metrics.vpip >= 20 && metrics.pfr < 8) {
      advice.push({
        level: "INFO",
        title: "主动性偏低",
        content: "VPIP 与 PFR 差距较大时，可以练习用更清晰的强牌范围主动加注。"
      });
    }
    if (metrics.wtsd > 45) {
      advice.push({
        level: "INFO",
        title: "摊牌率偏高",
        content: "WTSD 偏高时，重点复盘转牌和河牌是否存在过度跟注。"
      });
    }
    if (metrics.aggressionFactor !== null && metrics.aggressionFactor < 1) {
      advice.push({
        level: "INFO",
        title: "攻击频率偏低",
        content: "下注与加注次数少于跟注次数时，可以练习价值下注和半诈唬的时机。"
      });
    }
    if (advice.length === 0) {
      advice.push({
        level: "INFO",
        title: "数据健康",
        content: "当前样本未发现明显异常，建议继续结合复盘观察不同位置和不同街道的决策。"
      });
    }
    return { metrics, advice };
  }

  private async practiceRows(userId: string, take?: number) {
    return this.prisma.practiceHandPlayer.findMany({
      where: { userId, hand: { status: PracticeHandStatus.FINISHED } },
      include: {
        hand: {
          include: {
            room: { select: { roomCode: true, mode: true, smallBlind: true, bigBlind: true } },
            actions: { orderBy: { createdAt: "asc" } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      ...(take ? { take } : {})
    });
  }

  private calculatePracticeMetrics(userId: string, rows: Awaited<ReturnType<StatsService["practiceRows"]>>) {
    const totalHands = rows.length;
    const netResult = rows.reduce((sum, row) => sum + (row.netResult || 0), 0);
    const showdownHands = rows.filter((row) => row.showdown).length;
    const wonShowdownHands = rows.filter((row) => row.showdown && row.finalStatus === "WINNER").length;
    const winHands = rows.filter((row) => row.finalStatus === "WINNER").length;
    const voluntaryActionTypes = new Set<PracticeActionType>([
      PracticeActionType.CALL,
      PracticeActionType.BET,
      PracticeActionType.RAISE,
      PracticeActionType.ALL_IN
    ]);
    const preflopRaiseActionTypes = new Set<PracticeActionType>([
      PracticeActionType.RAISE,
      PracticeActionType.ALL_IN
    ]);
    const aggressiveActionTypes = new Set<PracticeActionType>([
      PracticeActionType.BET,
      PracticeActionType.RAISE
    ]);
    const preflopVoluntaryHands = rows.filter((row) =>
      row.hand.actions.some(
        (action) =>
          action.userId === userId &&
          action.street === "PREFLOP" &&
          voluntaryActionTypes.has(action.actionType)
      )
    ).length;
    const preflopRaiseHands = rows.filter((row) =>
      row.hand.actions.some(
        (action) =>
          action.userId === userId &&
          action.street === "PREFLOP" &&
          preflopRaiseActionTypes.has(action.actionType)
      )
    ).length;
    const userActions = rows.flatMap((row) => row.hand.actions.filter((action) => action.userId === userId));
    const aggressiveActions = userActions.filter((action) =>
      aggressiveActionTypes.has(action.actionType)
    ).length;
    const callActions = userActions.filter((action) => action.actionType === PracticeActionType.CALL).length;
    return {
      totalHands,
      winRate: this.percent(winHands, totalHands),
      vpip: this.percent(preflopVoluntaryHands, totalHands),
      pfr: this.percent(preflopRaiseHands, totalHands),
      wtsd: this.percent(showdownHands, totalHands),
      wsd: this.percent(wonShowdownHands, showdownHands),
      aggressionFactor: callActions ? Number((aggressiveActions / callActions).toFixed(2)) : null,
      netResult,
      avgNet: totalHands ? Number((netResult / totalHands).toFixed(2)) : 0,
      showdownHands,
      winHands
    };
  }

  private percent(part: number, total: number) {
    return total ? Number(((part / total) * 100).toFixed(1)) : 0;
  }

  private asCards(value: unknown): string[] {
    return Array.isArray(value) ? value.map((card) => String(card)) : [];
  }
}
