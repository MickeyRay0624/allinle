import { describe, it, expect, vi, beforeEach } from "vitest";

import { SecurityService } from "../security/security.service";
import { ContentSecurityService } from "../security/content-security.service";

describe("SecurityService", () => {
  const service = new SecurityService();

  it("should detect default secrets in production", () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const origJwt = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "please_change_me";

    const warnings = service.validateProductionSecrets();
    expect(warnings.length).toBeGreaterThan(0);

    process.env.NODE_ENV = original;
    process.env.JWT_SECRET = origJwt;
  });

  it("should sanitize Bearer tokens in logs", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx";
    const result = service.sanitizeForLog(input) as string;
    expect(result).not.toContain("eyJhbGciOi");
    expect(result).toContain("***MASKED***");
  });

  it("should sanitize password fields", () => {
    const input = { username: "admin", password: "secret123", email: "a@b.com" };
    const result = service.sanitizeForLog(input) as Record<string, unknown>;
    expect(result.password).toBe("***MASKED***");
    expect(result.username).toBe("admin");
  });
});

describe("ContentSecurityService", () => {
  const service = new ContentSecurityService();

  it("should pass safe content", () => {
    const result = service.check("今天天气真好，适合打牌练习");
    expect(result.safe).toBe(true);
    expect(result.hitWords).toHaveLength(0);
  });

  it("should detect gambling-related content", () => {
    const result = service.check("赌博赚钱真容易");
    expect(result.safe).toBe(false);
    expect(result.hitWords.length).toBeGreaterThan(0);
    expect(result.riskLevel).toBe("HIGH");
  });

  it("should detect payment-related content", () => {
    const result = service.check("可以通过微信支付充值金币");
    expect(result.safe).toBe(false);
    expect(result.riskLevel).toBe("HIGH");
  });

  it("should detect medium risk content", () => {
    const result = service.check("找代理拉人加入");
    expect(result.safe).toBe(false);
    expect(result.riskLevel).toBe("MEDIUM");
  });
});
