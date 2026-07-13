import { Injectable } from "@nestjs/common";

@Injectable()
export class SecurityService {
  /** Check if production secrets are using defaults */
  validateProductionSecrets(): string[] {
    if (process.env.NODE_ENV !== "production") return [];

    const warnings: string[] = [];
    const checks: [string, string | undefined, string][] = [
      ["JWT_SECRET", process.env.JWT_SECRET, "please_change_me"],
      ["ADMIN_JWT_SECRET", process.env.ADMIN_JWT_SECRET, "please_change_admin_secret"],
      ["WX_SECRET", process.env.WX_SECRET, "your_wechat_secret"],
      ["ADMIN_DEFAULT_PASSWORD", process.env.ADMIN_DEFAULT_PASSWORD, "admin123456"],
    ];

    for (const [key, value, defaultVal] of checks) {
      if (!value || value === defaultVal) {
        warnings.push(`${key} 不能使用默认值`);
      }
    }

    return warnings;
  }

  /** Sanitize data to prevent token leakage in logs */
  sanitizeForLog(data: unknown): unknown {
    if (typeof data === "string") {
      // Mask potential JWT tokens
      return data.replace(/Bearer\s+[A-Za-z0-9\-._~+/=]+/gi, "Bearer ***MASKED***");
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeForLog(item));
    }
    if (data && typeof data === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (["token", "authorization", "password", "secret", "session_key"].includes(key.toLowerCase())) {
          sanitized[key] = "***MASKED***";
        } else {
          sanitized[key] = this.sanitizeForLog(value);
        }
      }
      return sanitized;
    }
    return data;
  }
}
