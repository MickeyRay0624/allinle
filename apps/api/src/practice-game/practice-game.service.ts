import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  GameAction,
  GameState,
  PrivateHandState,
  PublicGameState,
  applyGameAction,
  createInitialGameState,
  decideBotAction,
  evaluateSevenCards,
  getAllPrivateHandStates,
  getLegalActions,
  nextDealerSeat,
  resolveBlindSeats,
  toPrivateHandState,
  toPublicGameState
} from "@allinle/shared";
import {
  BotLevel,
  PracticeActionType,
  PracticeHandStatus,
  PracticeRoomStatus,
  PracticeStreet,
  Prisma
} from "@prisma/client";
import { RedisService } from "../redis/redis.service";
import { PrismaService } from "../prisma/prisma.service";
import { GameActionDto } from "./dto/game-action.dto";

const GAME_STATE_TTL_SECONDS = 24 * 60 * 60;
const BOT_ACTION_MIN_DELAY_MS = 450;
const BOT_ACTION_MAX_DELAY_MS = 1100;
const BOT_ACTION_MAX_PER_HAND = 300;

const roomInclude = {
  players: {
    include: {
      user: { select: { id: true, nickname: true, avatarUrl: true } }
    }
  }
} as const;

type RoomForGame = Prisma.PracticeRoomGetPayload<{ include: typeof roomInclude }>;

@Injectable()
export class PracticeGameService {
  private readonly botTimers = new Map<string, NodeJS.Timeout>();
  private readonly botActionCounts = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  getRoadmap() {
    return {
      phase: "PHASE_3_REALTIME_PRACTICE_MVP",
      status: "服务端权威状态机已接入 Redis、MySQL 和 WebSocket",
      compliance:
        "线上练习只使用模拟练习筹码，不支持充值、提现、兑换、支付、抽水或任何财产属性。"
    };
  }

  async startFirstHand(userId: string, roomCode: string) {
    const existing = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    if (existing?.status === "PLAYING" || existing?.status === "HAND_FINISHED") {
      await this.assertUserInRoom(userId, roomCode);
      return this.buildUserGameView(userId, existing);
    }

    const room = await this.getRoom(roomCode);
    this.assertRoomOwner(room, userId);
    this.assertRoomReadyToStart(room);

    const handNo = await this.nextHandNo(room.id);
    const activePlayers = room.players.filter((player) => player.chips > 0);
    const dealerSeat = activePlayers.map((player) => player.seatNo).sort((a, b) => a - b)[0];
    const state = await this.createAndPersistHand(room, handNo, dealerSeat);

    await this.prisma.practiceRoom.update({
      where: { id: room.id },
      data: { status: PracticeRoomStatus.PLAYING, startedAt: room.startedAt || new Date() }
    });
    await this.saveState(state);
    this.scheduleBotTurn(roomCode);

    return this.buildUserGameView(userId, state, await this.getRoomStateByCode(roomCode));
  }

  async getGameState(userId: string, roomCode: string) {
    await this.assertUserInRoom(userId, roomCode);
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    if (!state) {
      return {
        roomState: await this.getRoomStateByCode(roomCode),
        publicState: null,
        privateState: null
      };
    }
    return this.buildUserGameView(userId, state, await this.getRoomStateByCode(roomCode));
  }

  async applyAction(userId: string, roomCode: string, dto: GameActionDto) {
    const room = await this.getRoom(roomCode);
    const roomPlayer = this.assertRoomMember(room, userId);
    const state = await this.requireState(roomCode);
    const currentPlayer = state.players.find((player) => player.seatNo === state.currentTurnSeat);

    if (!currentPlayer || currentPlayer.seatNo !== roomPlayer.seatNo) {
      throw new BadRequestException("当前未轮到你行动");
    }

    return this.applySeatAction(roomCode, roomPlayer.seatNo, dto, userId);
  }

