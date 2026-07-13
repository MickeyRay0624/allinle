import { dealCards, shuffleDeck, createDeck } from "./deck";
import { evaluateSevenCards } from "./evaluator";
import { getLegalActions } from "./actions";
import {
  GameAction,
  GamePlayerState,
  GameState,
  PokerActionType,
  PrivateHandState,
  PublicGameState,
  WinnerInfo
} from "./poker-types";
import { allocateSidePots, buildSidePots } from "./pot";

export interface CreateGamePlayerInput {
  userId?: string | null;
  seatNo: number;
  nickname?: string | null;
  isBot?: boolean;
  botLevel?: string | null;
  chips: number;
}

export interface CreateInitialGameStateInput {
  roomId: string;
  roomCode: string;
  handId: string;
  handNo: number;
  smallBlind: number;
  bigBlind: number;
  players: CreateGamePlayerInput[];
  dealerSeat?: number;
  deck?: string[];
  now?: string;
}

export interface ApplyGameActionInput {
  seatNo: number;
  userId?: string | null;
  actionType: Extract<PokerActionType, "FOLD" | "CHECK" | "CALL" | "BET" | "RAISE" | "ALL_IN">;
  amount?: number;
  now?: string;
}

export interface ApplyGameActionResult {
  state: GameState;
  appliedAction: GameAction;
  events: Array<"action_applied" | "street_changed" | "hand_finished">;
}

export function createInitialGameState(input: CreateInitialGameStateInput): GameState {
  const now = input.now || new Date().toISOString();
  const activeInputs = input.players
    .filter((player) => player.chips > 0)
    .sort((a, b) => a.seatNo - b.seatNo);

  if (activeInputs.length < 2) {
    throw new Error("At least two players with practice chips are required");
  }

  const dealerSeat = normalizeDealerSeat(
    input.dealerSeat ?? activeInputs[0].seatNo,
    activeInputs.map((player) => player.seatNo)
  );
  const { smallBlindSeat, bigBlindSeat } = resolveBlindSeats(
    activeInputs.map((player) => player.seatNo),
    dealerSeat
  );

  let deck = input.deck ? input.deck.slice() : shuffleDeck(createDeck());
  const players: GamePlayerState[] = input.players
    .slice()
    .sort((a, b) => a.seatNo - b.seatNo)
    .map((player) => ({
      userId: player.userId,
      seatNo: player.seatNo,
      nickname: player.nickname || (player.isBot ? "机器人" : "成员"),
      isBot: Boolean(player.isBot),
      botLevel: player.botLevel,
      holeCards: [],
      chips: player.chips,
      startHandChips: player.chips,
      investedThisHand: 0,
      investedThisStreet: 0,
      status: player.chips > 0 ? "ACTIVE" : "OUT",
      hasActedThisStreet: false
    }));

  for (let round = 0; round < 2; round += 1) {
    for (const player of players.filter((candidate) => candidate.status !== "OUT")) {
      const dealt = dealCards(deck, 1);
      player.holeCards.push(dealt.cards[0]);
      deck = dealt.deck;
    }
  }

  const state: GameState = {
    roomId: input.roomId,
    roomCode: input.roomCode,
    handId: input.handId,
    handNo: input.handNo,
    status: "PLAYING",
    street: "PREFLOP",
    deck,
    boardCards: [],
    pot: 0,
    currentBet: 0,
    minRaise: input.bigBlind,
    dealerSeat,
    smallBlindSeat,
    bigBlindSeat,
    smallBlind: input.smallBlind,
    bigBlind: input.bigBlind,
    currentTurnSeat: null,
    lastAggressorSeat: bigBlindSeat,
    players,
    actionHistory: [],
    createdAt: now,
    updatedAt: now
  };

  postBlind(state, smallBlindSeat, input.smallBlind, "SMALL_BLIND", now);
  postBlind(state, bigBlindSeat, input.bigBlind, "BIG_BLIND", now);
  state.currentBet = Math.max(...state.players.map((player) => player.investedThisStreet));
  state.pot = totalInvested(state.players);
  state.currentTurnSeat =
    activeInputs.length === 2
      ? firstActionableSeatAfter(state, bigBlindSeat)
      : firstActionableSeatAfter(state, bigBlindSeat);

  return normalizeAfterAction(state, state.bigBlindSeat, []);
}

