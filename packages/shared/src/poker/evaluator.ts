import { cardRankValue, cardSuit, sortCardsByRankDesc } from "./cards";
import { HAND_RANK_LABEL, HAND_RANK_STRENGTH, HandRankCategory } from "./hand-rank";
import { EvaluatedHand, Winner } from "./poker-types";

interface ShowdownPlayer {
  seatNo: number;
  userId?: string | null;
  holeCards: string[];
}

export function evaluateSevenCards(cards: string[]): EvaluatedHand {
  if (cards.length !== 7) {
    throw new Error("Texas Hold'em evaluator expects exactly seven cards");
  }

  return combinations(cards, 5)
    .map(evaluateFiveCards)
    .sort(compareHands)
    .at(-1)!;
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  const categoryDiff = HAND_RANK_STRENGTH[a.rankCategory] - HAND_RANK_STRENGTH[b.rankCategory];
  if (categoryDiff !== 0) return categoryDiff;

  const maxLength = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let index = 0; index < maxLength; index += 1) {
    const diff = (a.tiebreakers[index] || 0) - (b.tiebreakers[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function findWinners(players: ShowdownPlayer[], boardCards: string[]): Winner[] {
  const ranked = players.map((player) => ({
    ...player,
    hand: evaluateSevenCards([...player.holeCards, ...boardCards])
  }));
  const best = ranked.map((player) => player.hand).sort(compareHands).at(-1);
  if (!best) return [];
  return ranked
    .filter((player) => compareHands(player.hand, best) === 0)
    .map((player) => ({
      seatNo: player.seatNo,
      userId: player.userId,
      hand: player.hand
    }));
}

function evaluateFiveCards(cards: string[]): EvaluatedHand {
  const values = cards.map(cardRankValue).sort((a, b) => b - a);
  const groups = groupRanks(values);
  const flush = new Set(cards.map(cardSuit)).size === 1;
  const straightHigh = getStraightHigh(values);

  if (flush && straightHigh === 14) {
    return hand(HandRankCategory.ROYAL_FLUSH, [14], sortStraightCards(cards, straightHigh));
  }
  if (flush && straightHigh) {
    return hand(HandRankCategory.STRAIGHT_FLUSH, [straightHigh], sortStraightCards(cards, straightHigh));
  }

  const four = groups.find((group) => group.count === 4);
  if (four) {
    const kicker = groups.find((group) => group.rank !== four.rank)!.rank;
    return hand(
      HandRankCategory.FOUR_OF_A_KIND,
      [four.rank, kicker],
      cardsForRanks(cards, [four.rank, four.rank, four.rank, four.rank, kicker])
    );
  }

  const three = groups.find((group) => group.count === 3);
  const pair = groups.find((group) => group.count === 2);
  if (three && pair) {
    return hand(
      HandRankCategory.FULL_HOUSE,
      [three.rank, pair.rank],
      cardsForRanks(cards, [three.rank, three.rank, three.rank, pair.rank, pair.rank])
    );
  }

  if (flush) {
    return hand(HandRankCategory.FLUSH, values, sortCardsByRankDesc(cards));
  }
  if (straightHigh) {
    return hand(HandRankCategory.STRAIGHT, [straightHigh], sortStraightCards(cards, straightHigh));
  }

  if (three) {
    const kickers = groups.filter((group) => group.rank !== three.rank).map((group) => group.rank);
    return hand(
      HandRankCategory.THREE_OF_A_KIND,
      [three.rank, ...kickers],
      cardsForRanks(cards, [three.rank, three.rank, three.rank, ...kickers])
    );
  }

  const pairs = groups.filter((group) => group.count === 2);
  if (pairs.length === 2) {
    const pairRanks = pairs.map((group) => group.rank).sort((a, b) => b - a);
    const kicker = groups.find((group) => group.count === 1)!.rank;
    return hand(
      HandRankCategory.TWO_PAIR,
      [...pairRanks, kicker],
      cardsForRanks(cards, [pairRanks[0], pairRanks[0], pairRanks[1], pairRanks[1], kicker])
    );
  }

  if (pairs.length === 1) {
    const pairRank = pairs[0].rank;
    const kickers = groups.filter((group) => group.rank !== pairRank).map((group) => group.rank);
    return hand(
      HandRankCategory.ONE_PAIR,
      [pairRank, ...kickers],
      cardsForRanks(cards, [pairRank, pairRank, ...kickers])
    );
  }

  return hand(HandRankCategory.HIGH_CARD, values, sortCardsByRankDesc(cards));
}

function hand(rankCategory: HandRankCategory, tiebreakers: number[], bestFiveCards: string[]): EvaluatedHand {
  return {
    rankCategory,
    rankValue: encodeRank(rankCategory, tiebreakers),
    tiebreakers,
    bestFiveCards,
    description: HAND_RANK_LABEL[rankCategory]
  };
}

function encodeRank(category: HandRankCategory, tiebreakers: number[]) {
  const padded = [...tiebreakers];
  while (padded.length < 5) padded.push(0);
  return [HAND_RANK_STRENGTH[category], ...padded].reduce((value, part) => value * 15 + part, 0);
}

function groupRanks(values: number[]) {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function getStraightHigh(values: number[]): number | null {
  const unique = [...new Set(values)];
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window.every((value, offset) => offset === 0 || value === window[offset - 1] - 1)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }
  return null;
}

function sortStraightCards(cards: string[], straightHigh: number): string[] {
  const ranks =
    straightHigh === 5
      ? [5, 4, 3, 2, 14]
      : Array.from({ length: 5 }, (_, index) => straightHigh - index);
  return cardsForRanks(cards, ranks);
}

function cardsForRanks(cards: string[], ranks: number[]) {
  const remaining = cards.slice();
  const result: string[] = [];
  for (const rank of ranks) {
    const index = remaining.findIndex((card) => cardRankValue(card) === rank);
    if (index >= 0) {
      result.push(remaining[index]);
      remaining.splice(index, 1);
    }
  }
  return result;
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [head, ...tail] = items;
  return [
    ...combinations(tail, size - 1).map((combo) => [head, ...combo]),
    ...combinations(tail, size)
  ];
}
