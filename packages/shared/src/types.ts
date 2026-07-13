import {
  BotLevel,
  LedgerConfirmStatus,
  LedgerGameStatus,
  LedgerGameType,
  PracticeRoomMode,
  PracticeRoomStatus,
  UserStatus
} from "./enums";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthTokenPayload {
  sub: string;
  scope: "user" | "admin";
  openid?: string;
  username?: string;
}

export interface CurrentUser {
  id: string;
  openid: string;
  nickname: string | null;
  status: UserStatus;
}

export interface LedgerPlayerSnapshot {
  id: string;
  displayName: string;
  totalBuyIn: string;
  totalCashOut: string;
  profit: string;
  confirmStatus: LedgerConfirmStatus;
}

export interface LedgerGameSnapshot {
  id: string;
  type: LedgerGameType;
  title: string;
  blindLevel: string | null;
  status: LedgerGameStatus;
  totalBuyIn: string;
  totalCashOut: string;
  totalProfit: string;
  players: LedgerPlayerSnapshot[];
}

export interface PracticeRoomPlayerSnapshot {
  id: string;
  seatNo: number;
  userId: string | null;
  nickname?: string | null;
  chips: number;
  readyStatus: boolean;
  initialChipsConfirmed: boolean;
  isBot: boolean;
  botLevel?: BotLevel | null;
}

export interface PracticeRoomSnapshot {
  id: string;
  roomCode: string;
  ownerUserId: string;
  mode: PracticeRoomMode;
  playerCount: number;
  smallBlind: number;
  bigBlind: number;
  initialPracticeChips: number;
  status: PracticeRoomStatus;
  complianceConfirmedRequired: boolean;
  players: PracticeRoomPlayerSnapshot[];
}
