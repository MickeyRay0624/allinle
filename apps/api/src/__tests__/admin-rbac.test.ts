import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJwtSign = vi.fn().mockReturnValue("mock-admin-token");

vi.mock("@nestjs/jwt", () => ({
  JwtService: vi.fn().mockImplementation(() => ({
    sign: mockJwtSign,
  })),
}));

const mockPrisma = {
  adminUser: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  adminAuditLog: { create: vi.fn() },
  systemConfig: { findMany: vi.fn(), upsert: vi.fn() },
  user: { count: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  ledgerGame: { count: vi.fn(), findMany: vi.fn() },
  practiceRoom: { count: vi.fn(), findMany: vi.fn() },
  practiceHand: { findMany: vi.fn(), findUnique: vi.fn() },
  riskLog: { count: vi.fn() },
};

vi.mock("../prisma/prisma.service", () => ({
  PrismaService: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock("../practice-room/practice-room.service", () => ({
  PracticeRoomService: vi.fn(),
}));

vi.mock("../risk/risk.service", () => ({
  RiskService: vi.fn().mockImplementation(() => ({ listRiskLogs: vi.fn().mockResolvedValue([]) })),
}));

import { AdminService } from "../admin/admin.service";
import { JwtService } from "@nestjs/jwt";

describe("AdminService - RBAC", () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(
      mockPrisma as any,
      new JwtService() as any,
      { adminCloseRoom: vi.fn() } as any,
      { listRiskLogs: vi.fn().mockResolvedValue([]) } as any,
    );
  });

  it("SUPER_ADMIN can create admin users", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue(null);
    mockPrisma.adminUser.create.mockResolvedValue({
      id: "new_admin",
      username: "new_admin",
      role: "ADMIN",
      status: "NORMAL",
    });

    const result = await service.createAdmin("super_id", "SUPER_ADMIN", {
      username: "new_admin",
      password: "pass123456",
      role: "ADMIN" as any,
    });

    expect(result.username).toBe("new_admin");
  });

  it("ADMIN cannot create admin users", async () => {
    await expect(
      service.createAdmin("admin_id", "ADMIN", {
        username: "new_admin",
        password: "pass123456",
      })
    ).rejects.toThrow("只有超级管理员");
  });

  it("OPERATOR cannot modify system config", async () => {
    await expect(
      service.updateSystemConfig("op_id", "OPERATOR", {
        config: { JWT_SECRET: "new_secret" },
      })
    ).rejects.toThrow("只有超级管理员可以修改");
  });

  it("cannot disable the last SUPER_ADMIN", async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({
      id: "last_super",
      role: "SUPER_ADMIN",
      status: "NORMAL",
    });
    mockPrisma.adminUser.count.mockResolvedValue(1);

    await expect(
      service.updateAdminStatus("admin_id", "SUPER_ADMIN", "last_super", {
        status: "DISABLED" as any,
      })
    ).rejects.toThrow("不能禁用最后一个超级管理员");
  });
});
