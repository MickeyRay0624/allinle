import { describe, expect, it } from "vitest";
import { compareHands, evaluateSevenCards, findWinners } from "./evaluator";
import { HandRankCategory } from "./hand-rank";

describe("evaluator", () => {
  it("detects a royal flush", () => {
    const hand = evaluateSevenCards(["AS", "KS", "QS", "JS", "TS", "2C", "3D"]);
    expect(hand.rankCategory).toBe(HandRankCategory.ROYAL_FLUSH);
    expect(hand.bestFiveCards).toHaveLength(5);
  });

  it("handles wheel straights with ace as one", () => {
    const hand = evaluateSevenCards(["AS", "2D", "3C", "4H", "5S", "KD", "9C"]);
    expect(hand.rankCategory).toBe(HandRankCategory.STRAIGHT);
    expect(hand.tiebreakers[0]).toBe(5);
  });

  it("compares kickers within the same category", () => {
    const better = evaluateSevenCards(["AS", "AD", "KH", "QC", "9S", "5D", "2C"]);
    const worse = evaluateSevenCards(["AH", "AC", "QH", "JC", "9D", "5C", "2S"]);
    expect(compareHands(better, worse)).toBeGreaterThan(0);
  });

  it("finds multiple tied winners", () => {
    const boardCards = ["AS", "KD", "QC", "JH", "TS"];
    const winners = findWinners(
      [
        { seatNo: 1, holeCards: ["2S", "3S"] },
        { seatNo: 2, holeCards: ["4D", "5D"] }
      ],
      boardCards
    );
    expect(winners.map((winner) => winner.seatNo)).toEqual([1, 2]);
  });
});
