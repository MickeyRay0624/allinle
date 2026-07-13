import { HandRankCategory } from "./hand-rank";
import type { LegalAction } from "./actions";

export type PokerStreet = "PREFLOP" | "FLOP" | "TURN" | "RIVER" | "SHOWDOWN";
export type GameStatus = "PLAYING" | "HAND_FINISHED" | "ROOM_FINISHED";
export type GamePlayerStatus = "ACTIVE" | "FOLDED" | "ALL_IN" | "OUT" | "SITTING_OUT";

export type PokerActionType =
  | "FOLD"
  | "CHECK"
  | "CALL"
  | "BET"
  | "RAISE"
  | "ALL_IN"
  | "SMALL_BLIND"
  | "BIG_BLIND"
  | "DEAL"
  | "SHOWDOWN"
  | "WIN";

export interface EvaluatedHand {
  rankCategory: HandRankCategory;
  rankValue: number;
  tiebreakers: number[];
  bestFiveCards: string[];
  description: string;
}

export interface Winner {
  seatNo: number;
  userId?: string | null;
  amountWon?: number;
  hand: EvaluatedHand;
}

export interface GameAction {
  seatNo: number;
  userId?: string | null;
  actionType: PokerActionType;
  amount: number;
  street: PokerStreet;
  createdAt: string;
}

export interface GamePlayerState {
  userId?: string | null;
  seatNo: number;
  nickname: string;
  isBot: boolean;
  botLevel?: string | null;
  holeCards: string[];
  chips: number;
  startHandChips: number;
  investedThisHand: number;
  investedThisStreet: number;
  status: GamePlayerStatus;
  hasActedThisStreet: boolean;
}

export interface SidePot {
  amount: number;
  eligibleSeatNos: number[];
}

export interface PotAllocation {
  pot: SidePot;
  winnerSeatNos: number[];
  payouts: Record<number, number>;
}

export interface WinnerInfo {
  reason: "ALL_OTHERS_FOLDED" | "SHOWDOWN";
  boardCards: string[];
  totalPot: number;
  pots: Array<{
    amount: number;
    eligibleSeatNos: number[];
    winners: Array<{
      seatNo: number;
      userId?: string | null;
      amountWon: number;
      rankCategory?: HandRankCategory;
      bestFiveCards?: string[];
      description?: string;
    }>;
  }>;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  handId: string;
  handNo: number;
  status: GameStatus;
  street: PokerStreet;
  deck: string[];
  boardCards: string[];
  pot: number;
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  smallBlind: number;
  bigBlind: number;
  currentTurnSeat: number | null;
  lastAggressorSeat: number | null;
  players: GamePlayerState[];
  actionHistory: GameAction[];
  winnerInfo?: WinnerInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PublicGamePlayerState extends Omit<GamePlayerState, "holeCards"> {
  holeCards: string[];
}

export interface PublicGameState extends Omit<GameState, "deck" | "players"> {
  players: PublicGamePlayerState[];
}

export interface PrivateHandState {
  roomCode: string;
  handId: string;
  handNo: number;
  seatNo: number;
  userId?: string | null;
  holeCards: string[];
  status: GamePlayerStatus;
  chips: number;
  investedThisHand: number;
  investedThisStreet: number;
  legalActions?: LegalAction[];
}
