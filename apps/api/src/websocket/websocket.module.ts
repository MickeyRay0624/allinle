import { Module } from "@nestjs/common";
import { PracticeGameModule } from "../practice-game/practice-game.module";
import { PracticeRoomModule } from "../practice-room/practice-room.module";
import { PracticeRoomGateway } from "./practice-room.gateway";

@Module({
  imports: [PracticeRoomModule, PracticeGameModule],
  providers: [PracticeRoomGateway],
  exports: [PracticeRoomGateway]
})
export class AppWebSocketModule {}
