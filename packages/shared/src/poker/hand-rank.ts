export enum HandRankCategory {
  HIGH_CARD = "HIGH_CARD",
  ONE_PAIR = "ONE_PAIR",
  TWO_PAIR = "TWO_PAIR",
  THREE_OF_A_KIND = "THREE_OF_A_KIND",
  STRAIGHT = "STRAIGHT",
  FLUSH = "FLUSH",
  FULL_HOUSE = "FULL_HOUSE",
  FOUR_OF_A_KIND = "FOUR_OF_A_KIND",
  STRAIGHT_FLUSH = "STRAIGHT_FLUSH",
  ROYAL_FLUSH = "ROYAL_FLUSH"
}

export const HAND_RANK_STRENGTH: Record<HandRankCategory, number> = {
  [HandRankCategory.HIGH_CARD]: 1,
  [HandRankCategory.ONE_PAIR]: 2,
  [HandRankCategory.TWO_PAIR]: 3,
  [HandRankCategory.THREE_OF_A_KIND]: 4,
  [HandRankCategory.STRAIGHT]: 5,
  [HandRankCategory.FLUSH]: 6,
  [HandRankCategory.FULL_HOUSE]: 7,
  [HandRankCategory.FOUR_OF_A_KIND]: 8,
  [HandRankCategory.STRAIGHT_FLUSH]: 9,
  [HandRankCategory.ROYAL_FLUSH]: 10
};

export const HAND_RANK_LABEL: Record<HandRankCategory, string> = {
  [HandRankCategory.HIGH_CARD]: "High Card",
  [HandRankCategory.ONE_PAIR]: "One Pair",
  [HandRankCategory.TWO_PAIR]: "Two Pair",
  [HandRankCategory.THREE_OF_A_KIND]: "Three of a Kind",
  [HandRankCategory.STRAIGHT]: "Straight",
  [HandRankCategory.FLUSH]: "Flush",
  [HandRankCategory.FULL_HOUSE]: "Full House",
  [HandRankCategory.FOUR_OF_A_KIND]: "Four of a Kind",
  [HandRankCategory.STRAIGHT_FLUSH]: "Straight Flush",
  [HandRankCategory.ROYAL_FLUSH]: "Royal Flush"
};
