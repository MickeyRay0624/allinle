import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ErrorCodes } from "@allinle/shared";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options?: { windowMs?: number; maxRequests?: number }) {
    this.windowMs = options?.windowMs || 60_000;
    this.maxRequests =
      options?.maxRequests ||
      Number(process.env.API_RATE_LIMIT_PER_MINUTE) ||
      60;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      ip: string;
      originalUrl: string;
      user?: { id: string };
    }>();
    const key = request.user?.id || request.ip || "unknown";
    const now = Date.now();

    let entry = this.store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      throw new HttpException(
        {
          message: "请求过于频繁，请稍后重试",
          code: ErrorCodes.RATE_LIMITED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of this.store) {
        if (now > v.resetAt) this.store.delete(k);
      }
    }

    return true;
  }
}

/** Stricter rate limit for login endpoints */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs = 60_000;
  private readonly maxRequests =
    Number(process.env.LOGIN_RATE_LIMIT_PER_MINUTE) || 10;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ ip: string }>();
    const key = request.ip || "unknown";
    const now = Date.now();

    let entry = this.store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(key, entry);
    }

    entry.count++;
    if (entry.count > this.maxRequests) {
      throw new HttpException(
        {
          message: "登录过于频繁，请稍后重试",
          code: ErrorCodes.RATE_LIMITED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