export function applyGameAction(stateInput: GameState, input: ApplyGameActionInput): ApplyGameActionResult {
  const state = cloneState(stateInput);
  const now = input.now || new Date().toISOString();
  const player = findPlayer(state, input.seatNo);

  if (state.status !== "PLAYING") {
    throw new Error("Current hand is not playable");
  }
  if (state.currentTurnSeat !== input.seatNo) {
    throw new Error("It is not this player's turn");
  }
  if (player.userId && input.userId && player.userId !== input.userId) {
    throw new Error("Player identity does not match the seat");
  }
  if (player.status !== "ACTIVE" || player.chips <= 0) {
    throw new Error("This player cannot act now");
  }

  const appliedAction = applyActionMutation(state, player, input, now);
  state.actionHistory.push(appliedAction);
  state.updatedAt = now;
  const events: ApplyGameActionResult["events"] = ["action_applied"];
  const nextState = normalizeAfterAction(state, input.seatNo, events);
  return { state: nextState, appliedAction, events };
}

export function resolveBlindSeats(activeSeatNos: number[], dealerSeat: number) {
  const seats = activeSeatNos.slice().sort((a, b) => a - b);
  if (seats.length < 2) {
    throw new Error("At least two active seats are required");
  }
  const dealer = normalizeDealerSeat(dealerSeat, seats);
  if (seats.length === 2) {
    return {
      dealerSeat: dealer,
      smallBlindSeat: dealer,
      bigBlindSeat: nextSeat(seats, dealer)
    };
  }
  const smallBlindSeat = nextSeat(seats, dealer);
  return {
    dealerSeat: dealer,
    smallBlindSeat,
    bigBlindSeat: nextSeat(seats, smallBlindSeat)
  };
}

export function nextDealerSeat(players: Array<{ seatNo: number; chips: number }>, currentDealerSeat: number) {
  const activeSeatNos = players
    .filter((player) => player.chips > 0)
    .map((player) => player.seatNo)
    .sort((a, b) => a - b);
  if (activeSeatNos.length < 2) return null;
  return nextSeat(activeSeatNos, normalizeDealerSeat(currentDealerSeat, activeSeatNos));
}

export function toPublicGameState(state: GameState): PublicGameState {
  const { deck: _deck, players, ...publicState } = state;
  return {
    ...publicState,
    players: players.map((player) => ({
      ...player,
      holeCards: []
    }))
  };
}

export function toPrivateHandState(state: GameState, userId: string): PrivateHandState | null {
  const player = state.players.find((candidate) => candidate.userId === userId);
  if (!player) return null;
  return {
    roomCode: state.roomCode,
    handId: state.handId,
    handNo: state.handNo,
    seatNo: player.seatNo,
    userId: player.userId,
    holeCards: player.holeCards,
    status: player.status,
    chips: player.chips,
    investedThisHand: player.investedThisHand,
    investedThisStreet: player.investedThisStreet,
    legalActions: getLegalActions(state, player.seatNo)
  };
}

export function getAllPrivateHandStates(state: GameState): PrivateHandState[] {
  return state.players
    .filter((player) => player.userId)
    .map((player) => ({
      roomCode: state.roomCode,
      handId: state.handId,
      handNo: state.handNo,
      seatNo: player.seatNo,
      userId: player.userId,
      holeCards: player.holeCards,
      status: player.status,
      chips: player.chips,
      investedThisHand: player.investedThisHand,
      investedThisStreet: player.investedThisStreet,
      legalActions: getLegalActions(state, player.seatNo)
    }));
}

