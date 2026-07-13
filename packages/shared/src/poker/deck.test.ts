import { describe, expect, it } from "vitest";
import { createDeck, dealCards, shuffleDeck } from "./deck";

describe("deck", () => {
  it("creates a standard 52-card deck", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck).size).toBe(52);
    expect(deck).toContain("AS");
    expect(deck).toContain("2C");
  });

  it("shuffles without changing card identity", () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    expect(new Set(shuffled).size).toBe(52);
    expect(shuffled.sort()).toEqual(deck.sort());
  });

  it("deals cards immutably", () => {
    const deck = createDeck();
    const result = dealCards(deck, 2);
    expect(result.cards).toEqual(["2S", "2H"]);
    expect(result.deck).toHaveLength(50);
    expect(deck).toHaveLength(52);
  });
});
