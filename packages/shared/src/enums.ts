export enum UserStatus {
  NORMAL = "NORMAL",
  LIMITED = "LIMITED",
  BANNED = "BANNED"
}

export enum TeamRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER"
}

export enum MemberStatus {
  ACTIVE = "ACTIVE",
  REMOVED = "REMOVED"
}

export enum LedgerGameType {
  PERSONAL = "PERSONAL",
  TEAM = "TEAM"
}

export enum LedgerGameStatus {
  DRAFT = "DRAFT",
  ONGOING = "ONGOING",
  FINISHED = "FINISHED",
  CONFIRMED = "CONFIRMED",
  DISPUTED = "DISPUTED"
}

export enum LedgerConfirmStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  DISPUTED = "DISPUTED"
}

export enum LedgerTransactionType {
  BUY_IN = "BUY_IN",
  REBUY = "REBUY",
  CASH_OUT = "CASH_OUT",
  ADJUSTMENT = "ADJUSTMENT"
}

export enum PracticeRoomMode {
  FRIENDS = "FRIENDS",
  SOLO = "SOLO"
}

export enum PracticeRoomStatus {
  WAITING = "WAITING",
  READY = "READY",
  PLAYING = "PLAYING",
  FINISHED = "FINISHED",
  CLOSED = "CLOSED"
}

export enum BotLevel {
  BEGINNER = "BEGINNER",
  NORMAL = "NORMAL",
  ADVANCED = "ADVANCED"
}

export enum PracticeActionType {
  FOLD = "FOLD",
  CHECK = "CHECK",
  CALL = "CALL",
  BET = "BET",
  RAISE = "RAISE",
  ALL_IN = "ALL_IN",
  SMALL_BLIND = "SMALL_BLIND",
  BIG_BLIND = "BIG_BLIND",
  DEAL = "DEAL",
  SHOWDOWN = "SHOWDOWN",
  WIN = "WIN"
}

export enum PracticeStreet {
  PREFLOP = "PREFLOP",
  FLOP = "FLOP",
  TURN = "TURN",
  RIVER = "RIVER",
  SHOWDOWN = "SHOWDOWN"
}

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH"
}

export enum AdminRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR"
}

export enum AdminStatus {
  NORMAL = "NORMAL",
  DISABLED = "DISABLED"
}
