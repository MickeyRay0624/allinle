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

  it("does not enter confirmation while a disputed participant has not resubmitted", async () => {
    const update = vi.fn();
    const service = new TeamLedgerService({
      teamLedgerHand: {
        findUnique: vi.fn().mockResolvedValue({
          status: "OPEN",
          entries: [
            { participantId: "a", amount: new Prisma.Decimal(300), status: TeamLedgerEntryStatus.SUBMITTED },
            { participantId: "b", amount: new Prisma.Decimal(-300), status: TeamLedgerEntryStatus.DISPUTED }
          ]
        }),
        update
      },
      teamLedgerParticipant: {
        findMany: vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }])
      }
    } as any);

    await (service as any).autoPromote("hand-1", "room-1");

    expect(update).not.toHaveBeenCalled();
  });
});
