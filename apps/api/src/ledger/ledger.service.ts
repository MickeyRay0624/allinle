import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  LedgerConfirmStatus,
  LedgerGameStatus,
  LedgerGameType,
  LedgerTransactionType,
  Prisma,
  RiskLevel
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RiskService } from "../risk/risk.service";
import { TeamsService } from "../teams/teams.service";
import { AddLedgerPlayerDto } from "./dto/add-ledger-player.dto";
import { AddLedgerTransactionDto } from "./dto/add-ledger-transaction.dto";
import { ConfirmLedgerDto } from "./dto/confirm-ledger.dto";
import { CreateLedgerGameDto } from "./dto/create-ledger-game.dto";
import { UpdateLedgerGameDto } from "./dto/update-ledger-game.dto";

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly riskService: RiskService
  ) {}

  async createGame(userId: string, dto: CreateLedgerGameDto) {
    if (dto.type === LedgerGameType.TEAM && !dto.teamId) {
      throw new BadRequestException("团队记账必须选择团队");
    }
    if (dto.type === LedgerGameType.PERSONAL && dto.teamId) {
      throw new BadRequestException("个人记账不能绑定团队");
    }
    if (dto.teamId) {
      await this.teamsService.assertMember(dto.teamId, userId);
    }

    await this.riskService.logSensitiveContent({
      userId,
      source: "ledger.title",
      content: dto.title
    });
    await this.riskService.logSensitiveContent({
      userId,
      source: "ledger.note",
      content: dto.note
    });

    const game = await this.prisma.ledgerGame.create({
      data: {
        ownerUserId: userId,
        teamId: dto.teamId,
        type: dto.type,
        title: dto.title,
        blindLevel: dto.blindLevel,
        gameDate: new Date(dto.gameDate),
        durationMinutes: dto.durationMinutes,
        status: LedgerGameStatus.ONGOING,
        note: dto.note
      }
    });

    if (dto.type === LedgerGameType.PERSONAL && (dto.initialBuyIn || dto.initialCashOut)) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.addPlayer(userId, game.id, {
        userId,
        displayName: dto.initialDisplayName || user?.nickname || "我",
        buyInAmount: dto.initialBuyIn,
        cashOutAmount: dto.initialCashOut
      });
      return this.getGame(userId, game.id);
    }

    return this.getGame(userId, game.id);
  }

  async listGames(userId: string) {
    return this.prisma.ledgerGame.findMany({
      where: {
        OR: [
          { ownerUserId: userId },
          {
            team: {
              members: {
                some: {
                  userId,
                  status: "ACTIVE"
                }
              }
            }
          }
        ]
      },
      include: {
        players: true,
        team: { select: { id: true, name: true } }
      },
      orderBy: { gameDate: "desc" }
    });
  }

  async getGame(userId: string, gameId: string) {
    await this.assertGameAccess(userId, gameId);
    const game = await this.prisma.ledgerGame.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            user: { select: { id: true, nickname: true, avatarUrl: true } },
            transactions: { orderBy: { createdAt: "asc" } }
          }
        },
        transactions: true,
        confirmations: true,
        team: { select: { id: true, name: true } }
      }
    });
    if (!game) throw new NotFoundException("记账牌局不存在");
    return game;
  }

  async updateGame(userId: string, gameId: string, dto: UpdateLedgerGameDto) {
    const game = await this.assertGameAccess(userId, gameId);
    if (game.ownerUserId !== userId) {
      throw new ForbiddenException("只有创建者可以修改牌局基础信息");
    }

    await this.riskService.logSensitiveContent({
      userId,
      source: "ledger.title",
      content: dto.title
    });
    await this.riskService.logSensitiveContent({
      userId,
      source: "ledger.note",
      content: dto.note
    });

    await this.prisma.ledgerGame.update({
      where: { id: gameId },
      data: {
        title: dto.title,
        blindLevel: dto.blindLevel,
        gameDate: dto.gameDate ? new Date(dto.gameDate) : undefined,
        durationMinutes: dto.durationMinutes,
        status: dto.status,
        note: dto.note
      }
    });
    return this.getGame(userId, gameId);
  }

  async addPlayer(userId: string, gameId: string, dto: AddLedgerPlayerDto) {
    await this.assertGameAccess(userId, gameId);
    const player = await this.prisma.ledgerPlayer.create({
      data: {
        gameId,
        userId: dto.userId,
        displayName: dto.displayName
      }
    });

    if (dto.buyInAmount && dto.buyInAmount > 0) {
      await this.createTransaction(gameId, player.id, LedgerTransactionType.BUY_IN, dto.buyInAmount);
    }
    if (dto.cashOutAmount && dto.cashOutAmount > 0) {
      await this.createTransaction(gameId, player.id, LedgerTransactionType.CASH_OUT, dto.cashOutAmount);
    }
    await this.recalculateGame(gameId);
    return this.getGame(userId, gameId);
  }

  async addTransaction(userId: string, gameId: string, dto: AddLedgerTransactionDto) {
    await this.assertGameAccess(userId, gameId);
    const player = await this.prisma.ledgerPlayer.findFirst({
      where: { id: dto.playerId, gameId }
    });
    if (!player) {
      throw new BadRequestException("玩家不属于该记账牌局");
    }
    await this.createTransaction(gameId, dto.playerId, dto.type, dto.amount, dto.note);
    await this.recalculateGame(gameId);
    return this.getGame(userId, gameId);
  }

  async finishGame(userId: string, gameId: string) {
    await this.assertGameAccess(userId, gameId);
    await this.recalculateGame(gameId);
    await this.prisma.ledgerGame.update({
      where: { id: gameId },
      data: { status: LedgerGameStatus.FINISHED }
    });
    return this.getGame(userId, gameId);
  }

  async confirmGame(userId: string, gameId: string, dto: ConfirmLedgerDto) {
    await this.assertGameAccess(userId, gameId);
    await this.prisma.ledgerConfirmation.upsert({
      where: {
        gameId_userId: {
          gameId,
          userId
        }
      },
      update: {
        status: LedgerConfirmStatus.CONFIRMED,
        note: dto.note,
        confirmedAt: new Date()
      },
      create: {
        gameId,
        userId,
        status: LedgerConfirmStatus.CONFIRMED,
        note: dto.note
      }
    });
    await this.prisma.ledgerPlayer.updateMany({
      where: { gameId, userId },
      data: { confirmStatus: LedgerConfirmStatus.CONFIRMED }
    });
    await this.promoteConfirmedIfReady(gameId);
    return this.getGame(userId, gameId);
  }

  async disputeGame(userId: string, gameId: string, dto: ConfirmLedgerDto) {
    await this.assertGameAccess(userId, gameId);
    await this.prisma.ledgerConfirmation.upsert({
      where: {
        gameId_userId: {
          gameId,
          userId
        }
      },
      update: {
        status: LedgerConfirmStatus.DISPUTED,
        note: dto.note,
        confirmedAt: new Date()
      },
      create: {
        gameId,
        userId,
        status: LedgerConfirmStatus.DISPUTED,
        note: dto.note
      }
    });
    await this.prisma.ledgerPlayer.updateMany({
      where: { gameId, userId },
      data: { confirmStatus: LedgerConfirmStatus.DISPUTED }
    });
    await this.prisma.ledgerGame.update({
      where: { id: gameId },
      data: { status: LedgerGameStatus.DISPUTED }
    });
    return this.getGame(userId, gameId);
  }

  private async assertGameAccess(userId: string, gameId: string) {
    const game = await this.prisma.ledgerGame.findUnique({ where: { id: gameId } });
    if (!game) throw new NotFoundException("记账牌局不存在");
    if (game.ownerUserId === userId) return game;
    if (game.teamId) {
      await this.teamsService.assertMember(game.teamId, userId);
      return game;
    }
    throw new ForbiddenException("无权访问该记账牌局");
  }

  private async createTransaction(
    gameId: string,
    playerId: string,
    type: LedgerTransactionType,
    amount: number,
    note?: string
  ) {
    if (type !== LedgerTransactionType.ADJUSTMENT && amount < 0) {
      throw new BadRequestException("买入和带出金额不能为负数");
    }
    return this.prisma.ledgerTransaction.create({
      data: {
        gameId,
        playerId,
        type,
        amount: new Prisma.Decimal(amount),
        note
      }
    });
  }

  private async recalculateGame(gameId: string) {
    const players = await this.prisma.ledgerPlayer.findMany({
      where: { gameId },
      include: { transactions: true }
    });

    let gameBuyIn = new Prisma.Decimal(0);
    let gameCashOut = new Prisma.Decimal(0);
    let gameProfit = new Prisma.Decimal(0);

    for (const player of players) {
      let buyIn = new Prisma.Decimal(0);
      let cashOut = new Prisma.Decimal(0);
      let adjustment = new Prisma.Decimal(0);

      for (const tx of player.transactions) {
        if (
          tx.type === LedgerTransactionType.BUY_IN ||
          tx.type === LedgerTransactionType.REBUY
        ) {
          buyIn = buyIn.plus(tx.amount);
        }
        if (tx.type === LedgerTransactionType.CASH_OUT) {
          cashOut = cashOut.plus(tx.amount);
        }
        if (tx.type === LedgerTransactionType.ADJUSTMENT) {
          adjustment = adjustment.plus(tx.amount);
        }
      }

      const profit = cashOut.minus(buyIn).plus(adjustment);
      await this.prisma.ledgerPlayer.update({
        where: { id: player.id },
        data: {
          totalBuyIn: buyIn,
          totalCashOut: cashOut,
          profit
        }
      });
      gameBuyIn = gameBuyIn.plus(buyIn);
      gameCashOut = gameCashOut.plus(cashOut);
      gameProfit = gameProfit.plus(profit);
    }

    await this.prisma.ledgerGame.update({
      where: { id: gameId },
      data: {
        totalBuyIn: gameBuyIn,
        totalCashOut: gameCashOut,
        totalProfit: gameProfit
      }
    });

    if (!gameProfit.equals(gameCashOut.minus(gameBuyIn))) {
      await this.riskService.createRiskLog({
        eventType: "LEDGER_ADJUSTMENT_USED",
        riskLevel: RiskLevel.LOW,
        detail: { gameId }
      });
    }
  }

  private async promoteConfirmedIfReady(gameId: string) {
    const players = await this.prisma.ledgerPlayer.findMany({
      where: {
        gameId,
        userId: { not: null }
      }
    });
    if (players.length === 0) return;
    const allConfirmed = players.every(
      (player) => player.confirmStatus === LedgerConfirmStatus.CONFIRMED
    );
    if (allConfirmed) {
      await this.prisma.ledgerGame.update({
        where: { id: gameId },
        data: { status: LedgerGameStatus.CONFIRMED }
      });
    }
  }
}
