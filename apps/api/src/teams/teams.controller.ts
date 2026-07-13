import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { AddTeamMemberDto } from "./dto/add-team-member.dto";
import { CreateTeamDto } from "./dto/create-team.dto";
import { TeamsService } from "./teams.service";

@ApiTags("Teams")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  createTeam(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(user.id, dto);
  }

  @Get()
  listMyTeams(@CurrentUser() user: RequestUser) {
    return this.teamsService.listMyTeams(user.id);
  }

  @Get(":id")
  getTeam(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.teamsService.getTeam(user.id, id);
  }

  @Post(":id/members")
  addMember(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: AddTeamMemberDto
  ) {
    return this.teamsService.addMember(user.id, id, dto);
  }
}