function applyActionMutation(
  state: GameState,
  player: GamePlayerState,
  input: ApplyGameActionInput,
  now: string
): GameAction {
  switch (input.actionType) {
    case "FOLD":
      player.status = "FOLDED";
      player.hasActedThisStreet = true;
      return action(player, "FOLD", 0, state.street, now);

    case "CHECK":
      if (player.investedThisStreet !== state.currentBet) {
        throw new Error("Cannot check while facing a bet");
      }
      player.hasActedThisStreet = true;
      return action(player, "CHECK", 0, state.street, now);

    case "CALL": {
      if (state.currentBet <= player.investedThisStreet) {
        throw new Error("There is no bet to call");
      }
      const callAmount = Math.min(player.chips, state.currentBet - player.investedThisStreet);
      investChips(player, callAmount);
      player.hasActedThisStreet = true;
      state.pot = totalInvested(state.players);
      return action(player, "CALL", callAmount, state.street, now);
    }

    case "BET": {
      const betAmount = normalizePositiveAmount(input.amount);
      if (state.currentBet !== 0) {
        throw new Error("Cannot bet after a bet already exists");
      }
      if (betAmount > player.chips) {
        throw new Error("Bet exceeds available practice chips");
      }
      investChips(player, betAmount);
      state.currentBet = player.investedThisStreet;
      state.minRaise = betAmount;
      markFullAggression(state, player.seatNo);
      state.pot = totalInvested(state.players);
      return action(player, "BET", betAmount, state.street, now);
    }

    case "RAISE": {
      if (state.currentBet <= 0) {
        throw new Error("Cannot raise before a bet exists");
      }
      const raiseTo = normalizePositiveAmount(input.amount);
      const maxRaiseTo = player.investedThisStreet + player.chips;
      if (raiseTo <= state.currentBet) {
        throw new Error("Raise amount must be greater than current bet");
      }
      if (raiseTo > maxRaiseTo) {
        throw new Error("Raise exceeds available practice chips");
      }
      const raiseSize = raiseTo - state.currentBet;
      const additional = raiseTo - player.investedThisStreet;
      const allInRaise = additional === player.chips;
      if (raiseSize < state.minRaise && !allInRaise) {
        throw new Error("Raise is below the minimum raise");
      }
      investChips(player, additional);
      state.currentBet = raiseTo;
      if (raiseSize >= state.minRaise) {
        state.minRaise = raiseSize;
        markFullAggression(state, player.seatNo);
      } else {
        player.hasActedThisStreet = true;
      }
      state.pot = totalInvested(state.players);
      return action(player, "RAISE", additional, state.street, now);
    }

    case "ALL_IN": {
      const amount = player.chips;
      if (amount <= 0) {
        throw new Error("No practice chips available for all-in");
      }
      const totalAfterAllIn = player.investedThisStreet + amount;
      investChips(player, amount);
      if (totalAfterAllIn > state.currentBet) {
        const raiseSize = totalAfterAllIn - state.currentBet;
        state.currentBet = totalAfterAllIn;
        if (state.currentBet === totalAfterAllIn && (state.currentBet === amount || raiseSize >= state.minRaise)) {
          state.minRaise = Math.max(state.minRaise, raiseSize);
          markFullAggression(state, player.seatNo);
        } else {
          player.hasActedThisStreet = true;
        }
      } else {
        player.hasActedThisStreet = true;
      }
      state.pot = totalInvested(state.players);
      return action(player, "ALL_IN", amount, state.street, now);
    }

    default:
      throw new Error("Unsupported action");
  }
}