  async nextHand(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomOwner(room, userId);
    const previousState = await this.requireState(roomCode);

    if (previousState.status !== "HAND_FINISHED") {
      throw new BadRequestException("当前手牌尚未结束");
    }

    const nextDealer = nextDealerSeat(previousState.players, previousState.dealerSeat);
    if (!nextDealer) {
      const roomFinishedState: GameState = {
        ...previousState,
        status: "ROOM_FINISHED",
        currentTurnSeat: null,
        updatedAt: new Date().toISOString()
      };
      await this.prisma.practiceRoom.update({
        where: { id: room.id },
        data: { status: PracticeRoomStatus.FINISHED, endedAt: new Date() }
      });
      await this.saveState(roomFinishedState);
      this.clearBotTimer(roomCode);
      return this.buildUserGameView(userId, roomFinishedState, await this.getRoomStateByCode(roomCode), {
        events: ["room_finished"]
      });
    }

    const handNo = previousState.handNo + 1;
    const nextPlayers = previousState.players.map((player) => ({
      userId: player.userId,
      seatNo: player.seatNo,
      nickname: player.nickname,
      isBot: player.isBot,
      botLevel: player.botLevel,
      chips: player.chips
    }));
    const refreshedRoom: RoomForGame = {
      ...room,
      players: room.players.map((roomPlayer) => {
        const nextPlayer = nextPlayers.find((player) => player.seatNo === roomPlayer.seatNo);
        return {
          ...roomPlayer,
          chips: nextPlayer?.chips ?? roomPlayer.chips
        };
      })
    };
    const state = await this.createAndPersistHand(refreshedRoom, handNo, nextDealer);

    await this.prisma.practiceRoom.update({
      where: { id: room.id },
      data: { status: PracticeRoomStatus.PLAYING }
    });
    await this.saveState(state);
    this.scheduleBotTurn(roomCode);

    return this.buildUserGameView(userId, state, await this.getRoomStateByCode(roomCode), {
      events: ["next_hand_started"]
    });
  }

  async listHands(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomMember(room, userId);
    return this.prisma.practiceHand.findMany({
      where: { roomId: room.id },
      include: {
        players: { orderBy: { seatNo: "asc" } },
        actions: { orderBy: { createdAt: "asc" } }
      },
      orderBy: { handNo: "desc" },
      take: 100
    });
  }

  async getHand(userId: string, handId: string) {
    const hand = await this.prisma.practiceHand.findUnique({
      where: { id: handId },
      include: {
        room: { include: roomInclude },
        players: { orderBy: { seatNo: "asc" } },
        actions: { orderBy: { createdAt: "asc" } }
      }
    });
    if (!hand) throw new NotFoundException("练习手牌不存在");
    this.assertRoomMember(hand.room, userId);

    return {
      ...hand,
      players:
        hand.status === PracticeHandStatus.FINISHED
          ? hand.players
          : hand.players.map((player) => ({
              ...player,
              holeCards: player.userId === userId ? player.holeCards : []
            }))
    };
  }

