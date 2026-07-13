import type { LegalAction } from "../actions";
import type { PokerActionType, PokerStreet } from "../poker-types";

export type BotLevelName = "BEGINNER" | "NORMAL" | "ADVANCED";

export interface BotDecisionInput {
  botLevel: BotLevelName;
  seatNo: number;
  holeCards: string[];
  boardCards: string[];
  street: Exclude<PokerStreet, "SHOWDOWN">;
  pot: number;
  currentBet: number;
  investedThisStreet: number;
  chips: number;
  minRaise: number;
  positionType: "EARLY" | "MIDDLE" | "LATE" | "BLINDS";
  activePlayerCount: number;
  legalActions: LegalAction[];
  random?: () => number;
}

export interface BotDecision {
  actionType: Extract<PokerActionType, "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN">;
  amount?: number;
  reason: string;
}