function normalizeAfterAction(
  state: GameState,
  fromSeatNo: number,
  events: ApplyGameActionResult["events"]
): GameState {
  state.pot = totalInvested(state.players);

  const contenders = state.players.filter((player) => isContender(player));
  if (contenders.length === 1) {
    finishByFold(state, contenders[0]);
    pushOnce(events, "hand_finished");
    return state;
  }

  if (contenders.length > 1 && contenders.every((player) => player.status === "ALL_IN" || player.chips === 0)) {
    dealBoardToFive(state);
    finishByShowdown(state);
    pushOnce(events, "street_changed");
    pushOnce(events, "hand_finished");
    return state;
  }

  if (isBettingRoundComplete(state)) {
    if (state.street === "RIVER") {
      finishByShowdown(state);
      pushOnce(events, "hand_finished");
      return state;
    }
    advanceStreet(state);
    pushOnce(events, "street_changed");
    return state.currentTurnSeat === null ? normalizeAfterAction(state, fromSeatNo, events) : state;
  }

  state.currentTurnSeat = firstActionableSeatAfter(state, fromSeatNo);
  return state;
}

function finishByFold(state: GameState, winner: GamePlayerState) {
  winner.chips += state.pot;
  state.status = "HAND_FINISHED";
  state.street = "SHOWDOWN";
  state.currentBet = 0;
  state.currentTurnSeat = null;
  state.winnerInfo = {
    reason: "ALL_OTHERS_FOLDED",
    boardCards: state.boardCards,
    totalPot: state.pot,
    pots: [
      {
        amount: state.pot,
        eligibleSeatNos: [winner.seatNo],
        winners: [
          {
            seatNo: winner.seatNo,
            userId: winner.userId,
            amountWon: state.pot
          }
        ]
      }
    ]
  };
}

function finishByShowdown(state: GameState) {
  dealBoardToFive(state);
  const contenders = state.players.filter((player) => isContender(player));
  const evaluatedBySeatNo = new Map(
    contenders.map((player) => [player.seatNo, evaluateSevenCards([...player.holeCards, ...state.boardCards])])
  );
  const sidePots = buildSidePots(state.players);
  const rankValueBySeatNo = Object.fromEntries(
    [...evaluatedBySeatNo.entries()].map(([seatNo, hand]) => [seatNo, hand.rankValue])
  );
  const allocations = allocateSidePots(sidePots, rankValueBySeatNo);

  for (const allocation of allocations) {
    Object.entries(allocation.payouts).forEach(([seatNo, amount]) => {
      findPlayer(state, Number(seatNo)).chips += amount;
    });
  }

  state.status = "HAND_FINISHED";
  state.street = "SHOWDOWN";
  state.currentBet = 0;
  state.currentTurnSeat = null;
  state.winnerInfo = {
    reason: "SHOWDOWN",
    boardCards: state.boardCards,
    totalPot: state.pot,
    pots: allocations.map((allocation) => ({
      amount: allocation.pot.amount,
      eligibleSeatNos: allocation.pot.eligibleSeatNos,
      winners: allocation.winnerSeatNos.map((seatNo) => {
        const winner = findPlayer(state, seatNo);
        const hand = evaluatedBySeatNo.get(seatNo);
        return {
          seatNo,
          userId: winner.userId,
          amountWon: allocation.payouts[seatNo],
          rankCategory: hand?.rankCategory,
          bestFiveCards: hand?.bestFiveCards,
          description: hand?.description
        };
      })
    }))
  } satisfies WinnerInfo;
}

function advanceStreet(state: GameState) {
  const counts = { PREFLOP: 3, FLOP: 1, TURN: 1, RIVER: 0, SHOWDOWN: 0 } as const;
  const nextStreet = {
    PREFLOP: "FLOP",
    FLOP: "TURN",
    TURN: "RIVER",
    RIVER: "SHOWDOWN",
    SHOWDOWN: "SHOWDOWN"
  } as const;
  const dealt = dealCards(state.deck, counts[state.street]);
  state.deck = dealt.deck;
  state.boardCards = [...state.boardCards, ...dealt.cards];
  state.street = nextStreet[state.street];
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.lastAggressorSeat = null;
  state.players.forEach((player) => {
    player.investedThisStreet = 0;
    player.hasActedThisStreet = false;
  });
  state.currentTurnSeat = firstActionableSeatAfter(state, state.dealerSeat);
}

