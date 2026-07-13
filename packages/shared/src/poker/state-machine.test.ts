import { describe, expect, it } from "vitest";
import { createDeck } from "./deck";
import { applyGameAction, createInitialGameState } from "./state-machine";

const players = [
  { userId: "u1", seatNo: 1, nickname: "A", chips: 1000 },
  { userId: "u2", seatNo: 2, nickname: "B", chips: 1000 }
];

describe("state-machine", () => {
  it("starts a heads-up hand with dealer as small blind", () => {
    const state = createInitialGameState({
      roomId: "room",
      roomCode: "ABC123",
      handId: "hand",
      handNo: 1,
      smallBlind: 50,
      bigBlind: 100,
      players,
      dealerSeat: 1,
      deck: createDeck()
    });

    expect(state.dealerSeat).toBe(1);
    expect(state.smallBlindSeat).toBe(1);
    expect(state.bigBlindSeat).toBe(2);
    expect(state.currentTurnSeat).toBe(1);
    expect(state.pot).toBe(150);
    expect(state.players[0].holeCards).toHaveLength(2);
  });

  it("advances to flop after preflop calls and checks", () => {
    let state = createInitialGameState({
      roomId: "room",
      roomCode: "ABC123",
      handId: "hand",
      handNo: 1,
      smallBlind: 50,
      bigBlind: 100,
      players,
      dealerSeat: 1,
      deck: createDeck()
    });

    state = applyGameAction(state, { seatNo: 1, userId: "u1", actionType: "CALL" }).state;
    const result = applyGameAction(state, { seatNo: 2, userId: "u2", actionType: "CHECK" });

    expect(result.state.street).toBe("FLOP");
    expect(result.state.boardCards).toHaveLength(3);
    expect(result.state.currentTurnSeat).toBe(2);
    expect(result.events).toContain("street_changed");
  });

  it("finishes immediately when everyone else folds", () => {
    const state = createInitialGameState({
      roomId: "room",
      roomCode: "ABC123",
      handId: "hand",
      handNo: 1,
      smallBlind: 50,
      bigBlind: 100,
      players,
      dealerSeat: 1,
      deck: createDeck()
    });

    const result = applyGameAction(state, { seatNo: 1, userId: "u1", actionType: "FOLD" });
    expect(result.state.status).toBe("HAND_FINISHED");
    expect(result.state.winnerInfo?.reason).toBe("ALL_OTHERS_FOLDED");
  });
});
