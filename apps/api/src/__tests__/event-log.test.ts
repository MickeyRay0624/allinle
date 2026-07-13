import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  eventLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("../prisma/prisma.service", () => ({
  PrismaService: vi.fn().mockImplementation(() => mockPrisma),
}));

import { EventLogService } from "../event-log/event-log.service";

describe("EventLogService", () => {
  let service: EventLogService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventLogService(mockPrisma as any);
  });

  it("should track events successfully", async () => {
    mockPrisma.eventLog.create.mockResolvedValue({
      id: "evt_1",
      eventName: "page_view",
      eventGroup: "miniprogram",
    });

    const result = await service.track({
      eventName: "page_view",
      eventGroup: "miniprogram",
      metadata: { page: "/pages/index/index" },
    });

    expect(result.eventName).toBe("page_view");
  });

  it("should reject metadata exceeding size limit", async () => {
    const hugeMetadata = { data: "x".repeat(5000) };

    await expect(
      service.track({
        eventName: "test",
        metadata: hugeMetadata,
      })
    ).rejects.toThrow("metadata exceeds maximum size");
  });

  it("should allow anonymous events without userId", async () => {
    mockPrisma.eventLog.create.mockResolvedValue({
      id: "evt_2",
      eventName: "app_launch",
      eventGroup: "miniprogram",
    });

    const result = await service.track({
      eventName: "app_launch",
      eventGroup: "miniprogram",
    });

    expect(result.eventName).toBe("app_launch");
    expect(mockPrisma.eventLog.create).toHaveBeenCalled();
    const callArg = mockPrisma.eventLog.create.mock.calls[0][0];
    expect(callArg.data.userId).toBeNull();
  });

  it("should bind userId when provided", async () => {
    mockPrisma.eventLog.create.mockResolvedValue({
      id: "evt_3",
      eventName: "login",
      eventGroup: "auth",
      userId: "user_123",
    });

    await service.track({
      eventName: "login",
      eventGroup: "auth",
      userId: "user_123",
    });

    const callArg = mockPrisma.eventLog.create.mock.calls[0][0];
    expect(callArg.data.userId).toBe("user_123");
  });

  it("should list events with filters", async () => {
    mockPrisma.eventLog.findMany.mockResolvedValue([
      { id: "evt_1", eventName: "page_view", eventGroup: "miniprogram" },
    ]);
    mockPrisma.eventLog.count.mockResolvedValue(1);

    const result = await service.listEvents({
      eventGroup: "miniprogram",
      take: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