  async getHandReplay(userId: string, handId: string) {
    const hand = await this.prisma.practiceHand.findUnique({
      where: { id: handId },
      include: {
        room: { include: roomInclude },
        players: { orderBy: { seatNo: "asc" } },
        actions: {
          include: { user: { select: { id: true, nickname: true, openid: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!hand) throw new NotFoundException("练习手牌不存在");
    this.assertRoomMember(hand.room, userId);
    return this.serializeHandReplay(hand, userId, false);
  }

  async getLatestHandReplay(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomMember(room, userId);
    const hand = await this.prisma.practiceHand.findFirst({
      where: { roomId: room.id, status: PracticeHandStatus.FINISHED },
      include: {
        room: { include: roomInclude },
        players: { orderBy: { seatNo: "asc" } },
        actions: {
          include: { user: { select: { id: true, nickname: true, openid: true } } },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { handNo: "desc" }
    });
    if (!hand) throw new NotFoundException("该房间暂无可复盘手牌");
    return this.serializeHandReplay(hand, userId, false);
  }

  async getRoomStats(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomMember(room, userId);
    const hands = await this.prisma.practiceHand.findMany({
      where: { roomId: room.id, status: PracticeHandStatus.FINISHED },
      include: { players: true },
      orderBy: { handNo: "asc" }
    });
    const players = room.players
      .slice()
      .sort((a, b) => a.seatNo - b.seatNo)
      .map((player) => {
        const rows = hands.flatMap((hand) =>
          hand.players.filter((handPlayer) => handPlayer.seatNo === player.seatNo)
        );
        const totalHands = rows.length;
        const netResult = rows.reduce((sum, row) => sum + (row.netResult || 0), 0);
        const showdownCount = rows.filter((row) => row.showdown).length;
        const winCount = rows.filter((row) => row.finalStatus === "WINNER").length;
        return {
          seatNo: player.seatNo,
          userId: player.userId,
          nickname: player.user?.nickname || (player.isBot ? this.botName(player.botLevel) : "成员"),
          isBot: player.isBot,
          botLevel: player.botLevel,
          totalHands,
          winCount,
          showdownCount,
          netResult,
          avgNet: totalHands ? Number((netResult / totalHands).toFixed(2)) : 0
        };
      });
    return {
      roomCode: room.roomCode,
      mode: room.mode,
      status: room.status,
      totalHands: hands.length,
      players
    };
  }

  async endRoom(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomOwner(room, userId);
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    if (state?.status === "PLAYING") {
      await this.persistAbortedHand(state);
    }
    await this.prisma.practiceRoom.update({
      where: { id: room.id },
      data: { status: PracticeRoomStatus.FINISHED, endedAt: new Date() }
    });
    this.clearBotTimer(roomCode);
    await this.redis.del(this.stateKey(roomCode));
    return this.getRoomStateByCode(roomCode);
  }

  async getAllPrivateStates(roomCode: string): Promise<PrivateHandState[]> {
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    return state ? getAllPrivateHandStates(state) : [];
  }

  async getPublicState(roomCode: string): Promise<PublicGameState | null> {
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    return state ? toPublicGameState(state) : null;
  }

  private async applySeatAction(
    roomCode: string,
    seatNo: number,
    dto: GameActionDto,
    actorUserId?: string | null
  ) {
    const state = await this.requireState(roomCode);
    const currentPlayer = state.players.find((player) => player.seatNo === state.currentTurnSeat);
    if (!currentPlayer || currentPlayer.seatNo !== seatNo) {
      throw new BadRequestException("当前未轮到该座位行动");
    }
    if (actorUserId) {
      if (currentPlayer.userId !== actorUserId) {
        throw new BadRequestException("当前未轮到你行动");
      }
    } else if (!currentPlayer.isBot) {
      throw new BadRequestException("非机器人座位不能自动行动");
    }

    let result;
    try {
      result = applyGameAction(state, {
        seatNo,
        userId: currentPlayer.userId || actorUserId || null,
        actionType: dto.actionType,
        amount: dto.amount
      });
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "非法行动");
    }

    await this.persistActions(result.state.handId, [result.appliedAction]);
    await this.persistSystemActionsForEvents(result.state, result.events);

    if (result.state.status === "HAND_FINISHED") {
      await this.persistFinishedHand(result.state);
      this.clearBotTimer(roomCode);
    } else if (result.state.status === "PLAYING") {
      this.scheduleBotTurn(roomCode);
    }

    await this.saveState(result.state);
    return this.buildUserGameView(actorUserId || "", result.state, await this.getRoomStateByCode(roomCode), {
      appliedAction: result.appliedAction,
      events: result.events
    });
  }

  private scheduleBotTurn(roomCode: string) {
    this.clearBotTimer(roomCode);
    const delay =
      BOT_ACTION_MIN_DELAY_MS +
      Math.floor(Math.random() * (BOT_ACTION_MAX_DELAY_MS - BOT_ACTION_MIN_DELAY_MS));
    const timer = setTimeout(() => {
      this.playBotTurn(roomCode).catch((error) => {
        console.error(`[bot] auto action failed room=${roomCode}`, error);
      });
    }, delay);
    this.botTimers.set(roomCode, timer);
  }

  private async playBotTurn(roomCode: string) {
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    if (!state || state.status !== "PLAYING" || !state.currentTurnSeat) return;

    const bot = state.players.find((player) => player.seatNo === state.currentTurnSeat);
    if (!bot?.isBot || bot.status !== "ACTIVE" || bot.chips <= 0) return;

    const guardKey = `${roomCode}:${state.handId}`;
    const count = (this.botActionCounts.get(guardKey) || 0) + 1;
    this.botActionCounts.set(guardKey, count);
    if (count > BOT_ACTION_MAX_PER_HAND) {
      console.error(`[bot] auto action guard tripped room=${roomCode} hand=${state.handId}`);
      return;
    }

    const legalActions = getLegalActions(state, bot.seatNo);
    if (legalActions.length === 0) return;

    const decision = decideBotAction({
      botLevel: (bot.botLevel || "BEGINNER") as "BEGINNER" | "NORMAL" | "ADVANCED",
      seatNo: bot.seatNo,
      holeCards: bot.holeCards,
      boardCards: state.boardCards,
      street: state.street === "SHOWDOWN" ? "RIVER" : state.street,
      pot: state.pot,
      currentBet: state.currentBet,
      investedThisStreet: bot.investedThisStreet,
      chips: bot.chips,
      minRaise: state.minRaise,
      positionType: this.positionType(state, bot.seatNo),
      activePlayerCount: state.players.filter((player) => player.status !== "FOLDED" && player.status !== "OUT").length,
      legalActions
    });

    console.log(
      `[bot] room=${roomCode} hand=${state.handId} seat=${bot.seatNo} action=${decision.actionType} reason=${decision.reason}`
    );
    await this.applySeatAction(roomCode, bot.seatNo, {
      actionType: decision.actionType as GameActionDto["actionType"],
      amount: decision.amount
    });
  }

  private async createAndPersistHand(room: RoomForGame, handNo: number, dealerSeat: number) {
    const activeSeatNos = room.players
      .filter((player) => player.chips > 0)
      .map((player) => player.seatNo)
      .sort((a, b) => a - b);
    const blindSeats = resolveBlindSeats(activeSeatNos, dealerSeat);
    const hand = await this.prisma.practiceHand.create({
      data: {
        roomId: room.id,
        handNo,
        dealerSeat: blindSeats.dealerSeat,
        smallBlindSeat: blindSeats.smallBlindSeat,
        bigBlindSeat: blindSeats.bigBlindSeat,
        boardCards: [],
        status: PracticeHandStatus.PLAYING
      }
    });

    const state = createInitialGameState({
      roomId: room.id,
      roomCode: room.roomCode,
      handId: hand.id,
      handNo,
      smallBlind: room.smallBlind,
      bigBlind: room.bigBlind,
      dealerSeat: blindSeats.dealerSeat,
      players: room.players.map((player) => ({
        userId: player.userId,
        seatNo: player.seatNo,
        nickname: player.user?.nickname || (player.isBot ? this.botName(player.botLevel) : "成员"),
        isBot: player.isBot,
        botLevel: player.botLevel,
        chips: player.chips
      }))
    });

    await this.prisma.practiceHandPlayer.createMany({
      data: state.players.map((player) => ({
        handId: state.handId,
        userId: player.userId || null,
        seatNo: player.seatNo,
        nickname: player.nickname,
        isBot: player.isBot,
        botLevel: this.toBotLevel(player.botLevel),
        holeCards: player.holeCards as Prisma.InputJsonValue,
        startChips: player.startHandChips,
        endChips: null,
        invested: 0,
        netResult: null,
        finalStatus: player.status
      }))
    });
    await this.persistActions(state.handId, state.actionHistory);

    if (state.status === "HAND_FINISHED") {
      await this.persistFinishedHand(state);
    }

    return state;
  }

  private async persistFinishedHand(state: GameState) {
    await this.prisma.practiceHand.update({
      where: { id: state.handId },
      data: {
        status: PracticeHandStatus.FINISHED,
        boardCards: state.boardCards as Prisma.InputJsonValue,
        potSize: state.pot,
        winnerInfo: state.winnerInfo as unknown as Prisma.InputJsonValue,
        endedAt: new Date()
      }
    });

    await Promise.all(
      state.players.map((player) =>
        this.prisma.practiceRoomPlayer.update({
          where: {
            roomId_seatNo: {
              roomId: state.roomId,
              seatNo: player.seatNo
            }
          },
          data: { chips: player.chips }
        })
      )
    );

    await Promise.all(
      state.players.map((player) => {
        const result = this.handPlayerResult(player, state);
        return this.prisma.practiceHandPlayer.upsert({
          where: {
            handId_seatNo: {
              handId: state.handId,
              seatNo: player.seatNo
            }
          },
          update: result,
          create: {
            handId: state.handId,
            userId: player.userId || null,
            seatNo: player.seatNo,
            startChips: player.startHandChips,
            ...result
          }
        });
      })
    );

    await this.persistActions(state.handId, this.finishedSystemActions(state));
  }

  private async persistAbortedHand(state: GameState) {
    await this.prisma.practiceHand.update({
      where: { id: state.handId },
      data: {
        status: PracticeHandStatus.FINISHED,
        boardCards: state.boardCards as Prisma.InputJsonValue,
        potSize: state.pot,
        winnerInfo: {
          reason: "ROOM_ENDED",
          boardCards: state.boardCards,
          totalPot: state.pot,
          pots: []
        } as Prisma.InputJsonValue,
        endedAt: new Date()
      }
    });
    await Promise.all(
      state.players.map((player) =>
        this.prisma.practiceRoomPlayer.update({
          where: {
            roomId_seatNo: {
              roomId: state.roomId,
              seatNo: player.seatNo
            }
          },
          data: { chips: player.chips }
        })
      )
    );
    await Promise.all(
      state.players.map((player) =>
        this.prisma.practiceHandPlayer.upsert({
          where: {
            handId_seatNo: {
              handId: state.handId,
              seatNo: player.seatNo
            }
          },
          update: {
            nickname: player.nickname,
            isBot: player.isBot,
            botLevel: this.toBotLevel(player.botLevel),
            holeCards: player.holeCards as Prisma.InputJsonValue,
            endChips: player.chips,
            invested: player.investedThisHand,
            netResult: player.chips - player.startHandChips,
            finalStatus: "ROOM_ENDED"
          },
          create: {
            handId: state.handId,
            userId: player.userId || null,
            seatNo: player.seatNo,
            nickname: player.nickname,
            isBot: player.isBot,
            botLevel: this.toBotLevel(player.botLevel),
            holeCards: player.holeCards as Prisma.InputJsonValue,
            startChips: player.startHandChips,
            endChips: player.chips,
            invested: player.investedThisHand,
            netResult: player.chips - player.startHandChips,
            finalStatus: "ROOM_ENDED"
          }
        })
      )
    );
  }

  private finalStatus(player: GameState["players"][number], state: GameState) {
    const winnerSeats = new Set(
      state.winnerInfo?.pots.flatMap((pot) => pot.winners.map((winner) => winner.seatNo)) || []
    );
    if (winnerSeats.has(player.seatNo)) return "WINNER";
    if (player.status === "FOLDED") return "FOLDED";
    if (player.status === "ALL_IN" && player.chips === 0) return "ALL_IN";
    return player.chips - player.startHandChips < 0 ? "LOST" : player.status;
  }

  private handPlayerResult(player: GameState["players"][number], state: GameState) {
    const showdown = state.winnerInfo?.reason === "SHOWDOWN" && player.status !== "FOLDED";
    const evaluated =
      showdown && state.boardCards.length === 5 && player.holeCards.length === 2
        ? evaluateSevenCards([...player.holeCards, ...state.boardCards])
        : null;
    return {
      nickname: player.nickname,
      isBot: player.isBot,
      botLevel: this.toBotLevel(player.botLevel),
      holeCards: player.holeCards as Prisma.InputJsonValue,
      endChips: player.chips,
      invested: player.investedThisHand,
      netResult: player.chips - player.startHandChips,
      finalStatus: this.finalStatus(player, state),
      showdown,
      handRankCategory: evaluated?.rankCategory || null,
      handRankDescription: evaluated?.description || null,
      bestFiveCards: evaluated ? (evaluated.bestFiveCards as Prisma.InputJsonValue) : undefined
    };
  }

  private finishedSystemActions(state: GameState): GameAction[] {
    const now = new Date().toISOString();
    const actions: GameAction[] = [
      {
        seatNo: 0,
        userId: null,
        actionType: "SHOWDOWN",
        amount: state.pot,
        street: "SHOWDOWN",
        createdAt: now
      }
    ];
    state.winnerInfo?.pots.forEach((pot) => {
      pot.winners.forEach((winner) => {
        actions.push({
          seatNo: winner.seatNo,
          userId: winner.userId,
          actionType: "WIN",
          amount: winner.amountWon,
          street: "SHOWDOWN",
          createdAt: now
        });
      });
    });
    return actions;
  }

  private async persistSystemActionsForEvents(state: GameState, events: string[]) {
    if (!events.includes("street_changed") || state.status === "HAND_FINISHED") return;
    await this.persistActions(state.handId, [
      {
        seatNo: 0,
        userId: null,
        actionType: "DEAL",
        amount: state.boardCards.length,
        street: state.street,
        createdAt: new Date().toISOString()
      }
    ]);
  }

  private async persistActions(handId: string, actions: GameAction[]) {
    if (actions.length === 0) return;
    await this.prisma.practiceAction.createMany({
      data: actions.map((action) => ({
        handId,
        userId: action.userId || null,
        seatNo: action.seatNo,
        actionType: action.actionType as PracticeActionType,
        amount: action.amount,
        street: action.street as PracticeStreet,
        createdAt: new Date(action.createdAt)
      }))
    });
  }

  private async saveState(state: GameState) {
    await this.redis.setJson(this.stateKey(state.roomCode), state, GAME_STATE_TTL_SECONDS);
  }

  private async requireState(roomCode: string) {
    const state = await this.redis.getJson<GameState>(this.stateKey(roomCode));
    if (!state) {
      throw new BadRequestException("当前房间没有进行中的练习手牌");
    }
    return state;
  }

  private async getRoom(roomCode: string) {
    const room = await this.prisma.practiceRoom.findUnique({
      where: { roomCode },
      include: roomInclude
    });
    if (!room) throw new NotFoundException("练习房不存在");
    return room;
  }

  private async getRoomStateByCode(roomCode: string) {
    return this.serializeRoom(await this.getRoom(roomCode));
  }

  private async assertUserInRoom(userId: string, roomCode: string) {
    const room = await this.getRoom(roomCode);
    this.assertRoomMember(room, userId);
    return room;
  }

  private assertRoomOwner(room: RoomForGame, userId: string) {
    if (room.ownerUserId !== userId) {
      throw new ForbiddenException("只有房主可以操作该练习房");
    }
  }

  private assertRoomMember(room: RoomForGame, userId: string) {
    const player = room.players.find((candidate) => candidate.userId === userId);
    if (!player) {
      throw new ForbiddenException("你不是该练习房成员");
    }
    return player;
  }

  private assertRoomReadyToStart(room: RoomForGame) {
    const players = room.players;
    if (room.status !== PracticeRoomStatus.READY && room.status !== PracticeRoomStatus.WAITING) {
      throw new BadRequestException("当前房间不可开始练习");
    }
    if (players.length < 2) {
      throw new BadRequestException("至少需要 2 名玩家才能开始练习");
    }
    if (players.length > room.playerCount) {
      throw new BadRequestException("房间人数超过配置上限");
    }
    if (!players.every((player) => player.initialChipsConfirmed && player.readyStatus)) {
      throw new BadRequestException("所有成员确认初始模拟练习筹码并准备后才能开始");
    }
    if (!players.every((player) => player.chips > 0)) {
      throw new BadRequestException("所有成员都需要有模拟练习筹码才能开始");
    }
  }

  private async nextHandNo(roomId: string) {
    const latest = await this.prisma.practiceHand.findFirst({
      where: { roomId },
      orderBy: { handNo: "desc" },
      select: { handNo: true }
    });
    return (latest?.handNo || 0) + 1;
  }

  private buildUserGameView(
    userId: string,
    state: GameState,
    roomState?: unknown,
    extra: Record<string, unknown> = {}
  ) {
    return {
      roomState,
      publicState: toPublicGameState(state),
      privateState: toPrivateHandState(state, userId),
      ...extra
    };
  }

  private serializeRoom(room: RoomForGame) {
    return {
      ...room,
      players: room.players
        .slice()
        .sort((a, b) => a.seatNo - b.seatNo)
        .map((player) => ({
          ...player,
          nickname: player.user?.nickname || (player.isBot ? this.botName(player.botLevel) : null),
          user: undefined
        }))
    };
  }

  private botName(level?: string | null) {
    const names: Record<string, string> = {
      BEGINNER: "入门机器人",
      NORMAL: "普通机器人",
      ADVANCED: "进阶机器人"
    };
    return level ? names[level] || "机器人" : "机器人";
  }

  private serializeHandReplay(hand: any, viewerUserId: string, revealAll: boolean) {
    const nameBySeat = new Map<number, string>();
    hand.players.forEach((player: any) => {
      nameBySeat.set(
        player.seatNo,
        player.nickname || (player.isBot ? this.botName(player.botLevel) : `#${player.seatNo}`)
      );
    });
    return {
      handId: hand.id,
      roomCode: hand.room.roomCode,
      mode: hand.room.mode,
      handNo: hand.handNo,
      status: hand.status,
      street: "SHOWDOWN",
      blinds: {
        smallBlind: hand.room.smallBlind,
        bigBlind: hand.room.bigBlind
      },
      seats: {
        dealerSeat: hand.dealerSeat,
        smallBlindSeat: hand.smallBlindSeat,
        bigBlindSeat: hand.bigBlindSeat
      },
      boardCards: this.asCards(hand.boardCards),
      potSize: hand.potSize,
      winnerInfo: hand.winnerInfo,
      startedAt: hand.startedAt,
      endedAt: hand.endedAt,
      players: hand.players.map((player: any) => {
        const revealHoleCards = revealAll || player.userId === viewerUserId || player.showdown;
        return {
          seatNo: player.seatNo,
          userId: player.userId,
          nickname: player.nickname || nameBySeat.get(player.seatNo),
          isBot: player.isBot,
          botLevel: player.botLevel,
          holeCards: revealHoleCards ? this.asCards(player.holeCards) : [],
          holeCardsHidden: !revealHoleCards,
          startChips: player.startChips,
          endChips: player.endChips,
          invested: player.invested,
          netResult: player.netResult,
          finalStatus: player.finalStatus,
          showdown: player.showdown,
          handRankCategory: player.handRankCategory,
          handRankDescription: player.handRankDescription,
          bestFiveCards: this.asCards(player.bestFiveCards)
        };
      }),
      actions: hand.actions.map((action: any, index: number) => ({
        index: index + 1,
        seatNo: action.seatNo,
        nickname: action.seatNo === 0 ? "系统" : nameBySeat.get(action.seatNo) || action.user?.nickname || "成员",
        actionType: action.actionType,
        amount: action.amount,
        street: action.street,
        createdAt: action.createdAt
      }))
    };
  }

  private asCards(value: unknown): string[] {
    return Array.isArray(value) ? value.map((card) => String(card)) : [];
  }

  private positionType(state: GameState, seatNo: number): "EARLY" | "MIDDLE" | "LATE" | "BLINDS" {
    if (seatNo === state.smallBlindSeat || seatNo === state.bigBlindSeat) return "BLINDS";
    const seats = state.players
      .filter((player) => player.status !== "OUT" && player.status !== "SITTING_OUT")
      .map((player) => player.seatNo)
      .sort((a, b) => a - b);
    const dealerIndex = seats.indexOf(state.dealerSeat);
    const ordered = dealerIndex >= 0 ? [...seats.slice(dealerIndex + 1), ...seats.slice(0, dealerIndex + 1)] : seats;
    const index = ordered.indexOf(seatNo);
    if (index < 0 || ordered.length <= 3) return "MIDDLE";
    const ratio = index / Math.max(1, ordered.length - 1);
    if (ratio < 0.34) return "EARLY";
    if (ratio < 0.67) return "MIDDLE";
    return "LATE";
  }

  private clearBotTimer(roomCode: string) {
    const timer = this.botTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.botTimers.delete(roomCode);
  }

  private toBotLevel(level?: string | null): BotLevel | null {
    return level === "BEGINNER" || level === "NORMAL" || level === "ADVANCED"
      ? (level as BotLevel)
      : null;
  }

  private stateKey(roomCode: string) {
    return `game_state:${roomCode}`;
  }
}
