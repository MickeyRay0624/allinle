export const SUITS = ["S", "H", "D", "C"] as const;
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

export function validateCard(card: string): boolean {
  if (card.length !== 2) return false;
  const [rank, suit] = card.split("");
  return RANKS.includes(rank as Rank) && SUITS.includes(suit as Suit);
}

export function assertValidCard(card: string): asserts card is `${Rank}${Suit}` {
  if (!validateCard(card)) {
    throw new Error(`Invalid card: ${card}`);
  }
}

export function cardRank(card: string): Rank {
  assertValidCard(card);
  return card[0] as Rank;
}

export function cardSuit(card: string): Suit {
  assertValidCard(card);
  return card[1] as Suit;
}

export function cardRankValue(card: string): number {
  return RANK_VALUE[cardRank(card)];
}

export function sortCardsByRankDesc(cards: string[]): string[] {
  return cards.slice().sort((a, b) => cardRankValue(b) - cardRankValue(a));
}

export function maskHoleCardsForOtherPlayers<T extends { seatNo: number; holeCards: string[] }>(
  players: T[],
  viewerSeatNo: number
): T[] {
  return players.map((player) => ({
    ...player,
    holeCards: player.seatNo === viewerSeatNo ? player.holeCards : []
  }));
}
