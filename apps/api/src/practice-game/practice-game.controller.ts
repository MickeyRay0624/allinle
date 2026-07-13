import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { PracticeGameService } from "./practice-game.service";

@ApiTags("Practice Game")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("practice/game")
export class PracticeGameController {
  constructor(private readonly practiceGameService: PracticeGameService) {}

  @Get("roadmap")
  roadmap() {
    return this.practiceGameService.getRoadmap();
  }
}
