import { Module } from "@nestjs/common";
import { RiskModule } from "../risk/risk.module";
import { TeamsModule } from "../teams/teams.module";
import { LedgerController } from "./ledger.controller";
import { LedgerService } from "./ledger.service";

@Module({
  imports: [TeamsModule, RiskModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService]
})
export class LedgerModule {}
