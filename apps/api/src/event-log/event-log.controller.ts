import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { TrackEventDto } from "./dto/track-event.dto";
import { EventLogService } from "./event-log.service";

@ApiTags("Events")
@Controller("events")
export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  @Post("track")
  track(
    @Body() dto: TrackEventDto,
    @Req() req: { headers: Record<string, string>; ip: string; user?: RequestUser },
  ) {
    return this.eventLogService.track({
      eventName: dto.eventName,
      eventGroup: dto.eventGroup,
      metadata: dto.metadata,
      userId: req.user?.id,
      ip: (req.headers["x-forwarded-for"] as string) || req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get()
  listEvents(
    @Query("eventName") eventName?: string,
    @Query("eventGroup") eventGroup?: string,
    @Query("userId") userId?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.eventLogService.listEvents({
      eventName,
      eventGroup,
      userId,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }
}
