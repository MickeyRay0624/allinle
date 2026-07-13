import { cardRankValue } from "../cards";

export function preflopStrength(holeCards: string[]) {
  const [a, b] = holeCards;
  const av = cardRankValue(a);
  const bv = cardRankValue(b);
  const high = Math.max(av, bv);
  const low = Math.min(av, bv);
  const paired = av === bv;
  const suited = a[1] === b[1];
  const connected = Math.abs(av - bv) <= 1;

  let score = high / 14;
  if (paired) score += 0.45 + high / 40;
  if (suited) score += 0.08;
  if (connected) score += 0.08;
  if (high >= 13 && low >= 10) score += 0.18;
  if (high >= 14 && low >= 9) score += 0.1;
  if (low <= 5 && !paired && !suited && !connected) score -= 0.12;

  return Math.max(0, Math.min(1, score / 1.45));
}
