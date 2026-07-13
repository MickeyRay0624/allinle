import { Module } from "@nestjs/common";
import { PracticeGameModule } from "../practice-game/practice-game.module";
import { RiskModule } from "../risk/risk.module";
import { PracticeRoomController } from "./practice-room.controller";
import { PracticeRoomService } from "./practice-room.service";

@Module({
  imports: [RiskModule, PracticeGameModule],
  controllers: [PracticeRoomController],
  providers: [PracticeRoomService],
  exports: [PracticeRoomService]
})
export class PracticeRoomModule {}
