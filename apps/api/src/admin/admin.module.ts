import { Module } from "@nestjs/common";
import { PracticeRoomModule } from "../practice-room/practice-room.module";
import { RiskModule } from "../risk/risk.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [PracticeRoomModule, RiskModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
