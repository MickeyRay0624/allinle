import { Module } from "@nestjs/common";
import { PracticeGameController } from "./practice-game.controller";
import { PracticeGameService } from "./practice-game.service";

@Module({
  controllers: [PracticeGameController],
  providers: [PracticeGameService],
  exports: [PracticeGameService]
})
export class PracticeGameModule {}
