import { GamePlayerStatus, PotAllocation, SidePot } from "./poker-types";

export interface PotPlayer {
  seatNo: number;
  investedThisHand: number;
  status: GamePlayerStatus;
}

export function buildSidePots(players: PotPlayer[]): SidePot[] {
  const levels = [...new Set(players.map((player) => player.investedThisHand).filter((amount) => amount > 0))]
    .sort((a, b) => a - b);
  let previous = 0;
  const pots: SidePot[] = [];

  for (const level of levels) {
    const contributors = players.filter((player) => player.investedThisHand >= level);
    const amount = (level - previous) * contributors.length;
    const eligibleSeatNos = contributors
      .filter((player) => player.status !== "FOLDED" && player.status !== "OUT" && player.status !== "SITTING_OUT")
      .map((player) => player.seatNo)
      .sort((a, b) => a - b);

    if (amount > 0 && eligibleSeatNos.length > 0) {
      pots.push({ amount, eligibleSeatNos });
    }
    previous = level;
  }

  return pots;
}

export function allocateSidePots(
  pots: SidePot[],
  rankValueBySeatNo: Record<number, number>
): PotAllocation[] {
  return pots.map((pot) => {
    const bestRank = Math.max(...pot.eligibleSeatNos.map((seatNo) => rankValueBySeatNo[seatNo] ?? -1));
    const winnerSeatNos = pot.eligibleSeatNos
      .filter((seatNo) => rankValueBySeatNo[seatNo] === bestRank)
      .sort((a, b) => a - b);
    const share = Math.floor(pot.amount / winnerSeatNos.length);
    const remainder = pot.amount % winnerSeatNos.length;
    const payouts: Record<number, number> = {};

    winnerSeatNos.forEach((seatNo, index) => {
      // Remainders are assigned by seat order for deterministic MVP settlement.
      payouts[seatNo] = share + (index < remainder ? 1 : 0);
    });

    return {
      pot,
      winnerSeatNos,
      payouts
    };
  });
}
