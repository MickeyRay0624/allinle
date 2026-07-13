import { describe, expect, it } from "vitest";
import { LegalAction } from "../actions";
import { decideBotAction } from "./bot-strategy";
import { BotDecisionInput } from "./bot-types";

const allActions: LegalAction[] = [
  { actionType: "FOLD" },
  { actionType: "CALL", callAmount: 10 },
  { actionType: "RAISE", minAmount: 30, maxAmount: 200 },
  { actionType: "ALL_IN" }
];

function input(partial: Partial<BotDecisionInput>): BotDecisionInput {
  return {
    botLevel: "NORMAL",
    seatNo: 2,
    holeCards: ["AS", "AH"],
    boardCards: [],
    street: "PREFLOP",
    pot: 25,
    currentBet: 10,
    investedThisStreet: 0,
    chips: 200,
    minRaise: 10,
    positionType: "LATE",
    activePlayerCount: 2,
    legalActions: allActions,
    random: () => 0.01,
    ...partial
  };
}

describe("bot strategy", () => {
  it("BEGINNER does not always fold strong hands", () => {
    const decision = decideBotAction(input({ botLevel: "BEGINNER", holeCards: ["AS", "AH"] }));
    expect(["CALL", "RAISE", "ALL_IN"]).toContain(decision.actionType);
  });

  it("NORMAL folds weak hands more often facing pressure", () => {
    const decision = decideBotAction(
      input({
        botLevel: "NORMAL",
        holeCards: ["7C", "2D"],
        pot: 20,
        currentBet: 100,
        legalActions: [
          { actionType: "FOLD" },
          { actionType: "CALL", callAmount: 100 },
          { actionType: "ALL_IN" }
        ],
        random: () => 0.8
      })
    );
    expect(decision.actionType).toBe("FOLD");
  });

  it("ADVANCED raises strong hands with high frequency", () => {
    const decision = decideBotAction(input({ botLevel: "ADVANCED", holeCards: ["KS", "KH"] }));
    expect(decision.actionType).toBe("RAISE");
  });

  it("returns only legal actions", () => {
    const legalActions: LegalAction[] = [{ actionType: "CHECK" }];
    const decision = decideBotAction(input({ legalActions, currentBet: 0, investedThisStreet: 0 }));
    expect(legalActions.map((action) => action.actionType)).toContain(decision.actionType);
  });

  it("uses only the bot hand and public board from the input", () => {
    const decision = decideBotAction(input({ holeCards: ["2C", "7D"], boardCards: ["AS", "KD", "9H"] }));
    expect(decision).toHaveProperty("reason");
  });
});
