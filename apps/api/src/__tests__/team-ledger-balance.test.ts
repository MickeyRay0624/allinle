import { Prisma, TeamLedgerEntryStatus, TeamLedgerParticipantStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { TeamLedgerService } from "../team-ledger/team-ledger.service";

describe("TeamLedgerService balance", () => {
  it("does not count pending or disputed entries from a previous confirmation round", async () => {
    const service = new TeamLedgerService({} as any);
    vi.spyOn(service as any, "roomHand").mockResolvedValue({
      room: {
        participants: [
          { id: "a", status: TeamLedgerParticipantStatus.ACTIVE },
          { id: "b", status: TeamLedgerParticipantStatus.ACTIVE }
        ]
      },
      hand: {
        status: "DISPUTED",
        entries: [
          { participantId: "a", amount: new Prisma.Decimal(400), status: TeamLedgerEntryStatus.PENDING },
          { participantId: "b", amount: new Prisma.Decimal(-400), status: TeamLedgerEntryStatus.DISPUTED }
        ]
      }
    });

    await expect(service.getHandBalance("ROOM01", 2)).resolves.toMatchObject({
      total: 0,
      submittedCount: 0,
      totalCount: 2,
      allSubmitted: false
    });
  });
});
