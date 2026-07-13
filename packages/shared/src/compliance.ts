export const PRACTICE_COMPLIANCE_NOTICE =
  "本功能仅用于德州扑克规则学习与牌技交流。房间内所有筹码均为模拟练习筹码，不具备任何财产属性，不支持充值、提现、转让或兑换。";

export const SENSITIVE_WORDS = [
  "充值",
  "提现",
  "兑换",
  "转账",
  "红包",
  "支付",
  "赌",
  "抽水",
  "上分",
  "下分"
];

export function containsSensitiveWord(input?: string | null): boolean {
  if (!input) return false;
  return SENSITIVE_WORDS.some((word) => input.includes(word));
}
