import { cardRankValue, cardSuit } from "../cards";

export function postflopStrength(holeCards: string[], boardCards: string[]) {
  const cards = [...holeCards, ...boardCards];
  const values = cards.map(cardRankValue);
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const maxCount = Math.max(...counts.values());
  const pairCount = [...counts.values()].filter((count) => count >= 2).length;
  const suits = new Map<string, number>();
  cards.forEach((card) => suits.set(cardSuit(card), (suits.get(cardSuit(card)) || 0) + 1));
  const flushDraw = [...suits.values()].some((count) => count >= 4);
  const topPair = holeCards.some((card) => boardCards.some((board) => cardRankValue(card) === cardRankValue(board)));
  const overPair = holeCards[0][0] === holeCards[1][0] && boardCards.every((card) => cardRankValue(holeCards[0]) > cardRankValue(card));

  let score = 0.18;
  if (maxCount >= 4) score = 0.95;
  else if (maxCount === 3 && pairCount >= 2) score = 0.88;
  else if (maxCount === 3) score = 0.7;
  else if (pairCount >= 2) score = 0.56;
  else if (topPair || overPair) score = 0.45;
  if (flushDraw) score += 0.12;
  if (holeCards.some((card) => cardRankValue(card) >= 13)) score += 0.06;
  return Math.max(0, Math.min(1, score));
}
