import { describe, expect, it } from "vitest";
import { allocateSidePots, buildSidePots } from "./pot";

describe("pot", () => {
  it("creates one pot without all-in layers", () => {
    const pots = buildSidePots([
      { seatNo: 1, investedThisHand: 100, status: "ACTIVE" },
      { seatNo: 2, investedThisHand: 100, status: "ACTIVE" }
    ]);
    expect(pots).toEqual([{ amount: 200, eligibleSeatNos: [1, 2] }]);
  });

  it("creates main and side pots for two all-in levels", () => {
    const pots = buildSidePots([
      { seatNo: 1, investedThisHand: 50, status: "ALL_IN" },
      { seatNo: 2, investedThisHand: 100, status: "ACTIVE" },
      { seatNo: 3, investedThisHand: 100, status: "ACTIVE" }
    ]);
    expect(pots).toEqual([
      { amount: 150, eligibleSeatNos: [1, 2, 3] },
      { amount: 100, eligibleSeatNos: [2, 3] }
    ]);
  });

  it("creates multiple side pots for three all-ins", () => {
    const pots = buildSidePots([
      { seatNo: 1, investedThisHand: 25, status: "ALL_IN" },
      { seatNo: 2, investedThisHand: 75, status: "ALL_IN" },
      { seatNo: 3, investedThisHand: 150, status: "ACTIVE" }
    ]);
    expect(pots).toEqual([
      { amount: 75, eligibleSeatNos: [1, 2, 3] },
      { amount: 100, eligibleSeatNos: [2, 3] },
      { amount: 75, eligibleSeatNos: [3] }
    ]);
  });

  it("splits tied pots and assigns odd chips by seat order", () => {
    const allocations = allocateSidePots([{ amount: 101, eligibleSeatNos: [1, 2] }], {
      1: 1000,
      2: 1000
    });
    expect(allocations[0].payouts).toEqual({ 1: 51, 2: 50 });
  });

  it("keeps folded players out of eligible winners", () => {
    const pots = buildSidePots([
      { seatNo: 1, investedThisHand: 100, status: "FOLDED" },
      { seatNo: 2, investedThisHand: 100, status: "ACTIVE" }
    ]);
    expect(pots).toEqual([{ amount: 200, eligibleSeatNos: [2] }]);
  });
});
