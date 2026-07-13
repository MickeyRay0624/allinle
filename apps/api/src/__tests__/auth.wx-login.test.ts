import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJwtSign = vi.fn().mockReturnValue("mock-jwt-token");

vi.mock("@nestjs/jwt", () => ({
  JwtService: vi.fn().mockImplementation(() => ({
    sign: mockJwtSign,
  })),
}));

vi.mock("@prisma/client", () => ({
  UserStatus: { NORMAL: "NORMAL", LIMITED: "LIMITED", BANNED: "BANNED" },
}));

const mockPrisma = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock("../prisma/prisma.service", () => ({
  PrismaService: vi.fn().mockImplementation(() => mockPrisma),
}));

const mockWechatService = {
  code2Session: vi.fn(),
};

vi.mock("../auth/wechat.service", () => ({
  WechatService: vi.fn().mockImplementation(() => mockWechatService),
}));

import { AuthService } from "../auth/auth.service";
import { JwtService } from "@nestjs/jwt";

describe("AuthService - wxLogin", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      mockPrisma as any,
      new JwtService() as any,
      mockWechatService as any,
    );
  });

  it("should create new user on first WeChat login", async () => {
    mockWechatService.code2Session.mockResolvedValue({
      openid: "wx_test_openid_123",
      session_key: "sk_xxx",
    });
    mockPrisma.user.upsert.mockResolvedValue({
      id: "user_1",
      openid: "wx_test_openid_123",
      status: "NORMAL",
      nickname: "微信用户",
      avatarUrl: null,
      lastLoginAt: new Date(),
      loginCount: 1,
      createdAt: new Date(),
    });

    const result = await service.wxLogin({ code: "test_code" });

    expect(result.token).toBe("mock-jwt-token");
    expect(result.user.openid).toBe("wx_test_openid_123");
    expect((result as any).session_key).toBeUndefined();
  });

  it("should reject BANNED users", async () => {
    mockWechatService.code2Session.mockResolvedValue({
      openid: "wx_banned_user",
      session_key: "sk_zzz",
    });
    mockPrisma.user.upsert.mockResolvedValue({
      id: "user_3",
      openid: "wx_banned_user",
      status: "BANNED",
      nickname: null,
      avatarUrl: null,
      lastLoginAt: null,
      loginCount: 0,
      createdAt: new Date(),
    });

    await expect(
      service.wxLogin({ code: "test_code_3" })
    ).rejects.toThrow("账号已被封禁");
  });

  it("should reject dev-login in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await expect(
      service.devLogin({ nickname: "test" })
    ).rejects.toThrow("生产环境不允许开发登录");

    process.env.NODE_ENV = originalEnv;
  });
});
