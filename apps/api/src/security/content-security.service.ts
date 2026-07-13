import { Injectable } from "@nestjs/common";

const SENSITIVE_WORDS = [
  "赌博", "赌场", "赌钱", "押注", "博彩", "彩票", "六合彩",
  "充值", "提现", "现金", "真钱", "人民币", "赚钱", "发财",
  "代理", "返水", "抽水", "佣金", "下线", "拉人",
  "微信支付", "支付宝", "银行卡", "转账",
  // English
  "gambling", "casino", "betting", "real money",
  "deposit", "withdraw", "cash out", "agent", "commission",
];

@Injectable()
export class ContentSecurityService {
  check(content: string): {
    safe: boolean;
    hitWords: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
  } {
    const hitWords: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const word of SENSITIVE_WORDS) {
      if (lowerContent.includes(word.toLowerCase())) {
        hitWords.push(word);
      }
    }

    if (hitWords.length === 0) {
      return { safe: true, hitWords: [], riskLevel: "LOW" };
    }

    const isHighRisk = hitWords.some((w) =>
      ["赌博", "赌场", "赌钱", "押注", "博彩", "gambling", "casino", "betting", "充值", "提现", "现金", "真钱", "deposit", "withdraw", "real money"].includes(w),
    );

    return {
      safe: false,
      hitWords,
      riskLevel: isHighRisk ? "HIGH" : "MEDIUM",
    };
  }

  async logContentCheck(
    prisma: any,
    params: {
      userId?: string;
      content: string;
      contentType: string;
      checkResult: string;
      riskLevel: string;
      detail?: Record<string, unknown>;
    },
  ) {
    return prisma.contentCheckLog.create({ data: params });
  }
}
