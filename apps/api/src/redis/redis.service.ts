import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    this.client.on("error", (error) => {
      this.logger.warn(`Redis connection warning: ${error.message}`);
    });

    this.client.connect().catch((error) => {
      this.logger.warn(`Redis is not connected yet: ${error.message}`);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    if (!this.client) return;
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, "EX", ttlSeconds);
      return;
    }
    await this.client.set(key, payload);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const payload = await this.client.get(key);
    return payload ? (JSON.parse(payload) as T) : null;
  }

  async publish(channel: string, value: unknown) {
    if (!this.client) return;
    await this.client.publish(channel, JSON.stringify(value));
  }

  async del(key: string) {
    if (!this.client) return;
    await this.client.del(key);
  }
}
