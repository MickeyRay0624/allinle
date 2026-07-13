import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface TrackEventInput {
  eventName: string;
  eventGroup?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class EventLogService {
  private readonly MAX_METADATA_SIZE = 4096;

  constructor(private readonly prisma: PrismaService) {}

  async track(input: TrackEventInput) {
    const metadataJson = input.metadata
      ? JSON.stringify(input.metadata)
      : undefined;

    // Enforce metadata size limit
    if (metadataJson && Buffer.byteLength(metadataJson, "utf-8") > this.MAX_METADATA_SIZE) {
      throw new Error("metadata exceeds maximum size of 4096 bytes");
    }

    return this.prisma.eventLog.create({
      data: {
        userId: input.userId || null,
        eventName: input.eventName,
        eventGroup: input.eventGroup || null,
        metadata: input.metadata as any || undefined,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
      },
    });
  }

  async listEvents(params: {
    eventName?: string;
    eventGroup?: string;
    userId?: string;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};
    if (params.eventName) where.eventName = params.eventName;
    if (params.eventGroup) where.eventGroup = params.eventGroup;
    if (params.userId) where.userId = params.userId;

    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip || 0,
        take: Math.min(params.take || 50, 200),
      }),
      this.prisma.eventLog.count({ where }),
    ]);

    return { items, total };
  }
}
