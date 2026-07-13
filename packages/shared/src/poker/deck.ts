import { randomInt } from "crypto";
import { RANKS, SUITS } from "./cards";

export function createDeck(): string[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`));
}

export function shuffleDeck(deck: string[] = createDeck()): string[] {
  const shuffled = deck.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function dealCards(deck: string[], count: number): { cards: string[]; deck: string[] } {
  if (count < 0) {
    throw new Error("Deal count must be positive");
  }
  if (deck.length < count) {
    throw new Error("Not enough cards in deck");
  }
  return {
    cards: deck.slice(0, count),
    deck: deck.slice(count)
  };
}
