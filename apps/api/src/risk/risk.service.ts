import { Injectable } from "@nestjs/common";
import { Prisma, RiskLevel } from "@prisma/client";
import { containsSensitiveWord } from "@allinle/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  async createRiskLog(input: {
    userId?: string | null;
    roomId?: string | null;
    eventType: string;
    riskLevel: RiskLevel;
    detail?: Prisma.InputJsonObject;
  }) {
    return this.prisma.riskLog.create({
      data: {
        userId: input.userId || null,
        roomId: input.roomId || null,
        eventType: input.eventType,
        riskLevel: input.riskLevel,
        detail: input.detail
      }
    });
  }

  async logSensitiveContent(input: {
    userId?: string | null;
    roomId?: string | null;
    source: string;
    content?: string | null;
  }) {
    if (!containsSensitiveWord(input.content)) {
      return null;
    }
    return this.createRiskLog({
      userId: input.userId,
      roomId: input.roomId,
      eventType: "SENSITIVE_WORD",
      riskLevel: RiskLevel.MEDIUM,
      detail: {
        source: input.source,
        content: input.content
      }
    });
  }

  async listRiskLogs() {
    return this.prisma.riskLog.findMany({
      include: {
        user: { select: { id: true, nickname: true, openid: true } },
        room: { select: { id: true, roomCode: true, status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  }
}
