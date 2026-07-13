import type { LegalAction } from "../actions";
import type { BotDecision, BotDecisionInput, BotLevelName } from "./bot-types";
import { postflopStrength } from "./postflop";
import { preflopStrength } from "./preflop";

export function decideBotAction(input: BotDecisionInput): BotDecision {
  const random = input.random || Math.random;
  const strength =
    input.street === "PREFLOP"
      ? preflopStrength(input.holeCards)
      : postflopStrength(input.holeCards, input.boardCards);
  const facingBet = input.currentBet > input.investedThisStreet;
  const callAction = findAction(input.legalActions, "CALL");
  const betAction = findAction(input.legalActions, "BET");
  const raiseAction = findAction(input.legalActions, "RAISE");
  const checkAction = findAction(input.legalActions, "CHECK");
  const foldAction = findAction(input.legalActions, "FOLD");
  const allInAction = findAction(input.legalActions, "ALL_IN");
  const pressure = callAction?.callAmount ? callAction.callAmount / Math.max(1, input.pot + callAction.callAmount) : 0;
  const profile = profileFor(input.botLevel);
  const adjustedStrength = Math.max(
    0,
    Math.min(
      1,
      strength +
        (input.positionType === "LATE" ? profile.positionBonus : 0) -
        Math.max(0, input.activePlayerCount - 2) * profile.multiwayPenalty
    )
  );

  if (raiseAction && adjustedStrength >= profile.raiseStrong && random() < profile.raiseFrequency) {
    return {
      actionType: "RAISE",
      amount: chooseRaiseAmount(raiseAction, input, adjustedStrength),
      reason: `${input.botLevel} strong hand raises`
    };
  }
  if (betAction && adjustedStrength >= profile.betStrong && random() < profile.betFrequency) {
    return {
      actionType: "BET",
      amount: chooseBetAmount(betAction, input, adjustedStrength),
      reason: `${input.botLevel} value bet`
    };
  }
  if ((betAction || raiseAction) && adjustedStrength < 0.35 && random() < profile.bluffFrequency) {
    const action = betAction || raiseAction!;
    return {
      actionType: action.actionType,
      amount: chooseBetAmount(action, input, 0.4),
      reason: `${input.botLevel} low frequency bluff`
    };
  }
  if (facingBet && callAction) {
    if (adjustedStrength + profile.curiosity >= pressure + profile.callThreshold) {
      return { actionType: "CALL", reason: `${input.botLevel} calls with sufficient equity` };
    }
    if (allInAction && adjustedStrength > 0.86 && input.chips <= input.pot) {
      return { actionType: "ALL_IN", reason: `${input.botLevel} short-stack all-in` };
    }
    return foldAction
      ? { actionType: "FOLD", reason: `${input.botLevel} folds weak hand facing pressure` }
      : fallback(input.legalActions);
  }
  if (checkAction) {
    return { actionType: "CHECK", reason: `${input.botLevel} checks` };
  }
  if (callAction) {
    return { actionType: "CALL", reason: `${input.botLevel} fallback call` };
  }
  return fallback(input.legalActions);
}

function profileFor(level: BotLevelName) {
  return {
    BEGINNER: {
      raiseStrong: 0.78,
      betStrong: 0.6,
      callThreshold: 0.25,
      curiosity: 0.16,
      raiseFrequency: 0.5,
      betFrequency: 0.45,
      bluffFrequency: 0.03,
      positionBonus: 0.02,
      multiwayPenalty: 0.02
    },
    NORMAL: {
      raiseStrong: 0.68,
      betStrong: 0.52,
      callThreshold: 0.2,
      curiosity: 0.06,
      raiseFrequency: 0.72,
      betFrequency: 0.62,
      bluffFrequency: 0.07,
      positionBonus: 0.06,
      multiwayPenalty: 0.035
    },
    ADVANCED: {
      raiseStrong: 0.6,
      betStrong: 0.46,
      callThreshold: 0.16,
      curiosity: 0.02,
      raiseFrequency: 0.82,
      betFrequency: 0.7,
      bluffFrequency: 0.1,
      positionBonus: 0.09,
      multiwayPenalty: 0.045
    }
  }[level];
}

function findAction(actions: LegalAction[], actionType: LegalAction["actionType"]) {
  return actions.find((action) => action.actionType === actionType);
}

function chooseBetAmount(action: LegalAction, input: BotDecisionInput, strength: number) {
  const min = action.minAmount || 1;
  const max = action.maxAmount || input.chips;
  const target = Math.round(Math.max(input.minRaise, input.pot * (strength > 0.7 ? 0.65 : 0.45)));
  return Math.max(min, Math.min(max, target));
}

function chooseRaiseAmount(action: LegalAction, input: BotDecisionInput, strength: number) {
  const min = action.minAmount || input.currentBet + input.minRaise;
  const max = action.maxAmount || input.investedThisStreet + input.chips;
  const target = Math.round(input.currentBet + Math.max(input.minRaise, input.pot * (strength > 0.8 ? 0.8 : 0.55)));
  return Math.max(min, Math.min(max, target));
}

function fallback(actions: LegalAction[]): BotDecision {
  if (findAction(actions, "CHECK")) return { actionType: "CHECK", reason: "fallback check" };
  if (findAction(actions, "FOLD")) return { actionType: "FOLD", reason: "fallback fold" };
  if (findAction(actions, "CALL")) return { actionType: "CALL", reason: "fallback call" };
  if (findAction(actions, "ALL_IN")) return { actionType: "ALL_IN", reason: "fallback all-in" };
  return { actionType: "FOLD", reason: "no legal action" };
}
