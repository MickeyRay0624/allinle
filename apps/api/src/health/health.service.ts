import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    const checks: Record<string, { status: string; message?: string }> = {};

    // DB check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = { status: "ok" };
    } catch (error: any) {
      checks.db = { status: "error", message: error.message };
    }

    // Redis check
    try {
      const redisClient = (this.redisService as any).client;
      if (redisClient && redisClient.status === "ready") {
        checks.redis = { status: "ok" };
      } else {
        checks.redis = { status: "degraded", message: "Redis not connected" };
      }
    } catch (error: any) {
      checks.redis = { status: "error", message: error.message };
    }

    const allOk = Object.values(checks).every((c) => c.status === "ok" || c.status === "degraded");

    return {
      status: allOk ? "ok" : "error",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}
