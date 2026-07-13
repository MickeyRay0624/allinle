import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  BotLevel,
  PracticeRoomMode,
  PracticeRoomStatus,
  Prisma,
  RiskLevel,
  UserStatus
} from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RiskService } from "../risk/risk.service";
import { CreatePracticeRoomDto } from "./dto/create-practice-room.dto";
import { CreateSoloPracticeDto } from "./dto/create-solo-practice.dto";
import { JoinPracticeRoomDto } from "./dto/join-practice-room.dto";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

@Injectable()
export class PracticeRoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService
  ) {}

  async createFriendsRoom(userId: string, dto: CreatePracticeRoomDto) {
    await this.assertUserCanUsePractice(userId);
    if (dto.mode && dto.mode !== PracticeRoomMode.FRIENDS) {
      throw new BadRequestException("好友练习房接口只支持 FRIENDS 模式");
    }
    if (dto.bigBlind <= dto.smallBlind) {
      throw new BadRequestException("大盲必须大于小盲");
    }

    await this.writeCreateRoomRiskLogs(userId, dto.initialPracticeChips, dto.note);

    const roomCode = await this.generateUniqueRoomCode();
    const room = await this.prisma.practiceRoom.create({
      data: {
        roomCode,
        ownerUserId: userId,
        mode: PracticeRoomMode.FRIENDS,
        playerCount: dto.playerCount,
        smallBlind: dto.smallBlind,
        bigBlind: dto.bigBlind,
        initialPracticeChips: dto.initialPracticeChips,
        players: {
          create: {
            userId,
            seatNo: 1,
            chips: dto.initialPracticeChips,
            readyStatus: false,
            initialChipsConfirmed: false
          }
        }
      }
    });
    return this.getRoomStateById(room.id);
  }

  async getByRoomCode(roomCode: string) {
    const room = await this.prisma.practiceRoom.findUnique({
      where: { roomCode },
      include: this.roomInclude()
    });
    if (!room) throw new NotFoundException("练习房不存在");
    return room;
  }

  async getRoomStateByCode(roomCode: string) {
    const room = await this.getByRoomCode(roomCode);
    return this.serializeRoom(room);
  }

  async touchRooms(roomCodes: string[]) {
    if (!roomCodes.length) return;
    await this.prisma.practiceRoom.updateMany({
      where: {
        roomCode: { in: roomCodes },
        status: { in: [PracticeRoomStatus.WAITING, PracticeRoomStatus.READY, PracticeRoomStatus.PLAYING] }
      },
      data: { updatedAt: new Date() }
    });
  }

  async getRoomStateById(roomId: string) {
    const room = await this.prisma.practiceRoom.findUnique({
      where: { id: roomId },
      include: this.roomInclude()
    });
    if (!room) throw new NotFoundException("练习房不存在");
    return this.serializeRoom(room);
  }

  async joinRoom(userId: string, roomCode: string, _dto: JoinPracticeRoomDto) {
    await this.assertUserCanUsePractice(userId);
    const room = await this.getByRoomCode(roomCode);
    if (room.mode !== PracticeRoomMode.FRIENDS) {
      throw new BadRequestException("该房间不支持好友加入");
    }
    if (room.status === PracticeRoomStatus.PLAYING || room.status === PracticeRoomStatus.FINISHED || room.status === PracticeRoomStatus.CLOSED) {
      throw new BadRequestException("当前房间不可加入");
    }

    const existing = room.players.find((player) => player.userId === userId);
    if (existing) {
      return this.serializeRoom(room);
    }
    if (room.players.length >= room.playerCount) {
      throw new BadRequestException("房间已满");
    }

    const occupiedSeats = new Set(room.players.map((player) => player.seatNo));
    const seatNo = Array.from({ length: room.playerCount }, (_, index) => index + 1).find(
      (seat) => !occupiedSeats.has(seat)
    );
    if (!seatNo) {
      throw new BadRequestException("没有可用座位");
    }

    await this.prisma.practiceRoomPlayer.create({
      data: {
        roomId: room.id,
        userId,
        seatNo,
        chips: room.initialPracticeChips,
        readyStatus: false,
        initialChipsConfirmed: false
      }
    });
    await this.refreshReadyStatus(room.id);
    return this.getRoomStateByCode(roomCode);
  }

  async confirmInitialChips(userId: string, roomCode: string) {
    await this.assertUserCanUsePractice(userId);
    const room = await this.getByRoomCode(roomCode);
    this.assertRoomCanChangeWaitingState(room.status);
    await this.assertRoomPlayer(room.id, userId);
    await this.prisma.practiceRoomPlayer.updateMany({
      where: { roomId: room.id, userId },
      data: { initialChipsConfirmed: true }
    });
    await this.refreshReadyStatus(room.id);
    return this.getRoomStateByCode(roomCode);
  }

  async setReady(userId: string, roomCode: string, readyStatus = true) {
    await this.assertUserCanUsePractice(userId);
    const room = await this.getByRoomCode(roomCode);
    this.assertRoomCanChangeWaitingState(room.status);
    await this.assertRoomPlayer(room.id, userId);
    await this.prisma.practiceRoomPlayer.updateMany({
      where: { roomId: room.id, userId },
      data: { readyStatus }
    });
    await this.refreshReadyStatus(room.id);
    return this.getRoomStateByCode(roomCode);
  }

  async startRoom(userId: string, roomCode: string) {
    await this.assertUserCanUsePractice(userId);
    const room = await this.getByRoomCode(roomCode);
    if (room.ownerUserId !== userId) {
      throw new ForbiddenException("只有房主可以开始练习房");
    }
    const state = this.serializeRoom(room);
    const allConfirmed = state.players.every((player) => player.initialChipsConfirmed);
    const allReady = state.players.every((player) => player.readyStatus);
    if (state.status !== PracticeRoomStatus.READY || !allConfirmed || !allReady) {
      throw new BadRequestException("所有成员确认初始模拟练习筹码并准备后才能开始");
    }

    // TODO: 第二阶段接入完整服务端发牌、下注、结算状态机。
    await this.prisma.practiceRoom.update({
      where: { id: room.id },
      data: { status: PracticeRoomStatus.PLAYING }
    });
    return this.getRoomStateByCode(roomCode);
  }

  async closeRoom(userId: string, roomCode: string) {
    const room = await this.getByRoomCode(roomCode);
    if (room.ownerUserId !== userId) {
      throw new ForbiddenException("只有房主可以关闭练习房");
    }
    await this.prisma.practiceRoom.update({
      where: { id: room.id },
      data: { status: PracticeRoomStatus.CLOSED, endedAt: new Date() }
    });
    return this.getRoomStateByCode(roomCode);
  }

  async adminCloseRoom(roomId: string) {
    await this.prisma.practiceRoom.update({
      where: { id: roomId },
      data: { status: PracticeRoomStatus.CLOSED, endedAt: new Date() }
    });
    return this.getRoomStateById(roomId);
  }

  async createSoloRoom(userId: string, dto: CreateSoloPracticeDto) {
    await this.assertUserCanUsePractice(userId);
    if (dto.bigBlind <= dto.smallBlind) {
      throw new BadRequestException("大盲必须大于小盲");
    }
    await this.writeCreateRoomRiskLogs(userId, dto.initialPracticeChips);
    const playerCount = dto.botCount + 1;
    const roomCode = await this.generateUniqueRoomCode();
    const room = await this.prisma.practiceRoom.create({
      data: {
        roomCode,
        ownerUserId: userId,
        mode: PracticeRoomMode.SOLO,
        playerCount,
        smallBlind: dto.smallBlind,
        bigBlind: dto.bigBlind,
        initialPracticeChips: dto.initialPracticeChips,
        status: PracticeRoomStatus.READY,
        players: {
          create: [
            {
              userId,
              seatNo: 1,
              chips: dto.initialPracticeChips,
              readyStatus: true,
              initialChipsConfirmed: true,
              isBot: false
            },
            ...Array.from({ length: playerCount - 1 }, (_, index) => ({
              seatNo: index + 2,
              chips: dto.initialPracticeChips,
              readyStatus: true,
              initialChipsConfirmed: true,
              isBot: true,
              botLevel: dto.botLevel
            }))
          ]
        }
      }
    });
    return this.getRoomStateById(room.id);
  }

  async getSoloRoom(userId: string, roomId: string) {
    const room = await this.prisma.practiceRoom.findUnique({
      where: { id: roomId },
      include: this.roomInclude()
    });
    if (!room) throw new NotFoundException("单人练习局不存在");
    if (room.ownerUserId !== userId || room.mode !== PracticeRoomMode.SOLO) {
      throw new ForbiddenException("无权访问该单人练习局");
    }
    return this.serializeRoom(room);
  }

  private async refreshReadyStatus(roomId: string) {
    const room = await this.prisma.practiceRoom.findUnique({
      where: { id: roomId },
      include: { players: true }
    });
    if (!room || room.status === PracticeRoomStatus.CLOSED || room.status === PracticeRoomStatus.PLAYING) {
      return;
    }
    const confirmed =
      room.players.length > 0 && room.players.every((player) => player.initialChipsConfirmed);
    await this.prisma.practiceRoom.update({
      where: { id: roomId },
      data: {
        status: confirmed ? PracticeRoomStatus.READY : PracticeRoomStatus.WAITING
      }
    });
  }

  private async writeCreateRoomRiskLogs(
    userId: string,
    initialPracticeChips: number,
    note?: string | null
  ) {
    const createLimit = Number(process.env.PRACTICE_ROOM_CREATE_LIMIT_PER_HOUR || 20);
    const maxInitialPracticeChips = Number(process.env.PRACTICE_ROOM_MAX_INITIAL_CHIPS || 100000);
    const recentRooms = await this.prisma.practiceRoom.count({
      where: {
        ownerUserId: userId,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000)
        }
      }
    });
    if (recentRooms >= createLimit) {
      await this.riskService.createRiskLog({
        userId,
        eventType: "HIGH_FREQUENCY_ROOM_CREATE",
        riskLevel: RiskLevel.MEDIUM,
        detail: { recentRooms, limit: createLimit, windowMinutes: 60 }
      });
    }
    if (initialPracticeChips > maxInitialPracticeChips) {
      await this.riskService.createRiskLog({
        userId,
        eventType: "ABNORMAL_INITIAL_PRACTICE_CHIPS",
        riskLevel: RiskLevel.HIGH,
        detail: { initialPracticeChips, max: maxInitialPracticeChips }
      });
      throw new BadRequestException("初始模拟练习筹码超过系统允许上限");
    }
    await this.riskService.logSensitiveContent({
      userId,
      source: "practice-room.note",
      content: note
    });
  }

  private async assertRoomPlayer(roomId: string, userId: string) {
    const player = await this.prisma.practiceRoomPlayer.findFirst({
      where: { roomId, userId }
    });
    if (!player) {
      throw new ForbiddenException("你不是该练习房成员");
    }
    return player;
  }

  private async assertUserCanUsePractice(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });
    if (!user) {
      throw new ForbiddenException("用户不存在或登录态无效");
    }
    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException("封禁用户不能操作练习房");
    }
  }

  private assertRoomCanChangeWaitingState(status: PracticeRoomStatus) {
    if (
      status === PracticeRoomStatus.CLOSED ||
      status === PracticeRoomStatus.FINISHED ||
      status === PracticeRoomStatus.PLAYING
    ) {
      throw new BadRequestException("当前房间状态不可继续操作");
    }
  }

  private serializeRoom(room: Prisma.PracticeRoomGetPayload<{ include: ReturnType<PracticeRoomService["roomInclude"]> }>) {
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

  private roomInclude() {
    return {
      players: {
        include: {
          user: { select: { id: true, nickname: true, avatarUrl: true } }
        }
      }
    } as const;
  }

  private botName(level?: BotLevel | null) {
    const names: Record<BotLevel, string> = {
      BEGINNER: "入门机器人",
      NORMAL: "普通机器人",
      ADVANCED: "进阶机器人"
    };
    return level ? names[level] : "机器人";
  }

  private async generateUniqueRoomCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = Array.from(randomBytes(6))
        .map((byte) => ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length])
        .join("");
      const existing = await this.prisma.practiceRoom.findUnique({ where: { roomCode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException("生成房间码失败，请重试");
  }
}
