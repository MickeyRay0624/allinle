import type { GameState, PokerActionType } from "./poker-types";

export const PLAYER_ACTION_TYPES: PokerActionType[] = [
  "FOLD",
  "CHECK",
  "CALL",
  "BET",
  "RAISE",
  "ALL_IN"
];

export interface LegalAction {
  actionType: Extract<PokerActionType, "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN">;
  minAmount?: number;
  maxAmount?: number;
  callAmount?: number;
}

export function getLegalActions(state: GameState, seatNo: number): LegalAction[] {
  const player = state.players.find((candidate) => candidate.seatNo === seatNo);
  if (!player || state.status !== "PLAYING" || state.currentTurnSeat !== seatNo) return [];
  if (player.status !== "ACTIVE" || player.chips <= 0) return [];

  const actions: LegalAction[] = [{ actionType: "FOLD" }, { actionType: "ALL_IN" }];
  if (player.investedThisStreet === state.currentBet) {
    actions.push({ actionType: "CHECK" });
  } else {
    actions.push({
      actionType: "CALL",
      callAmount: Math.min(player.chips, state.currentBet - player.investedThisStreet)
    });
  }
  if (state.currentBet === 0) {
    actions.push({
      actionType: "BET",
      minAmount: Math.min(state.bigBlind, player.chips),
      maxAmount: player.chips
    });
  } else if (player.investedThisStreet + player.chips > state.currentBet) {
    const minRaiseTo = state.currentBet + state.minRaise;
    const maxRaiseTo = player.investedThisStreet + player.chips;
    actions.push({
      actionType: "RAISE",
      minAmount: Math.min(minRaiseTo, maxRaiseTo),
      maxAmount: maxRaiseTo
    });
  }
  return actions;
}

export function getLegalActionTypes(state: GameState, seatNo: number) {
  return getLegalActions(state, seatNo).map((action) => action.actionType);
}
