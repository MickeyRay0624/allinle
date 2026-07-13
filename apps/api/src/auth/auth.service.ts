import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { ErrorCodes } from "@allinle/shared";
import { PrismaService } from "../prisma/prisma.service";
import { WechatService } from "./wechat.service";
import { DevLoginDto } from "./dto/dev-login.dto";
import { WxLoginDto } from "./dto/wx-login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly wechatService: WechatService,
  ) {}

  async devLogin(dto: DevLoginDto) {
    if (process.env.NODE_ENV === "production") {
      throw new ForbiddenException({
        message: "生产环境不允许开发登录",
        code: ErrorCodes.AUTH_DEV_LOGIN_DISABLED,
      });
    }

    const openid = dto.openid || `dev_${randomUUID()}`;
    const user = await this.prisma.user.upsert({
      where: { openid },
      update: {
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
      create: {
        openid,
        nickname: dto.nickname || "ALLINLE 测试用户",
        avatarUrl: dto.avatarUrl,
        lastLoginAt: new Date(),
        loginCount: 1,
      },
    });

    this.assertUserCanLogin(user.status);
    return {
      token: this.signUserToken(user.id, user.openid),
      user: this.sanitizeUser(user),
    };
  }

  async wxLogin(dto: WxLoginDto) {
    const session = await this.wechatService.code2Session(dto.code);

    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      update: {
        nickname: dto.nickname || undefined,
        avatarUrl: dto.avatarUrl || undefined,
        unionid: session.unionid || undefined,
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
      create: {
        openid: session.openid,
        unionid: session.unionid,
        nickname: dto.nickname || "微信用户",
        avatarUrl: dto.avatarUrl,
        lastLoginAt: new Date(),
        loginCount: 1,
      },
    });

    this.assertUserCanLogin(user.status);
    return {
      token: this.signUserToken(user.id, user.openid),
      user: this.sanitizeUser(user),
    };
  }

  private signUserToken(userId: string, openid: string): string {
    this.validateJwtSecret();
    return this.jwtService.sign(
      {
        sub: userId,
        openid,
        type: "USER",
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );
  }

  private validateJwtSecret(): void {
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.JWT_SECRET || process.env.JWT_SECRET === "please_change_me")
    ) {
      throw new InternalServerErrorException("生产环境必须设置 JWT_SECRET，不能使用默认值");
    }
  }

  private assertUserCanLogin(status: UserStatus) {
    if (status === UserStatus.BANNED) {
      throw new ForbiddenException({
        message: "账号已被封禁，无法登录",
        code: ErrorCodes.AUTH_BANNED,
      });
    }
  }

  private sanitizeUser(user: Record<string, unknown>) {
    return {
      id: user.id,
      openid: user.openid,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt ?? null,
      loginCount: user.loginCount ?? 0,
      createdAt: user.createdAt,
    };
  }
}
