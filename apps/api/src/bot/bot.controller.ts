import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { BotService } from "./bot.service";

@ApiTags("Bot")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("bot")
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Get("difficulties")
  difficulties() {
    return this.botService.listDifficultyProfiles();
  }
}
