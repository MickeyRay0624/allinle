import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { StatsService } from "./stats.service";

@ApiTags("Stats")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get("overview")
  overview(@CurrentUser() user: RequestUser) {
    return this.statsService.overview(user.id);
  }

  @Get("ledger")
  ledger(@CurrentUser() user: RequestUser) {
    return this.statsService.ledger(user.id);
  }

  @Get("practice")
  practice(@CurrentUser() user: RequestUser) {
    return this.statsService.practice(user.id);
  }

  @Get("practice/overview")
  practiceOverview(@CurrentUser() user: RequestUser) {
    return this.statsService.practiceOverview(user.id);
  }

  @Get("practice/recent")
  practiceRecent(@CurrentUser() user: RequestUser) {
    return this.statsService.practiceRecent(user.id);
  }

  @Get("practice/trend")
  practiceTrend(@CurrentUser() user: RequestUser) {
    return this.statsService.practiceTrend(user.id);
  }

  @Get("practice/advice")
  practiceAdvice(@CurrentUser() user: RequestUser) {
    return this.statsService.practiceAdvice(user.id);
  }
}
