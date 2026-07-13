import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser, RequestUser } from "../common/decorators/current-user.decorator";
import { JwtUserGuard } from "../common/guards/jwt-user.guard";
import { CreateTeamLedgerRoomDto } from "./dto/create-team-ledger-room.dto";
import { JoinTeamLedgerRoomDto } from "./dto/join-team-ledger-room.dto";
import { SubmitEntryDto } from "./dto/submit-entry.dto";
import { TeamLedgerService } from "./team-ledger.service";

@ApiTags("Team Ledger")
@ApiBearerAuth()
@UseGuards(JwtUserGuard)
@Controller("team-ledger")
export class TeamLedgerController {
  constructor(private readonly service: TeamLedgerService) {}
  @Post("rooms") createRoom(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamLedgerRoomDto) { return this.service.createRoom(user.id, dto); }
  @Get("rooms/:roomCode") async getRoom(@Param("roomCode") roomCode: string) { await this.service.touchRoom(roomCode); return this.service.getRoom(roomCode); }
  @Post("rooms/:roomCode/join") joinRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Body() dto: JoinTeamLedgerRoomDto) { return this.service.joinRoom(user.id, roomCode, dto); }
  @Post("rooms/:roomCode/add-temp") addTempParticipant(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Body() dto: { displayName: string }) { return this.service.addTempParticipant(user.id, roomCode, dto.displayName); }
  @Post("rooms/:roomCode/start") startRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) { return this.service.startRoom(user.id, roomCode); }
  @Post("rooms/:roomCode/next-hand") createNextHand(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) { return this.service.createNextHand(user.id, roomCode); }
  @Post("rooms/:roomCode/hands/:handNo/entry") submitEntry(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("handNo") handNo: number, @Body() dto: SubmitEntryDto) { return this.service.submitEntry(user.id, roomCode, Number(handNo), dto); }
  @Post("rooms/:roomCode/hands/:handNo/entry-temp/:participantId") submitEntryForTemp(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("handNo") handNo: number, @Param("participantId") participantId: string, @Body() dto: SubmitEntryDto) { return this.service.submitEntryForTemp(user.id, roomCode, Number(handNo), participantId, dto); }
  @Get("rooms/:roomCode/hands/:handNo/balance") getHandBalance(@Param("roomCode") roomCode: string, @Param("handNo") handNo: number) { return this.service.getHandBalance(roomCode, Number(handNo)); }
  @Post("rooms/:roomCode/hands/:handNo/request-confirm") requestConfirmHand(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("handNo") handNo: number) { return this.service.requestConfirmHand(user.id, roomCode, Number(handNo)); }
  @Post("rooms/:roomCode/hands/:handNo/confirm") confirmHandEntry(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("handNo") handNo: number) { return this.service.confirmHandEntry(user.id, roomCode, Number(handNo)); }
  @Post("rooms/:roomCode/hands/:handNo/dispute") disputeHandEntry(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("handNo") handNo: number, @Body() dto: { note?: string }) { return this.service.disputeHandEntry(user.id, roomCode, Number(handNo), dto?.note); }
  @Get("rooms/:roomCode/summary") getSummary(@Param("roomCode") roomCode: string) { return this.service.getSummary(roomCode); }
  @Post("rooms/:roomCode/settlement") generateSettlement(@Param("roomCode") roomCode: string) { return this.service.generateSettlement(roomCode); }
  @Post("rooms/:roomCode/end") endRoom(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string) { return this.service.endRoom(user.id, roomCode); }
  @Post("rooms/:roomCode/buy-in") setBuyIn(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Body() dto: { buyInAmount: number }) { return this.service.setBuyIn(user.id, roomCode, dto.buyInAmount); }
  @Post("rooms/:roomCode/buy-in-temp/:participantId") setBuyInForTemp(@CurrentUser() user: RequestUser, @Param("roomCode") roomCode: string, @Param("participantId") participantId: string, @Body() dto: { buyInAmount: number }) { return this.service.setBuyInForTemp(user.id, roomCode, participantId, dto.buyInAmount); }
  @Post("rooms/:roomCode/close") closeRoom(@Param("roomCode") roomCode: string) { return this.service.closeRoom(roomCode); }
}