function dealBoardToFive(state: GameState) {
  while (state.boardCards.length < 5) {
    const dealt = dealCards(state.deck, 1);
    state.deck = dealt.deck;
    state.boardCards.push(dealt.cards[0]);
  }
}

function postBlind(
  state: GameState,
  seatNo: number,
  blindAmount: number,
  actionType: "SMALL_BLIND" | "BIG_BLIND",
  now: string
) {
  const player = findPlayer(state, seatNo);
  const postedAmount = Math.min(player.chips, blindAmount);
  investChips(player, postedAmount);
  state.actionHistory.push(action(player, actionType, postedAmount, "PREFLOP", now));
}

function investChips(player: GamePlayerState, amount: number) {
  if (amount < 0 || amount > player.chips) {
    throw new Error("Invalid practice chip amount");
  }
  player.chips -= amount;
  player.investedThisStreet += amount;
  player.investedThisHand += amount;
  if (player.chips === 0 && player.status === "ACTIVE") {
    player.status = "ALL_IN";
  }
}

function markFullAggression(state: GameState, actorSeatNo: number) {
  state.players.forEach((player) => {
    if (player.status === "ACTIVE" && player.chips > 0) {
      player.hasActedThisStreet = false;
    }
  });
  findPlayer(state, actorSeatNo).hasActedThisStreet = true;
  state.lastAggressorSeat = actorSeatNo;
}

function isBettingRoundComplete(state: GameState) {
  const actionable = state.players.filter((player) => player.status === "ACTIVE" && player.chips > 0);
  if (actionable.length === 0) return true;
  return actionable.every(
    (player) => player.hasActedThisStreet && player.investedThisStreet === state.currentBet
  );
}

function firstActionableSeatAfter(state: GameState, seatNo: number): number | null {
  const seats = state.players.map((player) => player.seatNo).sort((a, b) => a - b);
  if (seats.length === 0) return null;

  let cursor = seatNo;
  for (let index = 0; index < seats.length; index += 1) {
    cursor = nextSeat(seats, cursor);
    const player = findPlayer(state, cursor);
    if (
      player.status === "ACTIVE" &&
      player.chips > 0 &&
      (!player.hasActedThisStreet || player.investedThisStreet < state.currentBet)
    ) {
      return player.seatNo;
    }
  }
  return null;
}

function isContender(player: GamePlayerState) {
  return player.status !== "FOLDED" && player.status !== "OUT" && player.status !== "SITTING_OUT";
}

function totalInvested(players: GamePlayerState[]) {
  return players.reduce((sum, player) => sum + player.investedThisHand, 0);
}

function action(
  player: GamePlayerState,
  actionType: PokerActionType,
  amount: number,
  street: GameAction["street"],
  now: string
): GameAction {
  return {
    seatNo: player.seatNo,
    userId: player.userId,
    actionType,
    amount,
    street,
    createdAt: now
  };
}

function normalizePositiveAmount(amount?: number) {
  if (!Number.isInteger(amount) || Number(amount) <= 0) {
    throw new Error("Amount must be a positive integer");
  }
  return Number(amount);
}

function findPlayer(state: GameState, seatNo: number) {
  const player = state.players.find((candidate) => candidate.seatNo === seatNo);
  if (!player) throw new Error(`Seat ${seatNo} is not in this hand`);
  return player;
}

function normalizeDealerSeat(dealerSeat: number, activeSeatNos: number[]) {
  return activeSeatNos.includes(dealerSeat)
    ? dealerSeat
    : activeSeatNos.find((seatNo) => seatNo > dealerSeat) ?? activeSeatNos[0];
}

function nextSeat(seats: number[], currentSeat: number) {
  const sorted = seats.slice().sort((a, b) => a - b);
  const index = sorted.findIndex((seatNo) => seatNo === currentSeat);
  if (index < 0) return sorted.find((seatNo) => seatNo > currentSeat) ?? sorted[0];
  return sorted[(index + 1) % sorted.length];
}

function pushOnce<T>(array: T[], value: T) {
  if (!array.includes(value)) array.push(value);
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
