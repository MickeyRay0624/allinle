import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  AdminRole,
  AdminStatus,
  PracticeRoomStatus,
  Prisma,
} from "@prisma/client";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { ErrorCodes } from "@allinle/shared";
import { PracticeRoomService } from "../practice-room/practice-room.service";
import { PrismaService } from "../prisma/prisma.service";
import { RiskService } from "../risk/risk.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { UpdateSystemConfigDto } from "./dto/update-system-config.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const HIGH_RISK_KEYS = [
  "JWT_SECRET",
  "ADMIN_JWT_SECRET",
  "WX_SECRET",
  "MYSQL_PASSWORD",
  "MYSQL_ROOT_PASSWORD",
  "REDIS_PASSWORD",
];

const DEFAULT_SYSTEM_CONFIG = {
  defaultPracticeChips: 10000,
  allowedPlayerCounts: [2, 3, 4, 5, 6, 7, 8, 9],
  defaultBlinds: [
    { smallBlind: 50, bigBlind: 100 },
    { smallBlind: 100, bigBlind: 200 },
  ],
  botDifficulties: ["BEGINNER", "NORMAL", "ADVANCED"],
};

const ROOM_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly practiceRoomService: PracticeRoomService,
    private readonly riskService: RiskService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.findOrBootstrapAdmin(dto);
    if (admin.status !== AdminStatus.NORMAL) {
      throw new ForbiddenException({
        message: "管理员账号已停用",
        code: ErrorCodes.AUTH_FORBIDDEN,
      });
    }
    const ok = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        message: "管理员账号或密码错误",
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      });
    }
    return {
      token: this.jwtService.sign(
        {
          sub: admin.id,
          username: admin.username,
          type: "ADMIN",
          role: admin.role,
        },
        {
          secret:
            process.env.ADMIN_JWT_SECRET ||
            process.env.JWT_SECRET ||
            "dev-only-change-me",
          expiresIn:
            process.env.ADMIN_JWT_EXPIRES_IN ||
            process.env.JWT_EXPIRES_IN ||
            "7d",
        },
      ),
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        status: admin.status,
      },
    };
  }

  // ---- Admin User Management ----

  async getMe(adminId: string) {
    return this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, role: true, status: true, createdAt: true },
    });
  }

  async createAdmin(
    currentAdminId: string,
    currentRole: AdminRole,
    dto: CreateAdminDto,
  ) {
    if (currentRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException({
        message: "只有超级管理员可以创建管理员账号",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
    const existing = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ForbiddenException({
        message: "管理员账号已存在",
        code: ErrorCodes.BUSINESS_ERROR,
      });
    }
    const admin = await this.prisma.adminUser.create({
      data: {
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role || AdminRole.OPERATOR,
        status: AdminStatus.NORMAL,
      },
    });
    await this.audit(currentAdminId, "CREATE_ADMIN", "AdminUser", admin.id, {
      username: dto.username,
      role: dto.role,
    });
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      status: admin.status,
    };
  }

  async listAdminUsers(currentRole: AdminRole) {
    if (currentRole !== AdminRole.SUPER_ADMIN && currentRole !== AdminRole.ADMIN) {
      throw new ForbiddenException({
        message: "无权查看管理员列表",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async resetAdminPassword(
    currentAdminId: string,
    currentRole: AdminRole,
    targetId: string,
    dto: ResetPasswordDto,
  ) {
    if (currentRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException({
        message: "只有超级管理员可以重置密码",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
    await this.prisma.adminUser.update({
      where: { id: targetId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    await this.audit(currentAdminId, "RESET_ADMIN_PASSWORD", "AdminUser", targetId, {});
    return { message: "密码已重置" };
  }

  async updateAdminStatus(
    currentAdminId: string,
    currentRole: AdminRole,
    targetId: string,
    dto: { status: AdminStatus },
  ) {
    if (currentRole !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException({
        message: "只有超级管理员可以修改管理员状态",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
    // Prevent disabling the last SUPER_ADMIN
    if (dto.status === AdminStatus.DISABLED) {
      const target = await this.prisma.adminUser.findUnique({ where: { id: targetId } });
      if (target?.role === AdminRole.SUPER_ADMIN) {
        const superAdminCount = await this.prisma.adminUser.count({
          where: { role: AdminRole.SUPER_ADMIN, status: AdminStatus.NORMAL },
        });
        if (superAdminCount <= 1) {
          throw new ForbiddenException({
            message: "不能禁用最后一个超级管理员",
            code: ErrorCodes.ADMIN_LAST_SUPER_ADMIN,
          });
        }
      }
    }
    await this.prisma.adminUser.update({
      where: { id: targetId },
      data: { status: dto.status },
    });
    await this.audit(currentAdminId, "UPDATE_ADMIN_STATUS", "AdminUser", targetId, {
      status: dto.status,
    });
    return { message: "状态已更新" };
  }

  // ---- RBAC Helpers ----

  requireSuperAdmin(role: AdminRole) {
    if (role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException({
        message: "需要超级管理员权限",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
  }

  requireAdmin(role: AdminRole) {
    if (role !== AdminRole.SUPER_ADMIN && role !== AdminRole.ADMIN) {
      throw new ForbiddenException({
        message: "需要管理员权限",
        code: ErrorCodes.ADMIN_PERMISSION_DENIED,
      });
    }
  }

  // ---- Dashboard ----

  async dashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [
      userCount,
      todayLedgerGames,
      todayPracticeRooms,
      onlineRooms,
      riskLogCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.ledgerGame.count({ where: { createdAt: { gte: today } } }),
      this.prisma.practiceRoom.count({ where: { createdAt: { gte: today } } }),
      this.prisma.practiceRoom.count({
        where: {
          status: {
            in: [
              PracticeRoomStatus.WAITING,
              PracticeRoomStatus.READY,
              PracticeRoomStatus.PLAYING,
            ],
          },
        },
      }),
      this.prisma.riskLog.count(),
    ]);
    return {
      userCount,
      todayLedgerGames,
      todayPracticeRooms,
      onlineRooms,
      riskLogCount,
    };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        loginCount: true,
        createdAt: true,
      },
    });
  }

  async updateUserStatus(
    adminUserId: string,
    userId: string,
    dto: UpdateUserStatusDto,
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
    });
    await this.audit(adminUserId, "UPDATE_USER_STATUS", "User", userId, {
      status: dto.status,
    });
    return user;
  }

  async listLedgerGames() {
    return this.prisma.ledgerGame.findMany({
      include: {
        owner: { select: { id: true, nickname: true, openid: true } },
        team: { select: { id: true, name: true } },
        players: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listPracticeRooms() {
    const idleBefore = new Date(Date.now() - ROOM_IDLE_TIMEOUT_MS);
    await this.prisma.practiceRoom.updateMany({
      where: { status: { in: [PracticeRoomStatus.WAITING, PracticeRoomStatus.READY, PracticeRoomStatus.PLAYING] }, updatedAt: { lt: idleBefore } },
      data: { status: PracticeRoomStatus.CLOSED, endedAt: new Date() }
    });
    return this.prisma.practiceRoom.findMany({
      include: {
        owner: { select: { id: true, nickname: true, openid: true } },
        players: true,
        _count: { select: { hands: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listPracticeHands() {
    return this.prisma.practiceHand.findMany({
      include: {
        room: {
          select: {
            id: true,
            roomCode: true,
            mode: true,
            smallBlind: true,
            bigBlind: true,
            owner: { select: { id: true, nickname: true, openid: true } },
          },
        },
        players: { orderBy: { seatNo: "asc" } },
        actions: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
  }

  async getPracticeHand(handId: string) {
    return this.prisma.practiceHand.findUnique({
      where: { id: handId },
      include: {
        room: {
          select: {
            id: true,
            roomCode: true,
            mode: true,
            smallBlind: true,
            bigBlind: true,
            owner: { select: { id: true, nickname: true, openid: true } },
          },
        },
        players: { orderBy: { seatNo: "asc" } },
        actions: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async closePracticeRoom(adminUserId: string, roomId: string) {
    const state = await this.practiceRoomService.adminCloseRoom(roomId);
    await this.audit(adminUserId, "CLOSE_PRACTICE_ROOM", "PracticeRoom", roomId, {});
    return state;
  }

  async listRiskLogs() {
    return this.riskService.listRiskLogs();
  }

  // ---- System Config ----

  async getSystemConfig() {
    const rows = await this.prisma.systemConfig.findMany();
    const dbConfig = rows.reduce<Record<string, unknown>>(
      (config, row) => ({ ...config, [row.key]: row.value }),
      {},
    );
    // Mask sensitive values
    const merged: Record<string, unknown> = { ...DEFAULT_SYSTEM_CONFIG, ...dbConfig };
    for (const key of Object.keys(merged)) {
      if (HIGH_RISK_KEYS.includes(key)) {
        merged[key] = "***MASKED***";
      }
    }
    return merged;
  }

  async updateSystemConfig(
    adminUserId: string,
    adminRole: AdminRole,
    dto: UpdateSystemConfigDto,
  ) {
    // Only SUPER_ADMIN can change high-risk configs
    for (const key of Object.keys(dto.config)) {
      if (HIGH_RISK_KEYS.includes(key)) {
        if (adminRole !== AdminRole.SUPER_ADMIN) {
          throw new ForbiddenException({
            message: `配置项 "${key}" 只有超级管理员可以修改`,
            code: ErrorCodes.ADMIN_PERMISSION_DENIED,
          });
        }
      }
    }
    await Promise.all(
      Object.entries(dto.config).map(([key, value]) =>
        this.prisma.systemConfig.upsert({
          where: { key },
          update: { value: value as Prisma.InputJsonValue },
          create: { key, value: value as Prisma.InputJsonValue },
        }),
      ),
    );
    await this.audit(
      adminUserId,
      "UPDATE_SYSTEM_CONFIG",
      "SystemConfig",
      null,
      dto.config as Prisma.InputJsonObject,
    );
    return this.getSystemConfig();
  }

  // ---- Audit Logs ----

  async listAuditLogs() {
    return this.prisma.adminAuditLog.findMany({
      include: {
        adminUser: {
          select: { id: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }


  // ---- Team Ledger Rooms ----

  async listTeamLedgerRooms() {
    const idleBefore = new Date(Date.now() - ROOM_IDLE_TIMEOUT_MS);
    await this.prisma.teamLedgerRoom.updateMany({
      where: { status: { in: ["WAITING", "ACTIVE"] } as any, updatedAt: { lt: idleBefore } },
      data: { status: "CLOSED", endedAt: new Date() } as any,
    });
    return this.prisma.teamLedgerRoom.findMany({
      include: {
        owner: { select: { id: true, nickname: true, openid: true } },
        participants: { select: { id: true, displayName: true, role: true, status: true } },
        hands: { select: { id: true, handNo: true, status: true } },
        _count: { select: { hands: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async getTeamLedgerRoom(roomCode: string) {
    const room = await this.prisma.teamLedgerRoom.findUnique({
      where: { roomCode },
      include: {
        owner: { select: { id: true, nickname: true, openid: true } },
        participants: {
          orderBy: { seatNo: "asc" },
          include: { user: { select: { id: true, nickname: true } } },
        },
        hands: {
          orderBy: { handNo: "asc" },
          include: {
            entries: { include: { participant: true } },
          },
        },
        settlements: true,
      },
    });
    if (!room) throw new NotFoundException("团队记账房不存在");
    return room;
  }

  async closeTeamLedgerRoom(adminUserId: string, roomCode: string) {
    const room = await this.prisma.teamLedgerRoom.findUnique({
      where: { roomCode },
    });
    if (!room) throw new NotFoundException("团队记账房不存在");
    await this.prisma.teamLedgerRoom.update({
      where: { roomCode },
      data: { status: "CLOSED" } as any,
    });
    await this.audit(adminUserId, "CLOSE_TEAM_LEDGER_ROOM", "TeamLedgerRoom", room.id, { roomCode });
    return { roomCode, status: "CLOSED" };
  }

  // ---- Private ----

  private async findOrBootstrapAdmin(dto: AdminLoginDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { username: dto.username },
    });
    if (existing) return existing;

    const bootstrapUsername =
      process.env.ADMIN_DEFAULT_USERNAME ||
      process.env.ADMIN_DEV_USERNAME ||
      "admin";
    const bootstrapPassword =
      process.env.ADMIN_DEFAULT_PASSWORD ||
      process.env.ADMIN_DEV_PASSWORD ||
      "admin123456";
    if (
      dto.username !== bootstrapUsername ||
      !bootstrapPassword ||
      dto.password !== bootstrapPassword
    ) {
      throw new UnauthorizedException({
        message: "管理员账号或密码错误",
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      });
    }

    return this.prisma.adminUser.create({
      data: {
        username: dto.username,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: AdminRole.SUPER_ADMIN,
        status: AdminStatus.NORMAL,
      },
    });
  }

  async audit(
    adminUserId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    detail: Prisma.InputJsonObject,
  ) {
    return this.prisma.adminAuditLog.create({
      data: { adminUserId, action, targetType, targetId, detail },
    });
  }
}
