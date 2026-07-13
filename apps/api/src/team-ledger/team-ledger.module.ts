import { Module } from "@nestjs/common";
import { TeamLedgerController } from "./team-ledger.controller";
import { TeamLedgerService } from "./team-ledger.service";

@Module({
  controllers: [TeamLedgerController],
  providers: [TeamLedgerService],
  exports: [TeamLedgerService]
})
export class TeamLedgerModule {}
